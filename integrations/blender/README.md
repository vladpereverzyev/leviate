# Leviate for Blender

Move the Blender 3D view, or the selected objects, with your bare hands. The hand
tracking runs in the [Leviate web app](https://vladpereverzyev.github.io/leviate/) with
any webcam or your phone; this add-on receives the gestures inside Blender.

Works with Blender 4.2 or later on Windows, macOS and Linux.

## Install

1. Download `leviate-blender-<version>.zip` from the
   [latest release](https://github.com/vladpereverzyev/leviate/releases/latest).
2. Drag the zip into the Blender window, or open **Edit > Preferences > Get Extensions**,
   the arrow menu at the top right and **Install from Disk**.
3. Blender asks to allow network access: the add-on only listens on `127.0.0.1`,
   on this computer.

## Use

1. In the 3D view press **N** and open the **Leviate** tab.
2. Press **Wait for Leviate**.
3. Open <https://vladpereverzyev.github.io/leviate/> in Chrome, Edge or Firefox, press
   **Start** in the Webcam window (or **Use phone**) and then **Link app**.
   The first time Chrome or Edge asks to reach apps on this device: press **Allow**.
   If you pressed Block, click the icon left of the address, open **Site settings** and
   allow it, then press **Link app** again.
4. The panel shows **Linked to Leviate**. Now the gestures move Blender:

| Hand | Blender |
| --- | --- |
| Open hand, move it | Orbit |
| Fist, move it | Pan |
| Thumb and index, spread or close | Zoom in or out |

**Move** in the panel chooses what the hand moves:

- **View**: the 3D view orbits, pans and zooms. The scene does not change.
- **Selected objects**: the selected objects turn, move and scale around their center.
  Every gesture is one undo step.

**Rotate**, **Pan** and **Zoom** set how much Blender follows the hand, on top of the
sensitivity set in Leviate.

## Settings

In **Edit > Preferences > Add-ons > Leviate**:

- **Port**: 47800 by default. If you change it, set the same port in the Link app
  section of Leviate.
- **Wait for Leviate when Blender opens**: starts the link with Blender.
- **Extra pages**: addresses of your own Leviate copies allowed to connect.
  `https://vladpereverzyev.github.io`, `http://localhost` and `http://127.0.0.1` are
  always allowed. Any other web site is refused.

## How it works

The add-on runs a small WebSocket server on `127.0.0.1` written with the Python
standard library, nothing else to install. Leviate sends the motion of each gesture as
JSON; a Blender timer applies it 60 times a second. The camera video and your files
never reach Blender. The messages are described in [../README.md](../README.md).

## License

GPL-3.0-or-later, see [LICENSE](LICENSE). Blender is a trademark of the Blender
Foundation; this add-on is not made or endorsed by the Blender Foundation.
