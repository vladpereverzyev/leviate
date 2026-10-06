# SPDX-License-Identifier: GPL-3.0-or-later
# Leviate for Blender. Copyright (C) 2026 Vladyslav Pereverzyev

"""Camera and hand tracking in a background thread.

OpenCV reads the webcam (or PhoneLink hands over the phone video), MediaPipe Hand Landmarker finds the hand on the CPU and
GestureEngine turns it into moves. Blender reads the results from a timer on the
main thread: the moves from a queue and the latest preview frame under a lock.
Nothing is recorded.
"""

import importlib.machinery
import importlib.util
import os
import queue
import sys
import threading
import time
import types

from .gestures import GestureEngine, NONE

MODEL = os.path.join(os.path.dirname(__file__), "models", "hand_landmarker.task")
PREVIEW_WIDTH = 320


def _import_libraries():
    # MediaPipe imports matplotlib for drawing helpers we never call. When it is
    # missing an empty stand in is enough, so the add-on does not ship it. The stand
    # in carries a module spec: find_spec() fails on a module without one, which
    # broke the second start of the camera and could break other add-ons.
    if "matplotlib" not in sys.modules and importlib.util.find_spec("matplotlib") is None:
        for name in ("matplotlib", "matplotlib.pyplot"):
            module = types.ModuleType(name)
            module.__spec__ = importlib.machinery.ModuleSpec(name, None)
            sys.modules[name] = module
        sys.modules["matplotlib"].pyplot = sys.modules["matplotlib.pyplot"]
    import cv2
    import mediapipe as mp
    import numpy as np
    from mediapipe.tasks.python import BaseOptions, vision
    return cv2, mp, np, BaseOptions, vision


def detect_points(landmarker, image, ts):
    """21 (x, y) points of the first hand, or None.

    Same call as HandLandmarker.detect_for_video, but the result is read straight
    from the C struct. MediaPipe 1.0.1 turns every landmark into Python objects and
    decodes its name pointer, which is sometimes garbage and crashes Blender.
    Only x and y are read here, the names are never touched.
    """
    import ctypes
    from mediapipe.tasks.python.vision.hand_landmarker import MpHandLandmarkerResultC
    result = MpHandLandmarkerResultC()
    landmarker._lib.MpHandLandmarkerDetectForVideo(
        landmarker._handle, image._image_ptr, None, ts, ctypes.byref(result))
    try:
        if not result.hand_landmarks_count:
            return None
        hand = result.hand_landmarks[0]
        return [(hand.landmarks[i].x, hand.landmarks[i].y) for i in range(hand.landmarks_count)]
    finally:
        landmarker._lib.MpHandLandmarkerCloseResult(ctypes.byref(result))


def _backends(cv2):
    if sys.platform == "win32":
        return (cv2.CAP_DSHOW, cv2.CAP_MSMF, cv2.CAP_ANY)
    if sys.platform == "darwin":
        return (cv2.CAP_AVFOUNDATION, cv2.CAP_ANY)
    return (cv2.CAP_V4L2, cv2.CAP_ANY)


class Tracker:
    def __init__(self, camera=0, width=640, height=480, mirror=True, smoothing=0.5, phone=None):
        self.camera = camera
        self.phone = phone
        self.width = width
        self.height = height
        self.mirror = mirror
        self.engine = GestureEngine(smoothing=smoothing)
        self.moves = queue.Queue()
        self.error = ""
        self.status = "Starting camera…"
        self.fps = 0.0
        self.frame_size = (0, 0)
        self._lock = threading.Lock()
        self._preview = None   # (width, height, RGBA float list), newest frame
        self._hand = None      # 21 (x, y) points in preview space, mirrored like the preview
        self._mode = NONE
        self._serial = 0
        self._running = False
        self._thread = None

    @property
    def running(self):
        return self._running

    def start(self):
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._run, name="leviate-tracker", daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False
        if self.phone is not None:
            self.phone.stop()
        if self._thread:
            self._thread.join(timeout=3)
            self._thread = None

    def preview(self):
        """(serial, width, height, pixels, hand points, mode). Pixels may be None."""
        with self._lock:
            if self._preview is None:
                return self._serial, 0, 0, None, self._hand, self._mode
            w, h, px = self._preview
            return self._serial, w, h, px, self._hand, self._mode

    def _run(self):
        cap = None
        landmarker = None
        try:
            try:
                cv2, mp, np, BaseOptions, vision = _import_libraries()
            except ImportError as err:
                self.error = "Hand tracking libraries missing: %s" % err
                return

            if self.phone is None:
                for backend in _backends(cv2):
                    cap = cv2.VideoCapture(self.camera, backend)
                    if cap.isOpened():
                        break
                    cap.release()
                    cap = None
                if cap is None:
                    self.error = "Camera %d not found or in use by another program" % (self.camera + 1)
                    return
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
            else:
                self.phone.start()

            options = vision.HandLandmarkerOptions(
                base_options=BaseOptions(model_asset_path=MODEL),
                running_mode=vision.RunningMode.VIDEO,
                num_hands=1,
                min_hand_detection_confidence=0.6,
                min_hand_presence_confidence=0.6,
                min_tracking_confidence=0.5,
            )
            landmarker = vision.HandLandmarker.create_from_options(options)
            if self.phone is None:
                self.status = "Camera on"
            phone_serial = 0

            t0 = time.monotonic()
            last_ts = -1
            frames = 0
            fps_start = time.monotonic()
            while self._running:
                if self.phone is None:
                    ok, frame = cap.read()
                    if not ok:
                        self.error = "The camera stopped sending images"
                        break
                    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                else:
                    phone_serial, rgb = self.phone.read(phone_serial)
                    self.status = self.phone.status
                    if self.phone.error:
                        self.error = self.phone.error
                        break
                    if not self.phone.connected:
                        # Waiting for the phone: the 3D view shows the QR code instead.
                        if self._hand_shown():
                            self._clear_preview()
                            self.engine.reset()
                            self.moves.put((NONE, 0.0, 0.0, 1.0, 1.0))
                            self.fps = 0.0
                            self.frame_size = (0, 0)
                        continue
                    if rgb is None:
                        continue
                    # The front camera of the phone is mirrored like a selfie, the rear one is not.
                    self.mirror = self.phone.facing == "user"
                h, w = rgb.shape[:2]
                self.frame_size = (w, h)
                # Timestamps must grow, even if two frames arrive in the same millisecond.
                ts = max(int((time.monotonic() - t0) * 1000), last_ts + 1)
                last_ts = ts
                lm = detect_points(landmarker, mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb), ts)
                mode, dx, dy, zoom = self.engine.update(lm, mirror=self.mirror)
                self.moves.put((mode, dx, dy, zoom, w / max(h, 1)))
                self._store_preview(cv2, np, rgb, lm, mode)

                frames += 1
                now = time.monotonic()
                if now - fps_start >= 1.0:
                    self.fps = frames / (now - fps_start)
                    frames = 0
                    fps_start = now
        except Exception as err:  # keep Blender alive whatever the camera does
            self.error = str(err) or err.__class__.__name__
        finally:
            if landmarker is not None:
                try:
                    landmarker.close()
                except Exception:
                    pass
            if cap is not None:
                cap.release()
            self._running = False
            self.moves.put((NONE, 0.0, 0.0, 1.0, 1.0))
            if self.phone is not None:
                self.phone.stop()
            if not self.error:
                self.status = "Camera off"

    def _hand_shown(self):
        with self._lock:
            return self._preview is not None

    def _clear_preview(self):
        with self._lock:
            self._preview = None
            self._hand = None
            self._mode = NONE
            self._serial += 1

    def _store_preview(self, cv2, np, rgb, lm, mode):
        h, w = rgb.shape[:2]
        pw = PREVIEW_WIDTH
        ph = max(1, round(h * pw / w))
        small = cv2.resize(rgb, (pw, ph), interpolation=cv2.INTER_AREA)
        if self.mirror:
            small = small[:, ::-1]
        # GPU textures start at the bottom row.
        small = small[::-1]
        rgba = np.empty((ph, pw, 4), dtype=np.float32)
        rgba[..., :3] = small / 255.0
        rgba[..., 3] = 1.0
        hand = None
        if lm:
            hand = [((1 - x) if self.mirror else x, y) for x, y in lm]
        with self._lock:
            self._preview = (pw, ph, rgba.ravel())
            self._hand = hand
            self._mode = mode
            self._serial += 1
