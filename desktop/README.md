# Leviate for Desktop

The hand on any program of the computer, with the webcam or the phone. Choose a module in
**Hand controls**:

| Module | What the hand does |
| --- | --- |
| **3D** | The gestures of the web app in your 3D program: open hand turns, fist pans, pinch zooms the view under the cursor |
| **Mouse** | Open hand moves the cursor, one finger held still is a left click, two fingers held still a right click |
| **Off** | Only shows in the preview |

The hand starts **Off** every time the app opens.

<img src="../docs/screenshot-desktop.png" alt="Leviate for Desktop with the 3D module" width="300">

**Ctrl+Alt+M** (Ctrl+Option+M on macOS) turns the hand off from any program, and pressing it
again brings back the module you were using.

## Install

Download from the [download page](https://vladpereverzyev.github.io/leviate/download.html) or the
[latest release](https://github.com/vladpereverzyev/leviate/releases/latest):

| System | File |
| --- | --- |
| Windows 10 or 11 | `leviate-<version>-windows-x64.exe`, the installer |
| macOS, Apple silicon | `leviate-<version>-macos-arm64.dmg` |
| macOS, Intel | `leviate-<version>-macos-x64.dmg` |
| Linux | `leviate-<version>-linux-x64.AppImage`, make it executable and start it |

The app is not signed yet:

- **Windows** may say "Windows protected your PC": choose **More info** and **Run anyway**.
- **macOS** says the app cannot be opened: open **System Settings > Privacy & Security** and
  choose **Open Anyway**. For the Mouse and 3D modules allow Leviate in **Accessibility**
  too, macOS asks the first time.
- **Linux** needs an X11 session ("Xorg" on the login screen). Wayland does not let
  programs move the mouse, so there the hand only shows in the preview.

## 3D

1. Open your 3D program and put the cursor on its 3D view.
2. In Leviate choose **3D** and, under **Program mouse**, how that program uses the mouse.
3. Open hand turns, fist pans, pinch zooms.

| Program mouse | For example |
| --- | --- |
| Right turns · Left+right pans | Dental CAD programs, the default |
| Middle turns · Shift+middle pans | Blender, SketchUp |
| Middle turns · Ctrl+middle pans | SOLIDWORKS |
| Shift+middle turns · Middle pans | Fusion |
| Right turns · Middle pans | Many CAD programs |
| Right turns · Shift+right pans | Rhino |
| Left turns · Right pans | Leviate on the web, many viewers |
| Custom | Any button with Shift, Ctrl or Alt, for turning and for panning |

The gestures become mouse drags with those buttons, and the pinch becomes wheel steps.
Left+right holds both buttons together: the right one goes down first and up last, so the
left one never clicks alone.

- A new pose must last a fifth of a second before the mouse follows it, so a hand that
  changes pose for an instant never presses, lets go or moves the cursor.
- The buttons go down only once the hand has moved a few points, so a gesture held still
  never clicks and the right button never opens a menu.
- The cursor moves only by what the hand moves, from where it is. Programs that hold the
  cursor on one spot while they turn the view keep still when the hand is still.
- Each move of the hand is spread over small steps until the next frame of the camera, and
  the pinch goes out in parts of a wheel step on Windows, so turning and zooming flow even
  with a slow webcam.
- When a drag gets long the cursor lets go, jumps back to where it began and goes on, so
  it never leaves the 3D view.

**Turn**, **Pan** and **Zoom** set the speed; **Invert zoom** is for programs that zoom the
other way round.

## Mouse

![The Mouse poses: open hand moves the cursor, one finger held still clicks left, two fingers click right](../docs/mouse-gestures.png)

| Pose | What it does |
| --- | --- |
| Open hand | The cursor follows the palm |
| One finger (index), held still | Left click |
| Two fingers (index and middle), held still | Right click |
| Anything else, a fist for example | The cursor stays where it is |

While a finger pose is held a ring around the cursor fills up, and the click comes when it
is full (**Hold to click**, 1 second by default). Move the finger and it starts again. The
cursor stops as soon as the hand closes, so the click lands where the palm left it.
**Hand reach** is the part of the camera picture that covers the screen. To stop, press
**Ctrl+Alt+M**, choose **Off** or lower the hand.

These finger poses belong to the desktop app only; the web app and Blender keep open hand,
fist and pinch.

## Camera

The window works like the webcam window of the web app: **Start** in the preview turns the
webcam on (**Camera** picks another one and mirrors it), **Use phone** shows a QR code: scan it
and tap **Start camera** on the phone, no app needed. Every window and section opens and
closes like on the web, and stays as you left it. The hand tracking keeps running while
Leviate is minimized or behind your program.

## Updates

When a new version is out, Leviate says so at the top of the window when it starts:
**Update** downloads the file for this computer from the
[releases](https://github.com/vladpereverzyev/leviate/releases), with a bar that shows how far
it is, and opens it. On Windows the installer runs without its windows, replaces Leviate and
starts it again (Windows asks for permission when Leviate is installed for all users), on macOS the dmg opens in Finder (drag Leviate to Applications
again), on Linux the new AppImage takes the place of the old one and Leviate restarts.
**Later** asks again at the next start. **Check for new versions at start**, in the Settings
section, turns the check off. Versions older than 1.3.19 do not check yet.

## Privacy

There is no cookie banner: the program stores only its own settings on this computer, the
system asks for the camera, and the video is read on this computer and never recorded or
sent. The connections out are the check for new versions, which asks GitHub for the
latest release when the app starts (it can be turned off), and **Phone**: the free PeerJS
server introduces the phone and the computer and sees their IP addresses, never the video.
Leviate explains this once, before the first pairing. Details in the
[privacy policy](https://vladpereverzyev.github.io/leviate/privacy.html#desktop).

## Build

The app is [Electron](https://www.electronjs.org). It uses the files of the web app as they
are, served through the `app://` scheme: `shared/js/hand-worker.js` (MediaPipe hand tracking),
`shared/js/gestures.js` (the 3D gestures), `shared/js/phone.js` (phone pairing), `web/vendor/` and
`shared/models/`. Nothing of the web app or of Leviate for Blender is changed.

```sh
cd desktop
npm ci
npm start                              # run it from the repository
cd ..
node scripts/build-desktop.mjs         # installer for this system in dist/desktop/
```

The Build & Release workflow builds Windows, macOS and Linux on every version tag. The
version comes from `shared/js/version.js`, like the other downloads.

| File | What it does |
| --- | --- |
| `main.js` | Window, `app://` files, mouse drags and clicks, the ring, permissions |
| `update.js` | New versions: asks GitHub for the latest release, downloads and opens it |
| `mouse.js` | Mouse, wheel and Shift, Ctrl, Alt on Windows, macOS and Linux (X11), through koffi |
| `preload.js` | What the window may ask of the app |
| `renderer/control.html`, `control.css`, `control.js` | The window, camera, phone and hand tracking |
| `renderer/control3d.js` | 3D module: gestures to drags and wheel steps, program mouse schemes |
| `renderer/pointer.js` | Mouse module: finger poses, palm to screen, hold to click |
| `renderer/ring.html` | The ring around the cursor |
| `renderer/no-banner.js` | Tells the shared phone code that the desktop app needs no cookie banner |

## License

AGPL-3.0, like the rest of Leviate. Program names are trademarks of their owners; Leviate
is not made or endorsed by them.
