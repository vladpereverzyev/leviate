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
| [aiortc](https://github.com/aiortc/aiortc) | 1.15.0 | BSD-3-Clause | `wheels/aiortc-*.whl` |
| [aioice](https://github.com/aiortc/aioice) | 0.10.2 | BSD-3-Clause | `wheels/aioice-*.whl` |
| [PyAV](https://github.com/PyAV-Org/PyAV) | 17.1.0 | BSD-3-Clause | `wheels/av-*.whl` |
| [pylibsrtp](https://github.com/aiortc/pylibsrtp) | 1.0.0 | BSD-3-Clause | `wheels/pylibsrtp-*.whl` |
| [cryptography](https://github.com/pyca/cryptography) | 50.0.2 | Apache-2.0 or BSD-3-Clause | `wheels/cryptography-*.whl` |
| [pyOpenSSL](https://github.com/pyca/pyopenssl) | 26.4.0 | Apache-2.0 | `wheels/pyopenssl-*.whl` |
| [cffi](https://github.com/python-cffi/cffi) | 2.1.1 | MIT-0 | `wheels/cffi-*.whl` |
| [pycparser](https://github.com/eliben/pycparser) | 3.0 | BSD-3-Clause | `wheels/pycparser-*.whl` |
| [google-crc32c](https://github.com/googleapis/python-crc32c) | 1.9.0 | Apache-2.0 | `wheels/google_crc32c-*.whl` |
| [dnspython](https://github.com/rthalley/dnspython) | 2.8.0 | ISC | `wheels/dnspython-*.whl` |
| [ifaddr](https://github.com/ifaddr/ifaddr) | 0.2.0 | MIT | `wheels/ifaddr-*.whl` |
| [pyee](https://github.com/jfhbrook/pyee) | 13.0.1 | MIT | `wheels/pyee-*.whl` |
| [typing_extensions](https://github.com/python/typing_extensions) | 4.16.0 | PSF-2.0 | `wheels/typing_extensions-*.whl` |
| [websockets](https://github.com/python-websockets/websockets) | 17.2 | BSD-3-Clause | `wheels/websockets-*.whl` |
| [qrcode](https://github.com/lincolnloop/python-qrcode) | 8.2 | BSD-3-Clause | `wheels/qrcode-*.whl` |
| [kelyonn/vertex](https://github.com/kelyonn/vertex) | 2026-06 | MIT | idea adapted in `gestures.py` |

The wheels are the unmodified files published on PyPI. The OpenCV and PyAV wheels
bundle FFmpeg and other libraries under their own licenses (FFmpeg under the
LGPL-2.1-or-later), listed in their dist-info folders. pylibsrtp bundles libsrtp and
cryptography bundles OpenSSL, both under permissive licenses listed the same way.
aiortc, aioice, PyAV, pylibsrtp, cryptography, pyOpenSSL, cffi, pycparser, google-crc32c,
dnspython, ifaddr, pyee, typing_extensions, websockets and qrcode serve only the phone
camera.

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
