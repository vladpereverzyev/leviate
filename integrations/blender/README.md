# Leviate for Blender

Move the Blender 3D view, or the selected objects, with your bare hands. The webcam (or
your phone through a QR code) and the hand tracking run inside Blender: no browser on the
computer, no app on the phone, nothing to set up besides the add-on. It uses the same
MediaPipe hand model and the same gestures as the [Leviate web app](https://vladpereverzyev.github.io/leviate/).

Works with Blender 4.2 or later, Blender 5 included, on Windows (x64), macOS (Apple
Silicon) and Linux (x64).

## Install

1. Download the zip for your system from the
   [latest release](https://github.com/vladpereverzyev/leviate/releases/latest):
   - Windows: `leviate-blender-<version>-windows-x64.zip`
   - macOS: `leviate-blender-<version>-macos-arm64.zip`
   - Linux: `leviate-blender-<version>-linux-x64.zip`
2. Drag the zip into the Blender window, or open **Edit > Preferences > Get Extensions**,
   the arrow menu at the top right and **Install from Disk**.
3. Blender asks to allow the camera, the network and the clipboard: the add-on reads the
   webcam only while it is on and never records it, the network and the clipboard serve
   only the phone. On macOS the system also asks once to let Blender use the camera.

## Use

1. In the 3D view press **N** and open the **Leviate** tab.
2. Choose the camera: **This computer** for a webcam, **Phone** for your phone.
3. Press **Start camera**. A small preview with your hand points appears in the bottom
   left corner of the 3D view.
4. Raise your hand in front of the camera:

| Hand | Blender |
| --- | --- |
| Open hand, move it | Rotate |
| Fist, move it | Pan |
| Thumb and index, spread or close | Zoom in or out |

**Move** chooses what the hand moves:

- **View**: the 3D view orbits, pans and zooms. The scene does not change.
- **Selected objects**: the selected objects turn, move and scale around their center.
  Every gesture is one undo step.

## Phone as the camera

With **Phone** selected, **Start camera** shows a QR code in the bottom left corner of the
3D view.

1. Scan it with the phone camera. It opens the Leviate page made for the phone, in the
   browser, with nothing to install.
2. Allow the camera on the phone and tap **Start camera**.
3. The QR code turns into the preview and the hand moves Blender as with a webcam.
   **Flip** on the phone switches to the rear camera, **Stop** ends the link and the QR
   code comes back for the next time.

**Copy link** in the panel copies the same link, to open it on the phone another way.
The phone needs **Allow Online Access** in Blender (**Edit > Preferences > System >
Network**), because the [PeerJS](https://peerjs.com/) server brings phone and Blender
together. That server sees the IP addresses, never the video: the video goes straight
from the phone to Blender, encrypted and never recorded. If phone and computer can
not reach each other directly, the video passes encrypted through the PeerJS relay.

## Settings

- **Camera** (webcam only): 1 is the default webcam, 2 and up are the others. **Resolution**: 480p is
  enough and faster, 720p is sharper.
- **Mirror** (webcam only): the preview works like a mirror, so moving the hand right
  moves the model right. With the phone the mirror follows the camera in use: on for the
  front camera, off for the rear one.
- **Show camera**: shows or hides the preview.
- **Rotate**, **Pan**, **Zoom**: how much Blender follows the hand. **Smooth**: more is
  calmer, less is quicker.

If the panel says the camera is not found, close other programs that use it (video
calls, the Leviate web app) and press **Start camera** again, or try another number.

## How it works

`tracker.py` reads the webcam with OpenCV and runs MediaPipe Hand Landmarker on the CPU
in a background thread, so Blender never waits for it. `gestures.py` turns the 21 hand
points into open hand, fist or pinch with the same rules as the web app. A Blender
timer applies the moves 60 times a second and draws the preview. The video never leaves
Blender and nothing is recorded.

`phone.py` joins the PeerJS server with a random id, answers the call of the phone page
with [aiortc](https://github.com/aiortc/aiortc) (WebRTC in Python) and hands the decoded
frames to the tracker, scaled to 640 pixels on the longer side.

The zips carry the Python wheels of MediaPipe, OpenCV, absl-py and flatbuffers for the
hand tracking, aiortc with its dependencies, websockets and qrcode for the phone. They also
carry the MediaPipe hand model. Blender installs them for the add-on. The licenses are listed in
[THIRD-PARTY.md](leviate/THIRD-PARTY.md).

## License

GPL-3.0-or-later, see [LICENSE](LICENSE). Blender is a trademark of the Blender
Foundation; this add-on is not made or endorsed by the Blender Foundation.
