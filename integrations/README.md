# Integrations

Integrations bring the Leviate hand control inside other programs. Each one runs the
webcam and the hand tracking in the program itself, with the same MediaPipe model and
the same gesture rules as the Leviate web app, so the hand behaves the same everywhere.

| Program | Folder | Status |
| --- | --- | --- |
| Blender 4.2 or later | [`blender/`](blender/) | Available, zips in the [latest release](https://github.com/vladpereverzyev/leviate/releases/latest) |

Your program is not in the list? Build its integration. The pieces below are all it
needs and the rules make sure every integration works the same way.

## Contribution policy for integrations

Integrations for other CAD and 3D programs are welcome: FreeCAD, Rhino, Fusion,
SolidWorks, Inventor, SketchUp, dental CAD software with an open API and any other
program that can be scripted.

1. **One folder per program**: `integrations/<program>/` with the source, a README
   (install, use, tested versions) and its LICENSE.
2. **Same gestures everywhere**: reuse the hand tracking of Leviate for Blender, described
   below. Gesture changes go first in `web/js/gestures.js` and then in every port.
3. **Local only**: the camera is read on the computer, nothing is recorded or sent
   anywhere, no telemetry.
4. **Light**: use what the program already offers (its scripting language and add-on
   system) and avoid extra installs. New dependencies must have a permissive or GPL
   compatible license and go in [THIRD-PARTY-NOTICES.md](../THIRD-PARTY-NOTICES.md).
5. **License**: an integration takes the license its program asks for (Blender add-ons
   are GPL-3.0-or-later), otherwise AGPL-3.0 like the rest of Leviate. Every
   contribution needs the [Contributor License Agreement](../CLA.md).
6. **Name**: call it "Leviate for <Program>". The Leviate name and logo may be used for
   integrations in this repository; other distributions need permission.
7. **Releases**: each integration is built as zips and attached to the release by the
   Build & Release workflow. The pull request adds its build step.
8. **Not endorsed**: program names are trademarks of their owners. Say in the README
   that the integration is not made or endorsed by them.

## The shared pieces

Leviate for Blender is written in Python with no Blender code outside `__init__.py`,
so a Python based program can take these files as they are:

| File | What it does |
| --- | --- |
| `blender/leviate/gestures.py` | Open hand, fist and pinch from the 21 hand points. A line by line port of `web/js/gestures.js`, tested to give the same results |
| `blender/leviate/tracker.py` | Reads the camera with OpenCV, runs MediaPipe Hand Landmarker on the CPU in a thread and queues the moves |
| `web/models/hand_landmarker.task` | The MediaPipe hand model (Apache-2.0) |

The Python wheels are MediaPipe, OpenCV (headless), absl-py and flatbuffers; numpy is
usually already there. See `scripts/build-blender.py` for the exact versions.

### Moves

`tracker.py` queues one move per camera frame: `(mode, dx, dy, zoom, aspect)`.

| Field | Meaning |
| --- | --- |
| `mode` | `rotate`, `pan`, `zoom` or `none`. `none` after a gesture is a good moment to close an undo step |
| `dx`, `dy` | Move of the palm since the last frame, in image widths and heights, x to the right and y down on screen, mirror already applied |
| `zoom` | Scale factor for this frame: above 1 the model gets bigger |
| `aspect` | Width over height of the camera image |

Leviate for Blender turns them into model motion like the web app does: rotation of
`dy * rotate` around the view x axis and `dx * rotate` around the view y axis (radians,
`rotate` is 5 by default), pan of `dx * pan * view aspect` and `-dy * pan` view heights,
zoom of `zoom ** zoom_speed`. To move a camera or a view instead of objects, apply the
inverse.
