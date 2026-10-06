# Leviate

Move 3D scans with your bare hands. Leviate is a web app that turns any webcam,
on a computer or a phone, into a hand controller for 3D models. Open a scan, raise
your hand in front of the camera and rotate, pan or zoom it without touching anything.

Everything runs in the browser on the CPU. No install, no server, no GPU required,
and your files never leave your device.

## Features

- **Hand gestures**: open hand to rotate, fist to pan, thumb and index to zoom.
- **Any webcam**: built-in or USB cameras on a computer, front or rear camera on a phone.
- **Camera output of your choice**: device, resolution (480p, 720p, 1080p), frame rate,
  front or rear facing and mirror. The panel shows what the camera really delivers.
- **Many 3D formats**: STL, PLY, OBJ, GLB, GLTF, 3MF, FBX, DAE, 3DS, AMF, VTK, PCD and XYZ.
- **Several scans at once**: files loaded together keep their original coordinates,
  so upper and lower arches or the parts of an assembly stay aligned.
- **Scans stay in color**: PLY vertex colors, PLY textures, OBJ vertex colors and
  OBJ with MTL and texture images.
- **Per object tools**: color, show or hide, remove.
- **Floating windows**: files and webcam live in separate windows you can move
  and fold. On a phone they stack under the header.
- **View tools**: front, top, left and right presets, wireframe, turntable,
  screenshot to PNG and fullscreen.
- **Mouse and touch** still work next to the gestures.
- **Fully offline**: all libraries and the hand model are bundled in the repository.

## Gestures

| Hand pose | Action |
| --- | --- |
| Open hand (four or five fingers out) | Move the hand to **rotate** the model |
| Fist | Move the hand to **pan** the model in space |
| Thumb and index out, other fingers closed | Spread the two fingers to **zoom in** and close them to **zoom out** |

The zoom measures the gap between thumb and index relative to the size of your
palm, so moving the hand closer to the camera does not zoom by itself. When you
switch from one pose to another the model does not jump, because every gesture
starts from where the previous one stopped.

The sensitivity of each gesture and the amount of smoothing can be tuned in the
**Gestures** section of the panel. Settings are remembered in the browser.

## Quick start

Leviate is a static site. It needs to be served over HTTP because browsers do not
load JavaScript modules or WebAssembly from `file://`.

```sh
git clone https://github.com/vladpereverzyev/leviate.git
cd leviate
python -m http.server 8000
```

Open <http://localhost:8000>, load one or more scans and press **Start camera**.
Any static server works, for example `npx serve` instead of Python.

### On a phone

Browsers only open the camera on `https://` pages or on `localhost`. To use Leviate
on a phone, publish the folder on any static HTTPS host (GitHub Pages, Netlify,
Cloudflare Pages or your own server) and open that address on the phone.

## Supported files

| Format | Colors | Notes |
| --- | --- | --- |
| STL | single color you choose | normals are rebuilt on load |
| PLY | vertex colors or texture | for a texture, load the image with the PLY (`comment TextureFile` in the header); PLY without faces is shown as a point cloud |
| OBJ | vertex colors or MTL with textures | load the `.obj` together with its `.mtl` and image files |
| GLB, GLTF | own materials and textures | Draco and meshoptimizer compression supported; for `.gltf` add its `.bin` and images |
| 3MF | own colors | |
| FBX, DAE, 3DS | own materials and textures | add the texture images with the file |
| AMF | own colors | |
| VTK, VTP | vertex colors | |
| PCD, XYZ | point colors | shown as point clouds |

Select or drop all the files of a scan at the same time. If a texture or a companion
file is missing the app tells you which one.

## How it works

1. **Camera**: `getUserMedia` opens the selected webcam with the requested
   resolution and frame rate.
2. **Hand tracking**: [MediaPipe Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker)
   runs as WebAssembly with the CPU delegate (XNNPACK) and returns 21 landmarks of
   the hand for every new video frame.
3. **Pose**: `js/gestures.js` checks which fingers are extended by comparing the
   direction of each fingertip with the direction of the palm and turns that into
   one of three poses. A pose must be stable for a few frames before it becomes
   active, which removes flicker.
4. **Motion**: the palm center is smoothed and its movement between frames becomes
   rotation or pan. For zoom the ratio between the thumb to index gap and the palm
   size is tracked over time.
5. **Rendering**: [three.js](https://threejs.org) draws the scans with WebGL.
   Rotation follows the screen axes of the camera, so moving the hand right always
   turns the model right whatever the current view is.

## Project structure

| Path | Purpose |
| --- | --- |
| `index.html` | Layout: stage, objects, webcam, gestures and view panels |
| `css/style.css` | Desktop and mobile styles |
| `js/app.js` | Scene, file loading, camera, tracking loop and UI |
| `js/gestures.js` | Hand pose classification and motion (no DOM, easy to test) |
| `js/version.js` | Current version, shown in the app |
| `scripts/bump.mjs` | Raises the version (patch, minor or major) |
| `js/windows.js` | Floating windows: drag, collapse, phone layout |
| `vendor/three/` | three.js, its loaders and decoders (MIT, Draco Apache-2.0) |
| `vendor/fonts/` | Jost font (SIL OFL 1.1) |
| `icons/`, `site.webmanifest` | App icons for browsers, iOS and Android |
| `vendor/mediapipe/` | MediaPipe Tasks Vision and its WebAssembly runtime (Apache-2.0) |
| `models/hand_landmarker.task` | MediaPipe hand model (Apache-2.0) |

## Versions

The version is shown next to the name in the app and lives in `js/version.js`.
It follows [semantic versioning](https://semver.org) and grows with every commit:
the pre-commit hook in `.githooks/` raises the patch number automatically.
Enable it once after cloning:

```sh
git config core.hooksPath .githooks
```

For a minor or major release run `node scripts/bump.mjs minor` (or `major`) before
committing. Releases are listed on the
[releases page](https://github.com/vladpereverzyev/leviate/releases).

## Privacy

The video stream and your scans are processed only inside your browser. Nothing is
uploaded, there is no tracking and no account.

## Contributing

Issues and pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md)
and the [Code of Conduct](CODE_OF_CONDUCT.md)
first. Every contribution needs the short Contributor License Agreement written there.

## Support

If Leviate is useful to you, you can support its development on
[GitHub Sponsors](https://github.com/sponsors/vladpereverzyev) or
[Ko-fi](https://ko-fi.com/vladpereverzyev).

## License

Copyright (C) 2026 Vladyslav Pereverzyev

Leviate is dual licensed.

- **Open source**: [GNU Affero General Public License v3.0](LICENSE). You can use,
  study, modify and share it for free. If you distribute a modified version or offer
  it to users over a network you must publish your source code under the same license.
- **Commercial**: if you want to include Leviate in a closed source product or a
  service without the AGPL obligations, a commercial license is available. Open an
  issue titled "Commercial license" or contact
  [@vladpereverzyev](https://github.com/vladpereverzyev) on GitHub.

The name "Leviate" and its logo are not covered by the AGPL-3.0 and may not be used
for modified versions without permission.

Third-party components keep their own licenses. See [NOTICE](NOTICE) and
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
