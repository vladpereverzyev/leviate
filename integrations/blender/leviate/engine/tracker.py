# SPDX-License-Identifier: GPL-3.0-or-later
# Leviate for Blender. Copyright (C) 2026 Vladyslav Pereverzyev

"""Hand tracking of one frame at a time.

MediaPipe Hand Landmarker finds the hand on the CPU and GestureEngine turns it into
moves. Runs in the engine process, never inside Blender. Nothing is recorded.
"""

import ctypes
import sys
import time

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks.python import BaseOptions, vision
from mediapipe.tasks.python.vision.hand_landmarker import MpHandLandmarkerResultC

from gestures import GestureEngine
from gloves import Gloves

PREVIEW_WIDTH = 320


def detect_points(landmarker, image, ts):
    """21 (x, y) points of the first hand, or None.

    Same call as HandLandmarker.detect_for_video, but the result is read straight
    from the C struct. MediaPipe 1.0.1 turns every landmark into Python objects and
    decodes its name pointer, which is sometimes garbage and crashes the process.
    Only x and y are read here, the names are never touched.
    """
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


def open_camera(camera, width, height):
    """An open cv2.VideoCapture for camera (a number, or a video file for tests), or None."""
    if isinstance(camera, str):
        backends = (cv2.CAP_ANY,)
    elif sys.platform == "win32":
        backends = (cv2.CAP_DSHOW, cv2.CAP_MSMF, cv2.CAP_ANY)
    elif sys.platform == "darwin":
        backends = (cv2.CAP_AVFOUNDATION, cv2.CAP_ANY)
    else:
        backends = (cv2.CAP_V4L2, cv2.CAP_ANY)
    for backend in backends:
        cap = cv2.VideoCapture(camera, backend)
        if cap.isOpened():
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
            return cap
        cap.release()
    return None


def read_camera(cap):
    """The next RGB frame of the camera, or None once it stops sending images."""
    ok, frame = cap.read()
    return cv2.cvtColor(frame, cv2.COLOR_BGR2RGB) if ok else None


class HandTracker:
    def __init__(self, model, mirror=True, smoothing=0.5):
        self.mirror = mirror
        self.engine = GestureEngine(smoothing=smoothing)
        self.gloves = Gloves()
        self.landmarker = vision.HandLandmarker.create_from_options(vision.HandLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=model),
            running_mode=vision.RunningMode.VIDEO,
            num_hands=1,
            min_hand_detection_confidence=0.6,
            min_hand_presence_confidence=0.6,
            min_tracking_confidence=0.5,
        ))
        self._t0 = time.monotonic()
        self._last_ts = -1

    def close(self):
        self.landmarker.close()

    def step(self, rgb):
        """(message, preview pixels) for one RGB frame.

        The message holds the move and the hand points, the pixels are the preview as
        RGBA bytes, already mirrored like the camera and bottom row first like a GPU texture.
        """
        # MediaPipe reads the pixels row after row with no gap. Scaled phone video in
        # portrait has padded rows, which MediaPipe would see as a skewed image.
        rgb = np.ascontiguousarray(rgb)
        h, w = rgb.shape[:2]
        # Timestamps must grow, even if two frames arrive in the same millisecond.
        ts = max(int((time.monotonic() - self._t0) * 1000), self._last_ts + 1)
        self._last_ts = ts
        glove_filter = self.gloves.next()
        seen = self.gloves.prepare(cv2, np, rgb, glove_filter)
        lm = detect_points(self.landmarker, mp.Image(image_format=mp.ImageFormat.SRGB, data=seen), ts)
        self.gloves.seen(lm is not None, glove_filter)
        mode, dx, dy, zoom = self.engine.update(lm, mirror=self.mirror)

        pw = PREVIEW_WIDTH
        ph = max(1, round(h * pw / w))
        small = cv2.resize(rgb, (pw, ph), interpolation=cv2.INTER_AREA)
        if self.mirror:
            small = small[:, ::-1]
        rgba = np.empty((ph, pw, 4), dtype=np.uint8)
        rgba[..., :3] = small[::-1]
        rgba[..., 3] = 255
        hand = [((1 - x) if self.mirror else x, y) for x, y in lm] if lm else None
        message = {"t": "frame", "mode": mode, "dx": dx, "dy": dy, "zoom": zoom,
                   "w": w, "h": h, "pw": pw, "ph": ph, "hand": hand}
        return message, rgba.tobytes()
