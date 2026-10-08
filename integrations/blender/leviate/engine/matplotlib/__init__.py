# SPDX-License-Identifier: GPL-3.0-or-later
# Leviate for Blender. Copyright (C) 2026 Vladyslav Pereverzyev

"""Empty stand in for matplotlib, found first because it sits next to main.py.

MediaPipe imports matplotlib.pyplot for drawing helpers the engine never calls, so
the add-on does not ship the real library. Only the engine process sees this folder.
"""
