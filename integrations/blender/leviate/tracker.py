# SPDX-License-Identifier: GPL-3.0-or-later
# Leviate for Blender. Copyright (C) 2026 Vladyslav Pereverzyev

"""Camera and hand tracking in a background thread.

OpenCV reads the camera, MediaPipe Hand Landmarker finds the hand on the CPU and
GestureEngine turns it into moves. Blender reads the results from a timer on the
main thread: the moves from a queue and the latest preview frame under a lock.
Nothing is recorded or sent anywhere.
"""

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
    # missing an empty stand in is enough, so the add-on does not ship it.
    if importlib.util.find_spec("matplotlib") is None and "matplotlib" not in sys.modules:
        mpl = types.ModuleType("matplotlib")
        mpl.pyplot = types.ModuleType("matplotlib.pyplot")
        sys.modules["matplotlib"] = mpl
        sys.modules["matplotlib.pyplot"] = mpl.pyplot
    import cv2
    import mediapipe as mp
    import numpy as np
    from mediapipe.tasks.python import BaseOptions, vision
    return cv2, mp, np, BaseOptions, vision


def _backends(cv2):
    if sys.platform == "win32":
        return (cv2.CAP_DSHOW, cv2.CAP_MSMF, cv2.CAP_ANY)
    if sys.platform == "darwin":
        return (cv2.CAP_AVFOUNDATION, cv2.CAP_ANY)
    return (cv2.CAP_V4L2, cv2.CAP_ANY)


class Tracker:
    def __init__(self, camera=0, width=640, height=480, mirror=True, smoothing=0.5):
        self.camera = camera
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

            options = vision.HandLandmarkerOptions(
                base_options=BaseOptions(model_asset_path=MODEL),
                running_mode=vision.RunningMode.VIDEO,
                num_hands=1,
                min_hand_detection_confidence=0.6,
                min_hand_presence_confidence=0.6,
                min_tracking_confidence=0.5,
            )
            landmarker = vision.HandLandmarker.create_from_options(options)
            self.status = "Camera on"

            t0 = time.monotonic()
            last_ts = -1
            frames = 0
            fps_start = time.monotonic()
            while self._running:
                ok, frame = cap.read()
                if not ok:
                    self.error = "The camera stopped sending images"
                    break
                h, w = frame.shape[:2]
                self.frame_size = (w, h)
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                # Timestamps must grow, even if two frames arrive in the same millisecond.
                ts = max(int((time.monotonic() - t0) * 1000), last_ts + 1)
                last_ts = ts
                result = landmarker.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb), ts)
                lm = None
                if result.hand_landmarks:
                    lm = [(p.x, p.y) for p in result.hand_landmarks[0]]
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
            if not self.error:
                self.status = "Camera off"

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
