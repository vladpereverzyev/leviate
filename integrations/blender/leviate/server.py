# SPDX-License-Identifier: GPL-3.0-or-later
# Leviate for Blender. Copyright (C) 2026 Vladyslav Pereverzyev

"""Small WebSocket server for the Leviate web app, standard library only.

It listens on 127.0.0.1, accepts one browser page at a time and puts every
JSON message it receives in a queue. Blender reads the queue from a timer on
the main thread, so this module never touches bpy.
"""

import base64
import hashlib
import json
import queue
import socket
import struct
import threading

GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

# Pages allowed to connect. Any other web site open in the browser is refused,
# so it cannot move the view behind your back.
DEFAULT_ORIGINS = (
    "https://vladpereverzyev.github.io",
    "http://localhost",
    "http://127.0.0.1",
)


def origin_allowed(origin, extra=(), any_origin=False):
    if any_origin:
        return True
    if not origin:
        return False
    origin = origin.rstrip("/").lower()
    for allowed in tuple(DEFAULT_ORIGINS) + tuple(extra):
        allowed = allowed.strip().rstrip("/").lower()
        if not allowed:
            continue
        # http://localhost also covers http://localhost:8000 and so on.
        if origin == allowed or origin.startswith(allowed + ":"):
            return True
    return False


class LeviateServer:
    def __init__(self, port=47800, origins=(), any_origin=False):
        self.port = port
        self.origins = tuple(origins)
        self.any_origin = any_origin
        self.messages = queue.Queue()
        self.client = None
        self.client_origin = ""
        self.error = ""
        self._sock = None
        self._thread = None
        self._running = False
        self._lock = threading.Lock()

    # ------------------------------------------------------------ lifecycle

    def start(self):
        if self._running:
            return
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        if hasattr(socket, "SO_EXCLUSIVEADDRUSE"):
            # Windows: without this a second program could listen on the same port.
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        else:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind(("127.0.0.1", self.port))
        sock.listen(2)
        sock.settimeout(0.5)
        self._sock = sock
        self._running = True
        self.error = ""
        self._thread = threading.Thread(target=self._serve, name="leviate-server", daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False
        self._drop_client()
        if self._sock:
            try:
                self._sock.close()
            except OSError:
                pass
            self._sock = None
        if self._thread:
            self._thread.join(timeout=2)
            self._thread = None

    @property
    def running(self):
        return self._running

    @property
    def connected(self):
        return self.client is not None

    def send(self, data):
        """Sends a JSON message to the page, if one is connected."""
        with self._lock:
            client = self.client
        if client is None:
            return
        try:
            client.sendall(_frame(json.dumps(data).encode("utf-8")))
        except OSError:
            self._drop_client()

    # ------------------------------------------------------------ internals

    def _serve(self):
        while self._running:
            try:
                conn, _ = self._sock.accept()
            except socket.timeout:
                continue
            except OSError:
                break
            try:
                conn.settimeout(5)
                origin = self._handshake(conn)
            except (OSError, ValueError) as err:
                self.error = str(err)
                conn.close()
                continue
            # A new page takes over from the old one.
            self._drop_client()
            with self._lock:
                self.client = conn
                self.client_origin = origin
            self.messages.put({"type": "connected", "origin": origin})
            threading.Thread(target=self._read, args=(conn,), name="leviate-client", daemon=True).start()

    def _handshake(self, conn):
        data = b""
        while b"\r\n\r\n" not in data:
            chunk = conn.recv(4096)
            if not chunk:
                raise ValueError("Connection closed during the handshake")
            data += chunk
            if len(data) > 16384:
                raise ValueError("Handshake too long")
        lines = data.split(b"\r\n\r\n", 1)[0].decode("latin-1").split("\r\n")
        headers = {}
        for line in lines[1:]:
            if ":" in line:
                name, value = line.split(":", 1)
                headers[name.strip().lower()] = value.strip()
        key = headers.get("sec-websocket-key")
        origin = headers.get("origin", "")
        if not key or "websocket" not in headers.get("upgrade", "").lower():
            conn.sendall(b"HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\n\r\n")
            raise ValueError("Not a WebSocket request")
        if not origin_allowed(origin, self.origins, self.any_origin):
            conn.sendall(b"HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n")
            raise ValueError("Page not allowed: " + (origin or "no origin"))
        accept = base64.b64encode(hashlib.sha1((key + GUID).encode("ascii")).digest()).decode("ascii")
        conn.sendall((
            "HTTP/1.1 101 Switching Protocols\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            "Sec-WebSocket-Accept: " + accept + "\r\n\r\n"
        ).encode("ascii"))
        return origin

    def _read(self, conn):
        conn.settimeout(0.5)
        buffer = b""
        message = b""
        while self._running and self.client is conn:
            try:
                chunk = conn.recv(65536)
            except socket.timeout:
                continue
            except OSError:
                break
            if not chunk:
                break
            buffer += chunk
            while True:
                parsed = _parse(buffer)
                if parsed is None:
                    break
                fin, opcode, payload, used = parsed
                buffer = buffer[used:]
                if opcode == 0x8:
                    self._drop_client(conn)
                    return
                if opcode == 0x9:
                    try:
                        conn.sendall(_frame(payload, 0xA))
                    except OSError:
                        pass
                    continue
                if opcode in (0x1, 0x0):
                    message += payload
                    if fin:
                        try:
                            self.messages.put(json.loads(message.decode("utf-8")))
                        except (ValueError, UnicodeDecodeError):
                            pass
                        message = b""
        self._drop_client(conn)

    def _drop_client(self, conn=None):
        with self._lock:
            if self.client is None or (conn is not None and self.client is not conn):
                return
            client = self.client
            self.client = None
            self.client_origin = ""
        try:
            client.sendall(_frame(b"", 0x8))
        except OSError:
            pass
        try:
            client.close()
        except OSError:
            pass
        self.messages.put({"type": "disconnected"})


def _parse(buffer):
    """Returns (fin, opcode, payload, bytes used) or None if the frame is incomplete."""
    if len(buffer) < 2:
        return None
    b0, b1 = buffer[0], buffer[1]
    fin = bool(b0 & 0x80)
    opcode = b0 & 0x0F
    masked = bool(b1 & 0x80)
    length = b1 & 0x7F
    pos = 2
    if length == 126:
        if len(buffer) < 4:
            return None
        length = struct.unpack(">H", buffer[2:4])[0]
        pos = 4
    elif length == 127:
        if len(buffer) < 10:
            return None
        length = struct.unpack(">Q", buffer[2:10])[0]
        pos = 10
    mask = b""
    if masked:
        if len(buffer) < pos + 4:
            return None
        mask = buffer[pos:pos + 4]
        pos += 4
    if len(buffer) < pos + length:
        return None
    payload = buffer[pos:pos + length]
    if masked:
        payload = bytes(c ^ mask[i % 4] for i, c in enumerate(payload))
    return fin, opcode, payload, pos + length


def _frame(payload, opcode=0x1):
    head = bytes([0x80 | opcode])
    n = len(payload)
    if n < 126:
        head += bytes([n])
    elif n < 65536:
        head += bytes([126]) + struct.pack(">H", n)
    else:
        head += bytes([127]) + struct.pack(">Q", n)
    return head + payload
