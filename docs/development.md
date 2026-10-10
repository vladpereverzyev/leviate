# Developing Leviate

How Leviate is built, how the repository is organized and how a new version is released.
To contribute, read [CONTRIBUTING.md](../CONTRIBUTING.md) first.

## Run your own copy

Leviate is a static site, so any web server can host it. Browsers do not load
JavaScript modules or WebAssembly from `file://`, so put the site together and serve it over HTTP:

```sh
git clone https://github.com/vladpereverzyev/leviate.git
cd leviate
node scripts/build-web.mjs
python -m http.server 8000 --directory dist/web
```

Then open the address the server prints. Phones need an `https` address to open the
camera, so publish your copy on an HTTPS host such as GitHub Pages, Netlify or
Cloudflare Pages.

Leviate for Desktop:

```sh
cd desktop && npm ci && cd ..
node scripts/build-desktop.mjs --dir
```

## How it works

1. **Camera**: `getUserMedia` opens the selected webcam with the requested
   resolution and frame rate.
2. **Hand tracking**: [MediaPipe Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker)
   runs as WebAssembly with the CPU delegate (XNNPACK) and returns 21 landmarks of
   the hand for every new video frame. It runs in a Web Worker (`shared/js/hand-worker.js`),
   so the 3D view never waits for it; browsers without module workers fall back to
   the main thread.
3. **Pose**: `shared/js/gestures.js` checks which fingers are extended by comparing the
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
| `web/` | The website only: pages, styles, the web app, three.js, icons, images, sitemap |
| `web/index.html` | Layout: stage, objects, webcam, gestures and view panels |
| `web/css/style.css` | Desktop and mobile styles |
| `web/js/app.js` | Scene, file loading, camera, tracking loop and UI |
| `web/js/windows.js` | Floating windows: drag, collapse, phone layout |
| `web/vendor/three/` | three.js, its loaders and decoders (MIT, Draco Apache-2.0) |
| `web/icons/`, `web/site.webmanifest` | App icons for browsers, iOS and Android |
| `web/img/` | Images of the site: gesture drawings, screenshot, social share image |
| `shared/` | What the website, the desktop app and the integrations share: hand tracking, gestures, phone pairing, MediaPipe, PeerJS, fonts, hand model, version |
| `shared/js/gestures.js` | Hand pose classification and motion (no DOM, easy to test) |
| `shared/js/version.js` | Current version, shown in the app |
| `shared/js/hand-worker.js` | Hand tracking in a Web Worker, off the main thread |
| `shared/js/phone.js` | Phone as webcam: QR pairing on the computer, camera page on the phone |
| `shared/vendor/` | MediaPipe, PeerJS, the QR code reader and generator and the Jost font, with their licenses |
| `shared/models/hand_landmarker.task` | MediaPipe hand model (Apache-2.0) |
| `desktop/` | Leviate for Desktop (Electron): the hand on any program, 3D and Mouse modules |
| `desktop/packaging/` | What the stores and the systems need: `mac/` (Developer ID entitlements), `mas/` (Mac App Store), `appx/` (Microsoft Store tiles), `linux/` (desktop entry, AppStream metainfo, Flatpak manifest) |
| `snap/` | The snap recipe for the Snap Store |
| `integrations/` | Add-ons that bring the hand control inside other programs (Blender, Chrome, Dentra Viewer) |
| `docs/` | This documentation; `docs/images/` holds the pictures of the READMEs, `docs/screenshots/` the screenshots of the stores |
| `scripts/build-web.mjs` | Puts `web/` and `shared/` together in `dist/web/`, published on GitHub Pages by `.github/workflows/pages.yml` |
| `scripts/build-desktop.mjs` | Builds the desktop app for Windows, macOS or Linux, and the store packages |
| `scripts/build-chrome.mjs`, `scripts/build-dentra.mjs`, `scripts/build-blender.py` | Pack the Chrome extension, the Dentra Viewer plugin and the Blender add-on into zips |
| `scripts/check.mjs` | Checks the syntax of every JavaScript file, run on every push |
| `scripts/bump.mjs` | Raises the version (patch, minor or major) |

## Versions

The version is shown next to the name in the app and lives in `shared/js/version.js`.
It follows [semantic versioning](https://semver.org). The pre-commit hook in `.githooks/`
raises the patch number on every commit; enable it once after cloning:

```sh
git config core.hooksPath .githooks
```

Each new version gets a few lines in [CHANGELOG.md](../CHANGELOG.md), which become the "What is new" of
the release notes (the release stops when they are missing), and a `<release>` entry in
the AppStream metainfo (`desktop/packaging/linux/`). For a minor or major release run `node scripts/bump.mjs minor` (or `major`) before
committing. A tag `v<version>` starts the Build & Release workflow: it builds every
download, publishes them as a new release on the
[releases page](https://github.com/vladpereverzyev/leviate/releases) and sends the snap to
the Snap Store. The web app is not in the release: it is published on every push to `main`.

## Bring Leviate to your CAD

Integrations for other CAD and 3D programs are the most welcome contribution: FreeCAD,
Rhino, Fusion, SolidWorks, Inventor, SketchUp, dental CAD software with an open API and
any program that can be scripted. Blender shows the way. The policy for integrations:

1. One folder per program in `integrations/<program>/` with source, README and LICENSE.
2. The same gestures everywhere: reuse the hand tracking of Leviate for Blender
   (`gestures.py` and the MediaPipe model), see [integrations/README.md](../integrations/README.md).
3. Local only: the camera is read on the computer, nothing is recorded or sent, no telemetry.
4. Light: use the program's own scripting and add-on system, avoid extra installs.
5. License: what the program asks for (Blender add-ons are GPL-3.0-or-later), otherwise
   AGPL-3.0. The CLA applies.
6. Name: "Leviate for <Program>", not made or endorsed by the program's owner.
7. Each integration is built as a zip by the Build & Release workflow and attached to the
   release.
