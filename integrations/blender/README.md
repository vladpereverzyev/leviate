# Leviate for Blender

Move the Blender 3D view, or the selected objects, with your bare hands. The webcam and
the hand tracking run inside Blender: no browser, no other program, nothing to set up
besides the add-on. It uses the same MediaPipe hand model and the same gestures as the
[Leviate web app](https://vladpereverzyev.github.io/leviate/).

Works with Blender 4.2 or later on Windows (x64), macOS (Apple Silicon) and Linux (x64).

## Install

1. Download the zip for your system from the
   [latest release](https://github.com/vladpereverzyev/leviate/releases/latest):
   - Windows: `leviate-blender-<version>-windows-x64.zip`
   - macOS: `leviate-blender-<version>-macos-arm64.zip`
   - Linux: `leviate-blender-<version>-linux-x64.zip`
2. Drag the zip into the Blender window, or open **Edit > Preferences > Get Extensions**,
   the arrow menu at the top right and **Install from Disk**.
3. Blender asks to allow the camera: the add-on reads the webcam only while it is on and
   never records it. On macOS the system also asks once to let Blender use the camera.

## Use

1. In the 3D view press **N** and open the **Leviate** tab.
2. Press **Start camera**. A small preview with your hand points appears in the bottom
   left corner of the 3D view.
3. Raise your hand in front of the camera:

| Hand | Blender |
| --- | --- |
| Open hand, move it | Rotate |
| Fist, move it | Pan |
| Thumb and index, spread or close | Zoom in or out |

**Move** chooses what the hand moves:

- **View**: the 3D view orbits, pans and zooms. The scene does not change.
- **Selected objects**: the selected objects turn, move and scale around their center.
  Every gesture is one undo step.

## Settings

- **Camera**: 1 is the default webcam, 2 and up are the others. **Resolution**: 480p is
  enough and faster, 720p is sharper.
- **Mirror**: the preview works like a mirror, so moving the hand right moves the model
  right.
- **Show camera**: shows or hides the preview.
- **Rotate**, **Pan**, **Zoom**: how much Blender follows the hand. **Smooth**: more is
  calmer, less is quicker.

If the panel says the camera is not found, close other programs that use it (video
calls, the Leviate web app) and press **Start camera** again, or try another number.

## How it works

`tracker.py` reads the camera with OpenCV and runs MediaPipe Hand Landmarker on the CPU
in a background thread, so Blender never waits for it. `gestures.py` turns the 21 hand
points into open hand, fist or pinch with the same rules as the web app. A Blender
timer applies the moves 60 times a second and draws the preview. The video never leaves
Blender and nothing is recorded.

The zips carry the Python wheels of MediaPipe, OpenCV, absl-py and flatbuffers (all
Apache-2.0) and the MediaPipe hand model. Blender installs them for the add-on.

## License

GPL-3.0-or-later, see [LICENSE](LICENSE). Blender is a trademark of the Blender
Foundation; this add-on is not made or endorsed by the Blender Foundation.
