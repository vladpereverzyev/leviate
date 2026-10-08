# SPDX-License-Identifier: GPL-3.0-or-later
# Leviate for Blender. Copyright (C) 2026 Vladyslav Pereverzyev

"""The Leviate engine: camera, phone and hand tracking in a process of its own.

The add-on starts this script with the Python of Blender, so the camera, MediaPipe
and the network never run inside Blender itself. The engine connects to a socket the
add-on listens on (127.0.0.1 only) and sends it messages: a 4 byte length, a JSON
header and the bytes the header announces with "size" (the camera preview). Blender
sends back settings as JSON lines. When Blender closes the socket the engine ends.
"""

import argparse
import asyncio
import json
import select
import socket
import struct
import time


class Link:
    """The socket to Blender."""

    def __init__(self, port, key):
        self.sock = socket.create_connection(("127.0.0.1", port), timeout=10)
        self.sock.settimeout(None)
        self.open = True
        self._buffer = b""
        self.send({"t": "hello", "key": key})

    def send(self, header, payload=b""):
        if payload:
            header = dict(header, size=len(payload))
        data = json.dumps(header).encode("utf-8")
        try:
            self.sock.sendall(struct.pack(">I", len(data)) + data + payload)
        except OSError:
            self.open = False

    def commands(self):
        """Settings sent by Blender since the last call. Sets open to False once Blender is gone."""
        found = []
        while self.open and select.select([self.sock], [], [], 0)[0]:
            try:
                chunk = self.sock.recv(65536)
            except OSError:
                chunk = b""
            if not chunk:
                self.open = False
                break
            self._buffer += chunk
            *lines, self._buffer = self._buffer.split(b"\n")
            for line in lines:
                try:
                    found.append(json.loads(line))
                except ValueError:
                    pass
        for command in found:
            if command.get("stop"):
                self.open = False
        return found


def apply(commands, tracker):
    for command in commands:
        if "mirror" in command:
            tracker.mirror = bool(command["mirror"])
        if "smoothing" in command:
            tracker.engine.smoothing = float(command["smoothing"])


class Rate:
    """Frames per second over the last second."""

    def __init__(self, clock):
        self.clock = clock
        self.fps = 0.0
        self._frames = 0
        self._start = clock()

    def tick(self):
        self._frames += 1
        now = self.clock()
        if now - self._start >= 1.0:
            self.fps = self._frames / (now - self._start)
            self._frames = 0
            self._start = now
        return self.fps


def run_webcam(link, tracker, args, clock):
    from tracker import open_camera, read_camera
    camera = int(args.camera) if args.camera.isdigit() else args.camera
    cap = open_camera(camera, args.width, args.height)
    if cap is None:
        link.send({"t": "error", "text": "Camera %s not found or in use by another program" % (
            camera + 1 if isinstance(camera, int) else camera)})
        return
    try:
        link.send({"t": "status", "status": "Camera on"})
        rate = Rate(clock)
        while link.open:
            apply(link.commands(), tracker)
            rgb = read_camera(cap)
            if rgb is None:
                link.send({"t": "error", "text": "The camera stopped sending images"})
                return
            message, pixels = tracker.step(rgb)
            message["fps"] = rate.tick()
            link.send(message, pixels)
    finally:
        cap.release()


async def run_phone(link, tracker, args, clock):
    from phone import PhoneLink, qr_matrix
    phone = PhoneLink((args.phone_id, args.phone_token))
    rows = ["".join("1" if dark else "0" for dark in row) for row in qr_matrix(phone.url)]
    link.send({"t": "qr", "url": phone.url, "rows": rows})
    task = asyncio.ensure_future(phone.run())
    shown = None
    serial = 0
    rate = Rate(clock)
    try:
        while link.open and not task.done():
            apply(link.commands(), tracker)
            state = (phone.status, phone.connected)
            if state != shown:
                shown = state
                link.send({"t": "status", "status": phone.status, "connected": phone.connected})
                if not phone.connected:
                    # Waiting for the phone: Blender shows the QR code instead of the preview.
                    tracker.engine.reset()
                    link.send({"t": "clear"})
            if not phone.connected or phone.serial == serial:
                await asyncio.sleep(0.01)
                continue
            serial = phone.serial
            # The front camera of the phone is mirrored like a selfie, the rear one is not.
            tracker.mirror = phone.facing == "user"
            message, pixels = tracker.step(phone.frame)
            message["fps"] = rate.tick()
            link.send(message, pixels)
            await asyncio.sleep(0)
    finally:
        phone.stop()
        try:
            await asyncio.wait_for(task, 5)
        except Exception:
            pass
    if phone.error:
        link.send({"t": "error", "text": phone.error})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, required=True)
    parser.add_argument("--key", required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--camera", default="0")
    parser.add_argument("--width", type=int, default=640)
    parser.add_argument("--height", type=int, default=480)
    parser.add_argument("--mirror", type=int, default=1)
    parser.add_argument("--smoothing", type=float, default=0.5)
    parser.add_argument("--phone-id")
    parser.add_argument("--phone-token")
    args = parser.parse_args()

    link = Link(args.port, args.key)
    tracker = None
    try:
        try:
            from tracker import HandTracker
        except ImportError as err:
            link.send({"t": "error", "text": "Hand tracking libraries missing: %s" % err})
            return
        tracker = HandTracker(args.model, mirror=bool(args.mirror), smoothing=args.smoothing)
        if args.phone_id:
            asyncio.run(run_phone(link, tracker, args, time.monotonic))
        else:
            run_webcam(link, tracker, args, time.monotonic)
    except Exception as err:
        link.send({"t": "error", "text": str(err) or err.__class__.__name__})
        raise
    finally:
        if tracker is not None:
            tracker.close()
        link.sock.close()


if __name__ == "__main__":
    main()
