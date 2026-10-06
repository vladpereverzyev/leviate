# Third-party notices

Leviate is licensed under the AGPL-3.0 (see [LICENSE](LICENSE)). It ships the following third-party
components. Each one keeps its own license.

| Component | Version | License | Files in this repository |
| --- | --- | --- | --- |
| [three.js](https://github.com/mrdoob/three.js) | r186 (npm `three@0.186.1`) | MIT | `vendor/three/` |
| [MediaPipe Tasks Vision](https://github.com/google-ai-edge/mediapipe) | npm `@mediapipe/tasks-vision@1.0.1` | Apache-2.0 | `vendor/mediapipe/` |
| [MediaPipe Hand Landmarker model](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) | float16, latest | Apache-2.0 | `models/hand_landmarker.task` |
| [fflate](https://github.com/101arrowz/fflate) | 0.8.2 (bundled with three.js) | MIT | `vendor/three/addons/libs/fflate.module.js` |
| [meshoptimizer decoder](https://github.com/zeux/meshoptimizer) | bundled with three.js | MIT | `vendor/three/addons/libs/meshopt_decoder.module.js` |
| [Draco decoder](https://github.com/google/draco) | bundled with three.js | Apache-2.0 | `vendor/three/addons/libs/draco/` |
| [Jost font](https://github.com/indestructible-type/Jost) | 3.x | SIL OFL 1.1 | `vendor/fonts/` |
| [kelyonn/vertex](https://github.com/kelyonn/vertex) | 2026-06 | MIT | idea adapted in `js/gestures.js` |

## three.js

Files: `vendor/three/three.module.js`, `vendor/three/three.core.js`,
`vendor/three/addons/controls/OrbitControls.js`, `vendor/three/addons/loaders/`
(STL, PLY, OBJ, MTL, GLTF, Draco, 3MF, FBX, Collada, 3DS, AMF, VTK, PCD, XYZ and TGA loaders),
`vendor/three/addons/utils/` and `vendor/three/addons/curves/`.
Copied unmodified from the npm package. Full license text in `vendor/three/LICENSE`.

```
The MIT License

Copyright © 2010-2026 three.js authors
```

## MediaPipe Tasks Vision

Files: `vendor/mediapipe/vision_bundle.mjs` and `vendor/mediapipe/wasm/`
(SIMD and non-SIMD WebAssembly builds).
Copied from the npm package. The only change is the removal of the
`sourceMappingURL` comment at the end of `vision_bundle.mjs`, because the source
map is not shipped. Full license text in `vendor/mediapipe/LICENSE`.

```
Copyright Google LLC
Licensed under the Apache License, Version 2.0
```

The upstream MediaPipe repository has no NOTICE file, so there is no upstream
NOTICE text to carry over.

## MediaPipe Hand Landmarker model

File: `models/hand_landmarker.task`, downloaded unmodified from
`https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task`.
Released by Google under the Apache License 2.0 (same text as `vendor/mediapipe/LICENSE`).

## fflate

File: `vendor/three/addons/libs/fflate.module.js`, shipped unmodified inside the
three.js package. Used by the 3MF, FBX, AMF and VTK loaders to unzip data.

```
fflate - fast JavaScript compression/decompression
Copyright (c) 2023 Arjun Barrett
Licensed under MIT
```

## meshoptimizer decoder

File: `vendor/three/addons/libs/meshopt_decoder.module.js`, shipped unmodified inside
the three.js package. Used to read glTF files compressed with meshoptimizer.

```
meshoptimizer, Copyright (c) Arseny Kapoulkine
Distributed under the terms of the MIT License
```

## Draco decoder

Files: `vendor/three/addons/libs/draco/gltf/` (JavaScript wrapper and WebAssembly
decoder), shipped unmodified inside the three.js package. Used to read glTF files
compressed with Draco. Full license text in `vendor/three/addons/libs/draco/LICENSE`.

```
Copyright The Draco Authors (Google LLC)
Licensed under the Apache License, Version 2.0
```

## Jost font

Files: `vendor/fonts/jost-300.woff2`, `jost-400.woff2` and `jost-500.woff2`.
Licensed under the SIL Open Font License 1.1. Full text in `vendor/fonts/OFL.txt`.

```
Copyright 2020 The Jost Project Authors (https://github.com/indestructible-type)
```

## kelyonn/vertex

The finger extension test in `js/gestures.js` (fingertip direction compared with
the palm direction, thumb compared with the pinky base) is adapted from
`src/gesture_engine.py` of kelyonn/vertex. No code is copied verbatim; the idea was
rewritten in JavaScript.

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

## Projects reviewed but not used

During research these related projects were looked at for ideas only. Nothing from
them is included, because they have no license or a copyleft license:
collidingScopes/3d-model-playground, collidingScopes/threejs-handtracking-101
(no license), jaredrhod/barehands (AGPL-3.0), amerob/gesture-3d-studio (no license).
