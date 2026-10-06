# Third-party notices

Leviate for Blender is licensed under the GPL-3.0-or-later (see LICENSE). The zips
also carry these components, each under its own license. Their full license texts
are inside each wheel, in the `*.dist-info` folder.

| Component | Version | License | Where |
| --- | --- | --- | --- |
| [MediaPipe](https://github.com/google-ai-edge/mediapipe) | 1.0.1 | Apache-2.0 | `wheels/mediapipe-*.whl` |
| [MediaPipe Hand Landmarker model](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) | float16 | Apache-2.0 | `models/hand_landmarker.task` |
| [OpenCV](https://github.com/opencv/opencv-python) (headless) | 5.0.0.93 | Apache-2.0 | `wheels/opencv_python_headless-*.whl` |
| [absl-py](https://github.com/abseil/abseil-py) | 2.5.0 | Apache-2.0 | `wheels/absl_py-*.whl` |
| [FlatBuffers](https://github.com/google/flatbuffers) | 25.12.19 | Apache-2.0 | `wheels/flatbuffers-*.whl` |
| [kelyonn/vertex](https://github.com/kelyonn/vertex) | 2026-06 | MIT | idea adapted in `gestures.py` |

The wheels are the unmodified files published on PyPI. The OpenCV wheel bundles
FFmpeg and other libraries under their own licenses, listed in its dist-info folder.

## kelyonn/vertex

The finger extension test in `gestures.py` (fingertip direction compared with the
palm direction, thumb compared with the pinky base) is adapted from
`src/gesture_engine.py` of kelyonn/vertex, through `js/gestures.js` of Leviate.

```
MIT License

Copyright (c) 2026 Kalyan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
