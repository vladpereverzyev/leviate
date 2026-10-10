# Leviate for Chrome

The hand control of Leviate for Desktop inside Chrome, with the webcam or your phone.
Two modes, as in the desktop app:

- **3D**: open hand turns, fist pans, pinch zooms the 3D viewer under the mouse in the
  page, with the mouse buttons the viewer uses (left button turns, right button pans in
  most viewers on the web; SketchUp, SOLIDWORKS, Fusion, Rhino, Blender or your own
  buttons under **Viewer**).
- **Mouse**: open hand moves a blue cursor in the page, one finger held still is a left
  click (keep holding for a double click), two fingers a right click.

Works in Chrome 116 or later and in browsers built on it (Edge, Brave, Opera) on
Windows, macOS, Linux and ChromeOS.

## Install

Install it from the [Chrome Web Store](https://chromewebstore.google.com/detail/leviate/moipdbapejodmhhmhhngbcehcgngchlh) and pin Leviate to the toolbar with the
puzzle icon.

To load it by hand instead (a version not yet on the store, or to try a change):

1. Download `leviate-chrome-<version>.zip` from the
   [latest release](https://github.com/vladpereverzyev/leviate/releases/latest) and unzip it.
2. Open `chrome://extensions`, turn on **Developer mode** (top right) and press **Load
   unpacked**. Choose the unzipped folder.
3. Pin Leviate to the toolbar with the puzzle icon.

## Use

1. Click the Leviate icon: the side panel opens.
2. Press **Start**. The first time Chrome asks for the camera in a tab of its own: choose
   **Allow** and the tab closes by itself. Or press **Use phone** and scan the QR code
   with your phone. Connect the phone and the computer to the same Wi-Fi network.
3. Choose **3D** or **Mouse**. For 3D put the mouse on the 3D view of the page first.
4. **Alt+Shift+M** turns the hand on or off from any page. You can change the keys in
   `chrome://extensions/shortcuts`.

While the hand is on, Chrome shows a bar saying that Leviate started debugging the tab:
that is how an extension can press real mouse buttons in a page. Closing the bar or
choosing **Off** gives the tab back. The hand works on the active tab and follows you
when you switch tabs. Chrome keeps its own pages (`chrome://`) and the Chrome Web Store
closed to every extension, so the hand does not work there. Closing the side panel stops
the camera and the hand.

## Privacy

The video is read by the hand tracking inside the extension, frame by frame, and is never
recorded or sent anywhere. The extension has no accounts, no analytics and no advertising.
Only **Use phone** goes through the PeerJS server and a STUN server of Google to connect
the two devices, as the [privacy policy](https://vladpereverzyev.github.io/leviate/privacy.html#chrome)
explains.

Permissions it asks for:

| Permission | Why |
| --- | --- |
| `debugger` | To press the mouse buttons, move the pointer and turn the wheel in the active tab |
| `sidePanel` | The panel with the camera and the settings |
| `storage` | To remember the settings on this computer |

## Build

```
node scripts/build-chrome.mjs
```

Puts the extension together in `dist/chrome-extension/` (load it unpacked to try it) and
packs `dist/leviate-chrome-<version>.zip` for the Chrome Web Store. It takes the files of
this folder, the shared hand tracking in `shared/` and the 3D and Mouse modules of
Leviate for Desktop (`desktop/renderer/`). The version is the one of the apps.

## License

AGPL-3.0, like the rest of Leviate. Chrome is a trademark of Google LLC: Leviate for
Chrome is not made or endorsed by Google.
