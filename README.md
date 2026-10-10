# Leviate

[![Build & Release](https://github.com/vladpereverzyev/leviate/actions/workflows/build.yml/badge.svg)](https://github.com/vladpereverzyev/leviate/actions/workflows/build.yml)
[![Latest release](https://img.shields.io/github/v/release/vladpereverzyev/leviate?cacheSeconds=300)](https://github.com/vladpereverzyev/leviate/releases)
[![Snap Store](https://img.shields.io/snapcraft/v/leviate/latest/stable?label=snap)](https://snapcraft.io/leviate)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)

[![en](https://img.shields.io/badge/lang-en-red.svg)](https://github.com/vladpereverzyev/leviate/blob/main/README.md)
[![it](https://img.shields.io/badge/lang-it-green.svg)](https://github.com/vladpereverzyev/leviate/blob/main/README.it.md)
[![es](https://img.shields.io/badge/lang-es-yellow.svg)](https://github.com/vladpereverzyev/leviate/blob/main/README.es.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](https://github.com/vladpereverzyev/leviate/blob/main/README.fr.md)
[![de](https://img.shields.io/badge/lang-de-lightgrey.svg)](https://github.com/vladpereverzyev/leviate/blob/main/README.de.md)

Move 3D models and the mouse with your bare hand. Raise your hand in front of the webcam,
or of your phone, and turn, pan and zoom a 3D scan without touching anything: useful when
your hands are busy, gloved or not clean. The hand is tracked on your device and the video
is never recorded or sent anywhere.

**Try it now in the browser: <https://vladpereverzyev.github.io/leviate/>**

![Leviate in the browser](docs/images/screenshot.png)

## Install

| Where | How |
| --- | --- |
| **Browser** (computer or phone) | Nothing to install: open <https://vladpereverzyev.github.io/leviate/> |
| **Windows** | `leviate-<version>-windows-x64.exe` from the [latest release](https://github.com/vladpereverzyev/leviate/releases/latest) |
| **macOS** (signed and notarized) | `-macos-arm64.dmg` (Apple silicon) or `-macos-x64.dmg` (Intel) from the [latest release](https://github.com/vladpereverzyev/leviate/releases/latest) |
| **Ubuntu** and Linux with snap | [Snap Store](https://snapcraft.io/leviate): `sudo snap install leviate` |
| **Linux** | `-linux-x64.AppImage` or `-linux-x64.flatpak` from the [latest release](https://github.com/vladpereverzyev/leviate/releases/latest) |
| **Chrome**, Edge | [Chrome Web Store](https://chromewebstore.google.com/detail/leviate/moipdbapejodmhhmhhngbcehcgngchlh) |
| **Blender** 4.2 or later | [Blender Extensions](https://extensions.blender.org/add-ons/leviate/), or in Blender **Get Extensions** and search Leviate |
| **Dentra Viewer** | the **Plugin** panel of the Viewer, see [integrations/dentra](integrations/dentra/) |

All downloads, with a guide for each system: <https://vladpereverzyev.github.io/leviate/download.html>

## Gestures

![The three hand poses: open hand rotates, fist pans, thumb and index zoom](docs/images/gestures.png)

| Hand pose | 3D view | Mouse (Leviate for Desktop and Chrome) |
| --- | --- | --- |
| Open hand | **rotate** | **move** the cursor |
| Fist | **pan** | |
| Thumb and index | spread to **zoom in**, close to **zoom out** | |
| One finger held still | | **left click**, keep still for a **double click** |
| Two fingers held still | | **right click** |

Gloves work too, nitrile and latex in any color. **Ctrl+Alt+M** (Ctrl+Option+M on macOS) turns the hand off and on
from any program in Leviate for Desktop.

## What is in it

- **Web app**: opens STL, PLY, OBJ, GLB, GLTF, 3MF, FBX and more, several scans at once and
  in color, on a computer or a phone. [Guide](docs/guide.md)
- **Your phone as a webcam**: scan a QR code, no app to install.
  [How it works](docs/guide.md#use-your-phone-as-a-webcam)
- **Leviate for Desktop**: the hand on any program, with a **3D** module for your 3D or CAD
  program and a **Mouse** module. [Guide](desktop/)
- **Leviate for Chrome**: the 3D and Mouse modes inside the pages of the browser.
  [Guide](integrations/chrome-extension/)
- **Leviate for Blender**: the view or the selected objects follow your hand.
  [Guide](integrations/blender/)
- **Leviate for Dentra Viewer**: turns, pans and zooms the models of the Viewer.
  [Guide](integrations/dentra/)

How it is made, how to run your own copy and how to build it: [docs/development.md](docs/development.md).

## Not a medical device

Leviate is a 3D viewer. It is not a medical device and it is not meant for diagnosis,
treatment planning or any other clinical decision. Always check scans in the software
approved for that purpose.

## Privacy

The video stream and your scans are processed only inside your browser. Nothing is
uploaded, there is no tracking and no account. The only outside services are the ones of
**Use phone** (the PeerJS broker and a STUN server of Google), which see the connection
details but never the video. Leviate for Chrome and the Dentra plugin keep the video on the
computer in the same way. Full details in the [privacy policy](https://vladpereverzyev.github.io/leviate/privacy.html).

## Code signing policy

Windows: free code signing provided by [SignPath.io](https://about.signpath.io/), certificate by
[SignPath Foundation](https://signpath.org/). Only the installer built by the
[Build & Release](.github/workflows/build.yml) workflow of this repository from its source code
is signed, and every release is approved by hand before it is signed.

- Committers and reviewers: [Vladyslav Pereverzyev](https://github.com/vladpereverzyev)
- Approvers: [Vladyslav Pereverzyev](https://github.com/vladpereverzyev)

Privacy: this program will not transfer any information to other networked systems unless
specifically requested by the user or the person installing or operating it. **Use phone** goes
through the PeerJS broker and a STUN server of Google only when the user turns it on, and the check
for new versions asks GitHub and can be turned off in the settings. See the
[privacy policy](https://vladpereverzyev.github.io/leviate/privacy.html).

macOS: the dmg is signed with the Developer ID of the author and notarized by Apple. The copies
from the Mac App Store, the Microsoft Store and the Snap Store are signed by those stores.

## Use of AI

Parts of Leviate, its code, its documentation and its packaging for the app stores (among them
the Linux files in `desktop/packaging/linux/`: the desktop entry, the AppStream metainfo and the Flatpak
manifest, and the snap recipe in `snap/`), were written with the help of generative AI tools. Every part was reviewed, tried
and is maintained by the author, who is responsible for it.

## Contributing

Issues and pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md)
and the [Code of Conduct](CODE_OF_CONDUCT.md) first. Every contribution needs the
[Contributor License Agreement](CLA.md): the CLA Assistant bot asks you to sign it with one
comment on your first pull request. Integrations for other CAD and 3D programs are the most
welcome: see [Bring Leviate to your CAD](docs/development.md#bring-leviate-to-your-cad).
Security problems go to the [security policy](SECURITY.md), not to a public issue.

## Support

If Leviate is useful to you, you can support its development on
[GitHub Sponsors](https://github.com/sponsors/vladpereverzyev) or
[Ko-fi](https://ko-fi.com/vladpereverzyev).

## License

Copyright (C) 2026 Vladyslav Pereverzyev

Leviate is dual licensed.

- **Open source**: [GNU Affero General Public License v3.0](LICENSE). You can use,
  study, modify and share it for free. If you distribute a modified version or offer
  it to users over a network you must publish your source code under the same license.
- **Commercial**: if you want to include Leviate in a closed source product or a
  service without the AGPL obligations, a commercial license is available. Open an
  issue titled "Commercial license" or contact
  [@vladpereverzyev](https://github.com/vladpereverzyev) on GitHub.

The name "Leviate" and its logo are not covered by the AGPL-3.0 and may not be used
for modified versions without permission.

Other product names and trademarks belong to their owners. They are used only to say
which programs Leviate works with. Leviate is not affiliated with or endorsed by any of
them.

The integrations in `integrations/` carry their own license file. Leviate for Blender is
GPL-3.0-or-later, as Blender asks for its add-ons.

Third-party components keep their own licenses. See [NOTICE](NOTICE) and
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
