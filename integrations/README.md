# Integrations

Leviate does the hand tracking in the browser. With **Link app** it also sends every
gesture to a program on the same computer, so the hand can move the view or the
objects of a CAD or 3D program. An integration is the small piece that receives the
gestures inside that program.

| Program | Folder | Status |
| --- | --- | --- |
| Blender 4.2 or later | [`blender/`](blender/) | Available, zip in the [latest release](https://github.com/vladpereverzyev/leviate/releases/latest) |

Your program is not in the list? Build its integration. The protocol below is all
it needs and the rules make sure every integration works the same way.

## Contribution policy for integrations

Integrations for other CAD and 3D programs are welcome: FreeCAD, Rhino, Fusion,
SolidWorks, Inventor, SketchUp, Meshmixer, dental CAD software with an open API and
any other program that can be scripted.

1. **One folder per program**: `integrations/<program>/` with the source, a README
   (install, use, tested versions) and its LICENSE.
2. **Same protocol for everyone**: use the messages described below as they are. If a
   program needs something more, open an issue first, so the protocol stays one.
3. **Local only**: listen on `127.0.0.1`, accept only the pages listed below, no
   telemetry and no data sent anywhere else. The video and the 3D files never reach
   an integration.
4. **Light**: use what the program already offers (its scripting language and add-on
   system) and avoid extra installs. New dependencies must have a permissive or
   GPL compatible license and go in [THIRD-PARTY-NOTICES.md](../THIRD-PARTY-NOTICES.md).
5. **License**: an integration takes the license its program asks for (Blender add-ons
   are GPL-3.0-or-later), otherwise AGPL-3.0 like the rest of Leviate. Every
   contribution needs the [Contributor License Agreement](../CLA.md).
6. **Name**: call it "Leviate for <Program>". The Leviate name and logo may be used for
   integrations in this repository; other distributions need permission.
7. **Releases**: each integration is built as one zip and attached to the release by
   the Build & Release workflow. The pull request adds its build step.
8. **Not endorsed**: program names are trademarks of their owners. Say in the README
   that the integration is not made or endorsed by them.

## Protocol

Version 1.

**Transport**: WebSocket on `ws://127.0.0.1:47800`. The program is the server, the
Leviate page is the client. The port can be changed on both sides (Link app section in
Leviate). Every text frame carries one JSON object.

**Pages allowed**: the program must check the `Origin` header of the handshake and
accept only `https://vladpereverzyev.github.io`, `http://localhost` and
`http://127.0.0.1` (any port), plus addresses the user adds for a copy of their own.
Everything else gets `403`, so another web site open in the browser cannot move the
program.

**Browsers**: Chrome and Edge let the public `https` page open `ws://127.0.0.1` only
after the user allows access to apps on this device (the `loopback-network` permission,
`local-network-access` in older versions). They ask the first time; if the user said no,
Leviate explains how to allow it in the site settings. Safari blocks it.

### Messages from Leviate

```json
{ "type": "hello", "app": "leviate", "version": "1.3.0", "protocol": 1 }
```

Sent once after the connection opens.

```json
{ "type": "motion", "mode": "rotate", "rotate": [0.012, -0.004, 0], "pan": [0, 0], "zoom": 1 }
```

Sent for every camera frame with a gesture (15 to 60 per second).

| Field | Meaning |
| --- | --- |
| `mode` | `rotate`, `pan`, `zoom` or `none`. `none` comes once when a gesture ends: a good moment to close an undo step |
| `rotate` | Turn of the **model** in radians around the view axes: x to the right, y up, z toward the viewer. The values are small, apply them as a rotation vector |
| `pan` | Move of the **model** along the view x and y axes, in heights of the visible view (1 = the full height of the view at the pivot) |
| `zoom` | Scale factor of the **model**: above 1 it gets bigger, below 1 smaller |

All values already include the sensitivity chosen in Leviate. They describe how the
model moves on screen: to move a camera or a view instead, apply the inverse (turn the
view by the opposite angle around its pivot, move it the opposite way, divide its
distance by `zoom`). If the program updates slower than the messages arrive, add the
rotations and pans up and multiply the zooms.

### Messages to Leviate

```json
{ "type": "hello", "app": "blender", "version": "4.5.3", "protocol": 1 }
```

Send it when a page connects. Leviate shows the program name and version in its Link
app section.

## Try a new integration

1. Start the integration in its program.
2. Open <https://vladpereverzyev.github.io/leviate/>, start the camera and press
   **Link app**.
3. Open hand, fist and pinch should move the program the same way they move the
   model in Leviate.
