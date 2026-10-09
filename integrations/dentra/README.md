# Leviate for Dentra Viewer

A plugin for [Dentra Viewer](https://dentra.it): the hand in front of the webcam, or of your
phone, turns, pans and zooms the models, with the gestures of the Leviate web app.

- **Open hand** turns the models.
- **Fist** pans them.
- **Thumb and index** zoom: spread to zoom in, close to zoom out.

Nitrile and latex gloves work too, as in the other Leviate apps.

## Use

1. In Dentra Viewer open the **Plugin** panel and turn on **Leviate**. Dentra shows what
   it asks for: the view, the camera, the internet (only for the phone) and the clipboard
   (only for the links at the bottom).
2. Press **Start** and allow the camera. Or press **Use phone** and scan the QR code with
   your phone: it opens the Leviate page made for the phone, no app needed. Connect the
   phone and the computer to the same Wi-Fi network.
3. Raise your hand in front of the camera. The preview shows the hand points and the
   gesture Leviate sees. **Reset the view** puts the models back as they were.

Under **Camera**: the size of the pictures (480 to 1280 pixels), 15 or 30 frames a second
and **Mirror**, which flips the preview and the left and right moves. Under **Gestures**:
the speed of turn, pan and zoom, how smooth the moves are and **Invert zoom**. The Viewer
keeps the settings on your device.

The texts follow the language of the Viewer: English, Italian, Spanish, French and German.

## How it works

The Viewer opens the camera and sends its pictures to the plugin; with **Use phone** the
pictures come from the phone through WebRTC, paired as in the other Leviate apps. MediaPipe
finds the hand inside the plugin, on the CPU, with the same model and the same gesture rules
as the web app (`shared/js/gestures.js` and `shared/js/gloves.js`). Only the moves of the
view go back to the Viewer, through `DentraViewer.view.move`. The video is never recorded
or sent anywhere.

| Permission | Why |
| --- | --- |
| `view` | To turn, pan and zoom the models |
| `camera` | To see the hand |
| `internet` | Only for **Use phone**: the free PeerJS server and a STUN server of Google connect the phone. Nothing else goes out |
| `clipboard` | The links at the bottom of the panel are copied, because the Viewer opens no tabs from a plugin: paste them in a new tab |

## Build

```
node scripts/build-dentra.mjs
```

Puts the plugin together in `dist/dentra/` and packs `dist/leviate-dentra-<version>.zip`,
the zip uploaded in the Developer area of Dentra. The version is in
`dentra-plugin.json` and is raised only when the plugin changes.

## License

AGPL-3.0, like the rest of Leviate. Dentra is a trademark of its owner: Leviate for
Dentra Viewer is not made or endorsed by Dentra.
