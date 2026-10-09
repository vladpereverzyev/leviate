# Leviate for Dentra Viewer

A plugin for [Dentra Viewer](https://dentra.it): the hand in front of the webcam turns,
pans and zooms the models, with the gestures of the Leviate web app.

- **Open hand** turns the models.
- **Fist** pans them.
- **Thumb and index** zoom: spread to zoom in, close to zoom out.

Nitrile and latex gloves work too, as in the other Leviate apps.

## Use

1. In Dentra Viewer open the **Plugin** panel and turn on **Leviate**. Dentra shows what
   it asks for: the view and the camera.
2. Press **Start** in the panel of Leviate and allow the camera.
3. Raise your hand in front of the camera. The preview shows the hand points and the
   gesture Leviate sees. **Mirror** flips the preview and the left and right moves.

The texts follow the language of the Viewer: English, Italian, Spanish, French and German.

## How it works

The Viewer opens the camera and sends its pictures to the plugin. MediaPipe finds the
hand inside the plugin, on the CPU, with the same model and the same gesture rules as the
web app (`shared/js/gestures.js` and `shared/js/gloves.js`). Only the moves of the view go
back to the Viewer, through `DentraViewer.view.move`. The video is never recorded or sent
anywhere and the plugin cannot reach the internet: it does not ask for it.

| Permission | Why |
| --- | --- |
| `view` | To turn, pan and zoom the models |
| `camera` | To see the hand |

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
