# SPDX-License-Identifier: GPL-3.0-or-later
# Leviate for Blender. Copyright (C) 2026 Vladyslav Pereverzyev

"""Turns MediaPipe hand landmarks into view commands. Same rules as js/gestures.js.

  open hand      -> rotate
  fist           -> pan
  thumb + index  -> zoom (spread to zoom in, close to zoom out)

Landmarks are the 21 normalized points of the MediaPipe hand model, as (x, y) pairs.
The finger test (fingertip direction against the palm direction) is adapted from
kelyonn/vertex, MIT License.
"""

import math

NONE = "none"
ROTATE = "rotate"
PAN = "pan"
ZOOM = "zoom"

WRIST = 0
THUMB_IP = 3
THUMB_TIP = 4
INDEX_MCP = 5
INDEX_PIP = 6
INDEX_TIP = 8
MIDDLE_MCP = 9
PINKY_MCP = 17

# (mcp, pip, tip) for index, middle, ring, pinky
FINGERS = ((5, 6, 8), (9, 10, 12), (13, 14, 16), (17, 18, 20))


def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def finger_extended(lm, finger):
    mcp, pip, tip = finger
    px = lm[mcp][0] - lm[WRIST][0]
    py = lm[mcp][1] - lm[WRIST][1]
    fx = lm[tip][0] - lm[pip][0]
    fy = lm[tip][1] - lm[pip][1]
    return px * fx + py * fy > 0


def thumb_extended(lm):
    return dist(lm[THUMB_TIP], lm[PINKY_MCP]) > dist(lm[THUMB_IP], lm[PINKY_MCP])


def palm_size(lm):
    return dist(lm[WRIST], lm[MIDDLE_MCP]) or 1e-6


def palm_center(lm):
    ids = (WRIST, INDEX_MCP, MIDDLE_MCP, PINKY_MCP)
    return (sum(lm[i][0] for i in ids) / 4, sum(lm[i][1] for i in ids) / 4)


def classify(lm, current=NONE):
    """Raw pose of one frame. `current` keeps the zoom pose alive when thumb and index touch."""
    index, middle, ring, pinky = (finger_extended(lm, f) for f in FINGERS)
    thumb = thumb_extended(lm)
    others = sum((middle, ring, pinky))
    total = others + (1 if index else 0)

    if total >= 4 or (total == 3 and thumb):
        return ROTATE

    if others == 0:
        tip_out = dist(lm[INDEX_TIP], lm[WRIST])
        enter = tip_out > dist(lm[INDEX_PIP], lm[WRIST])
        stay = tip_out > dist(lm[INDEX_MCP], lm[WRIST]) * 1.05
        if enter or (current == ZOOM and stay):
            return ZOOM
        if not index:
            return PAN
    return NONE


class GestureEngine:
    def __init__(self, debounce=3, smoothing=0.5, deadzone=0.0015):
        self.debounce = debounce
        self.smoothing = smoothing
        self.deadzone = deadzone
        self.reset()

    def reset(self):
        self.mode = NONE
        self.candidate = NONE
        self.candidate_frames = 0
        self.anchor = None
        self.spread = None

    def update(self, lm, mirror=False):
        """Returns (mode, dx, dy, zoom). dx and dy are in normalized image units, screen oriented."""
        if not lm:
            self.reset()
            return NONE, 0.0, 0.0, 1.0

        raw = classify(lm, self.mode)
        if raw == self.candidate:
            self.candidate_frames += 1
        else:
            self.candidate = raw
            self.candidate_frames = 1

        if self.candidate != self.mode and self.candidate_frames >= self.debounce:
            self.mode = self.candidate
            self.anchor = None
            self.spread = None

        a = self.smoothing
        cx, cy = palm_center(lm)
        dx = dy = 0.0
        zoom = 1.0

        if self.anchor is not None:
            nx = self.anchor[0] + (cx - self.anchor[0]) * a
            ny = self.anchor[1] + (cy - self.anchor[1]) * a
            dx = nx - self.anchor[0]
            dy = ny - self.anchor[1]
            self.anchor = (nx, ny)
        else:
            self.anchor = (cx, cy)
        if math.hypot(dx, dy) < self.deadzone:
            dx = dy = 0.0
        if mirror:
            dx = -dx

        if self.mode == ZOOM:
            s = dist(lm[THUMB_TIP], lm[INDEX_TIP]) / palm_size(lm)
            if self.spread is not None:
                nxt = self.spread + (s - self.spread) * a
                ratio = (nxt + 0.05) / (self.spread + 0.05)
                if abs(ratio - 1) > 0.004:
                    zoom = min(1.15, max(0.87, ratio))
                self.spread = nxt
            else:
                self.spread = s
            return ZOOM, 0.0, 0.0, zoom

        if self.mode == NONE:
            return NONE, 0.0, 0.0, 1.0
        return self.mode, dx, dy, zoom
