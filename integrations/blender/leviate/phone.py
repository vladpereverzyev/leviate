# SPDX-License-Identifier: GPL-3.0-or-later
# Leviate for Blender. Copyright (C) 2026 Vladyslav Pereverzyev

"""Use a phone as the camera.

Blender waits for a phone with a PeerJS id and shows a QR code with the pairing
link of the Leviate web app. The phone opens the link and sends its camera over
WebRTC, exactly as it does with the web app. The PeerJS server only brokers the
connection; the video goes straight from the phone to Blender, where aiortc
decodes it for the hand tracking. Nothing is recorded.
"""

import asyncio
import json
import secrets
import ssl
import threading
import time

PAIR_URL = "https://vladpereverzyev.github.io/leviate/?pair="
SERVER = "wss://0.peerjs.com:443/peerjs?key=peerjs&id=%s&token=%s&version=1.5.5"
ICE_SERVERS = (
    ("stun:stun.l.google.com:19302", None, None),
    ("turn:eu-0.turn.peerjs.com:3478", "peerjs", "peerjsp"),
    ("turn:us-0.turn.peerjs.com:3478", "peerjs", "peerjsp"),
)
HEARTBEAT = 5.0
MAX_SIDE = 640


def random_id():
    alphabet = "0123456789abcdefghijklmnopqrstuvwxyz"
    return "leviate-" + "".join(secrets.choice(alphabet) for _ in range(14))


def qr_matrix(text):
    """The QR code of text as rows of booleans, quiet zone included."""
    import qrcode
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=2)
    qr.add_data(text)
    qr.make(fit=True)
    return qr.get_matrix()


def _ssl_context():
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


class PhoneLink:
    """Waits for a phone and hands over its frames as RGB arrays.

    read() blocks until a frame arrives or the timeout ends. status, error,
    facing and connected are read by the tracker and the panel.
    """

    def __init__(self):
        self.id = random_id()
        self.url = PAIR_URL + self.id
        self.status = "Connecting to the pairing server…"
        self.error = ""
        self.facing = "user"
        self.connected = False
        self._frame = None
        self._serial = 0
        self._cond = threading.Condition()
        self._loop = None
        self._stop = None
        self._thread = None

    # ------------------------------------------------------- tracker side

    def start(self):
        self._thread = threading.Thread(target=self._main, name="leviate-phone", daemon=True)
        self._thread.start()

    def stop(self):
        if self._loop is not None and self._stop is not None:
            try:
                self._loop.call_soon_threadsafe(self._stop.set)
            except RuntimeError:
                pass   # the loop has already ended
        if self._thread is not None:
            self._thread.join(timeout=5)
            self._thread = None
        with self._cond:
            self._cond.notify_all()

    @property
    def alive(self):
        return self._thread is not None and self._thread.is_alive()

    def read(self, last_serial, timeout=0.2):
        """(serial, frame) of a frame newer than last_serial, or (last_serial, None)."""
        with self._cond:
            if self._serial == last_serial:
                self._cond.wait(timeout)
            if self._serial == last_serial or self._frame is None:
                return last_serial, None
            return self._serial, self._frame

    def _put(self, frame):
        with self._cond:
            self._frame = frame
            self._serial += 1
            self._cond.notify_all()

    # --------------------------------------------------------- network side

    def _main(self):
        try:
            asyncio.run(self._run())
        except Exception as err:  # keep Blender alive whatever the network does
            self.error = str(err) or err.__class__.__name__
        finally:
            self.connected = False

    async def _run(self):
        try:
            import websockets
            from aiortc import RTCConfiguration, RTCIceServer, RTCPeerConnection, RTCSessionDescription
            from aiortc.sdp import candidate_from_sdp
        except ImportError as err:
            self.error = "Phone libraries missing: %s" % err
            return

        self._loop = asyncio.get_running_loop()
        self._stop = asyncio.Event()
        config = RTCConfiguration([RTCIceServer(urls=u, username=n, credential=c) for u, n, c in ICE_SERVERS])
        calls = {}   # connectionId -> (peer id, RTCPeerConnection, "media" or "data")
        tasks = set()

        def spawn(coro):
            task = asyncio.ensure_future(coro)
            tasks.add(task)
            task.add_done_callback(tasks.discard)

        async def receive_video(track):
            while True:
                try:
                    frame = await track.recv()
                except Exception:
                    break
                w, h = frame.width, frame.height
                scale = min(1.0, MAX_SIDE / max(w, h, 1))
                # Smaller frames keep the hand tracking fast; the hand is still big enough.
                rgb = frame.to_ndarray(format="rgb24", width=int(w * scale) // 2 * 2,
                                       height=int(h * scale) // 2 * 2)
                self._put(rgb)

        def on_message(message):
            if isinstance(message, bytes):
                message = message.decode("utf-8", "replace")
            try:
                data = json.loads(message)
            except (TypeError, ValueError):
                return
            if isinstance(data, dict):
                if data.get("facing") in ("user", "environment"):
                    self.facing = data["facing"]
                if data.get("bye"):
                    hang_up("The phone stopped the camera. Scan the QR code to connect again.")

        def hang_up(text):
            for cid, (_, pc, _) in list(calls.items()):
                spawn(pc.close())
                calls.pop(cid, None)
            self.connected = False
            self.status = text

        async def answer(ws, src, payload):
            cid = payload.get("connectionId")
            kind = payload.get("type")
            pc = RTCPeerConnection(config)
            if kind == "media":
                # One phone at a time: a new call replaces the old one, and the old phone
                # loses its data connection too.
                for old, (peer, other, was) in list(calls.items()):
                    if peer != src or was == "media":
                        spawn(other.close())
                        calls.pop(old, None)
                self.facing = (payload.get("metadata") or {}).get("facing") or "user"

                @pc.on("track")
                def on_track(track):
                    if track.kind == "video":
                        spawn(receive_video(track))

                @pc.on("connectionstatechange")
                async def on_state():
                    state = pc.connectionState
                    if state == "connected":
                        self.connected = True
                        self.status = "Phone connected"
                    elif state in ("failed", "closed") and calls.get(cid, (None, None, None))[1] is pc:
                        hang_up("The phone disconnected. Scan the QR code to connect again.")
            else:
                @pc.on("datachannel")
                def on_channel(channel):
                    channel.on("message", on_message)

            calls[cid] = (src, pc, kind)
            sdp = payload.get("sdp") or {}
            await pc.setRemoteDescription(RTCSessionDescription(sdp=sdp["sdp"], type=sdp["type"]))
            await pc.setLocalDescription(await pc.createAnswer())
            desc = pc.localDescription
            await ws.send(json.dumps({
                "type": "ANSWER",
                "dst": src,
                "payload": {"sdp": {"type": desc.type, "sdp": desc.sdp}, "type": kind,
                            "connectionId": cid, "browser": "leviate-blender"},
            }))
            if kind == "media":
                self.status = "Phone found, connecting…"

        async def add_candidate(payload):
            entry = calls.get(payload.get("connectionId"))
            cand = payload.get("candidate") or {}
            text = cand.get("candidate") or ""
            if entry is None or not text:
                return
            try:
                ice = candidate_from_sdp(text.split(":", 1)[1] if text.startswith("candidate:") else text)
                ice.sdpMid = cand.get("sdpMid")
                ice.sdpMLineIndex = cand.get("sdpMLineIndex")
                await entry[1].addIceCandidate(ice)
            except Exception:
                pass   # a bad candidate is not fatal, the others still work

        async def heartbeat(ws):
            while True:
                await asyncio.sleep(HEARTBEAT)
                await ws.send(json.dumps({"type": "HEARTBEAT"}))

        token = secrets.token_hex(8)
        try:
            ws = await websockets.connect(SERVER % (self.id, token), ssl=_ssl_context(),
                                          open_timeout=15, max_size=2 ** 22)
        except Exception as err:
            self.error = "Could not reach the pairing server (%s). Check the internet connection." % (
                str(err) or err.__class__.__name__)
            return

        async def listen():
            async for raw in ws:
                try:
                    msg = json.loads(raw)
                except ValueError:
                    continue
                kind = msg.get("type")
                payload = msg.get("payload") or {}
                if kind == "OPEN":
                    self.status = "Scan the QR code with your phone"
                elif kind in ("ID-TAKEN", "INVALID-KEY", "ERROR"):
                    self.error = "Pairing server: %s" % (payload.get("msg") or kind)
                    return
                elif kind == "OFFER":
                    try:
                        await answer(ws, msg.get("src"), payload)
                    except Exception as err:
                        self.status = "Could not answer the phone (%s). Try again." % (
                            str(err) or err.__class__.__name__)
                elif kind == "CANDIDATE":
                    await add_candidate(payload)
                elif kind in ("LEAVE", "EXPIRE"):
                    if any(src == msg.get("src") for src, _, _ in calls.values()):
                        hang_up("The phone disconnected. Scan the QR code to connect again.")

        beat = asyncio.ensure_future(heartbeat(ws))
        reader = asyncio.ensure_future(listen())
        stopper = asyncio.ensure_future(self._stop.wait())
        try:
            done, _ = await asyncio.wait({reader, stopper}, return_when=asyncio.FIRST_COMPLETED)
            if reader in done and not self.error and not self._stop.is_set():
                exc = reader.exception()
                self.error = "Lost the pairing server%s" % (": %s" % exc if exc else "")
        finally:
            for task in (beat, reader, stopper, *tasks):
                task.cancel()
            for _, pc, _ in list(calls.values()):
                try:
                    await pc.close()
                except Exception:
                    pass
            try:
                await ws.close()
            except Exception:
                pass
