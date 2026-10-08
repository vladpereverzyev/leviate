# SPDX-License-Identifier: GPL-3.0-or-later
# Leviate for Blender. Copyright (C) 2026 Vladyslav Pereverzyev

"""The engine process seen from Blender.

The camera, the phone and the hand tracking run in engine/main.py, started with the
Python of Blender in a process of its own. Blender listens on a socket on 127.0.0.1
and reads it from a timer on the main thread without ever waiting: Blender itself
runs no thread, no camera and no network code.
"""

import json
import os
import secrets
import socket
import struct
import subprocess
import sys
import time

ENGINE = os.path.join(os.path.dirname(__file__), "engine", "main.py")
MODEL = os.path.join(os.path.dirname(__file__), "models", "hand_landmarker.task")
# The first start imports MediaPipe and OpenCV, which takes a few seconds on a slow disk.
CONNECT_TIMEOUT = 60.0


class Engine:
    def __init__(self, wheels, log_path, camera="0", width=640, height=480, mirror=True, smoothing=0.5,
                 phone=None):
        """wheels: folder of the wheels Blender installed for the add-on.
        phone: (id, token) of the pairing link to use the phone as the camera, or None."""
        self.status = "Starting camera…"
        self.error = ""
        self.fps = 0.0
        self.frame_size = (0, 0)
        self.phone = phone is not None
        self.phone_url = ""
        self.qr_rows = []
        self.connected = False
        self.moves = []        # (mode, dx, dy, zoom) since the last take_moves()
        self.preview = None    # (width, height, RGBA bytes), newest frame
        self.hand = None       # 21 (x, y) points in preview space
        self.mode = "none"
        self.serial = 0
        self.running = True
        self._key = secrets.token_hex(16)
        self._buffer = bytearray()
        self._conn = None
        self._pending = {}
        self._started = time.monotonic()

        self._listener = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self._listener.bind(("127.0.0.1", 0))
        self._listener.listen(1)
        self._listener.setblocking(False)
        port = self._listener.getsockname()[1]

        args = [sys.executable, "-s", ENGINE, "--port", str(port), "--key", self._key, "--model", MODEL,
                "--camera", str(camera), "--width", str(width), "--height", str(height),
                "--mirror", "1" if mirror else "0", "--smoothing", str(smoothing)]
        if phone is not None:
            args += ["--phone-id", phone[0], "--phone-token", phone[1]]
        # numpy comes with the Python of Blender, the other libraries are the wheels.
        env = dict(os.environ, PYTHONPATH=wheels, PYTHONNOUSERSITE="1", PYTHONIOENCODING="utf-8")
        self._log_path = log_path
        self._log = open(log_path, "w", encoding="utf-8")
        self._proc = subprocess.Popen(
            args, env=env, stdin=subprocess.DEVNULL, stdout=self._log, stderr=self._log,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))

    # ------------------------------------------------------------ settings

    def send(self, **settings):
        """Settings for the engine, kept until it connects if it is still starting."""
        if self._conn is None:
            self._pending.update(settings)
            return
        try:
            self._conn.send(json.dumps(settings).encode("utf-8") + b"\n")
        except OSError:
            pass

    def take_moves(self):
        moves, self.moves = self.moves, []
        return moves

    # ------------------------------------------------------------ reading

    def update(self):
        """Read what the engine sent, without waiting. False once the engine is gone."""
        if not self.running:
            return False
        if self._conn is None:
            self._accept()
        if self._conn is not None:
            self._receive()
        if self._proc.poll() is not None and self.running:
            if self._conn is not None:
                self._receive()
            self._end(self.error or self._log_tail() or "The camera engine stopped")
        elif self._conn is None and time.monotonic() - self._started > CONNECT_TIMEOUT:
            self._end("The camera engine did not start")
        return self.running

    def _accept(self):
        try:
            conn, _ = self._listener.accept()
        except (BlockingIOError, InterruptedError):
            return
        conn.setblocking(False)
        self._conn = conn

    def _receive(self):
        while True:
            try:
                chunk = self._conn.recv(1 << 20)
            except (BlockingIOError, InterruptedError):
                break
            except OSError:
                chunk = b""
            if not chunk:
                break
            self._buffer += chunk
        while len(self._buffer) >= 4:
            size = struct.unpack(">I", self._buffer[:4])[0]
            if len(self._buffer) < 4 + size:
                break
            header = json.loads(bytes(self._buffer[4:4 + size]))
            extra = header.get("size", 0)
            if len(self._buffer) < 4 + size + extra:
                break
            payload = bytes(self._buffer[4 + size:4 + size + extra])
            del self._buffer[:4 + size + extra]
            self._handle(header, payload)

    def _handle(self, msg, payload):
        kind = msg.get("t")
        if kind == "hello":
            if msg.get("key") != self._key:
                # Not our engine: some other program on this computer. Wait for ours.
                self._conn.close()
                self._conn = None
                self._buffer.clear()
            elif self._pending:
                pending, self._pending = self._pending, {}
                self.send(**pending)
        elif kind == "frame":
            self.moves.append((msg["mode"], msg["dx"], msg["dy"], msg["zoom"]))
            self.preview = (msg["pw"], msg["ph"], payload)
            self.hand = msg["hand"]
            self.mode = msg["mode"]
            self.fps = msg.get("fps", 0.0)
            self.frame_size = (msg["w"], msg["h"])
            self.serial += 1
        elif kind == "status":
            self.status = msg["status"]
            self.connected = msg.get("connected", False)
        elif kind == "qr":
            self.phone_url = msg["url"]
            self.qr_rows = msg["rows"]
        elif kind == "clear":
            self.moves.append(("none", 0.0, 0.0, 1.0))
            self.preview = None
            self.hand = None
            self.mode = "none"
            self.fps = 0.0
            self.frame_size = (0, 0)
            self.serial += 1
        elif kind == "error":
            self.error = msg["text"]

    def _log_tail(self):
        try:
            self._log.flush()
            with open(self._log_path, encoding="utf-8", errors="replace") as f:
                lines = [line.strip() for line in f if line.strip()]
            return lines[-1] if lines else ""
        except OSError:
            return ""

    # ------------------------------------------------------------ stopping

    def _end(self, error=""):
        self.running = False
        self.error = self.error or error
        self.moves.append(("none", 0.0, 0.0, 1.0))
        if not self.error:
            self.status = "Camera off"

    def stop(self):
        """Ask the engine to end, wait a moment for it, then make sure it is gone."""
        self._pending.clear()
        self.send(stop=True)
        if self._conn is not None:
            self._conn.close()
            self._conn = None
        self._listener.close()
        try:
            self._proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            self._proc.kill()
            self._proc.wait()
        self._log.close()
        if self.running:
            self._end()
