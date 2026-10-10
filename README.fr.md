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

Déplacez les modèles 3D et la souris à main nue. Levez la main devant la webcam, ou
devant votre téléphone, et faites tourner, déplacez et zoomez un scan 3D sans rien toucher :
utile quand vos mains sont occupées, gantées ou pas propres. La main est suivie sur votre
appareil et la vidéo n'est jamais enregistrée ni envoyée.

**Essayez-le tout de suite dans le navigateur: <https://vladpereverzyev.github.io/leviate/>**

![Leviate dans le navigateur](docs/images/screenshot.png)

## Installer

| Où | Comment |
| --- | --- |
| **Navigateur** (ordinateur ou téléphone) | Rien à installer : ouvrez <https://vladpereverzyev.github.io/leviate/> |
| **Windows** | `leviate-<version>-windows-x64.exe` depuis la [dernière version](https://github.com/vladpereverzyev/leviate/releases/latest) |
| **macOS** (signé et notarié) | `-macos-arm64.dmg` (Apple silicon) ou `-macos-x64.dmg` (Intel) depuis la [dernière version](https://github.com/vladpereverzyev/leviate/releases/latest) |
| **Ubuntu** et Linux avec snap | [Snap Store](https://snapcraft.io/leviate) : `sudo snap install leviate` |
| **Linux** | `-linux-x64.AppImage` ou `-linux-x64.flatpak` depuis la [dernière version](https://github.com/vladpereverzyev/leviate/releases/latest) |
| **Chrome**, Edge | [Chrome Web Store](https://chromewebstore.google.com/detail/leviate/moipdbapejodmhhmhhngbcehcgngchlh) |
| **Blender** 4.2 ou plus récent | [Blender Extensions](https://extensions.blender.org/add-ons/leviate/), ou dans Blender **Get Extensions** et cherchez Leviate |
| **Dentra Viewer** | le panneau **Plugin** du Viewer, voir [integrations/dentra](integrations/dentra/) |

Tous les téléchargements, avec un guide pour chaque système: <https://vladpereverzyev.github.io/leviate/download.html>

## Gestes

![Les trois poses de la main : main ouverte fait tourner, poing déplace, pouce et index zooment](docs/images/gestures.png)

| Pose de la main | Vue 3D | Souris (Leviate for Desktop et Chrome) |
| --- | --- | --- |
| Main ouverte | **tourner** | **déplacer** le curseur |
| Poing | **déplacer** |  |
| Pouce et index | écartez pour **zoomer**, rapprochez pour **dézoomer** |  |
| Un doigt immobile |  | **clic gauche**, gardez-le immobile pour un **double clic** |
| Deux doigts immobiles |  | **clic droit** |

Les gants fonctionnent aussi, nitrile et latex de toutes les couleurs. **Ctrl+Alt+M** (Ctrl+Option+M sur macOS) coupe et rallume la main depuis n'importe quel programme dans Leviate for Desktop.

## Ce qu'il contient

- **Application web** : ouvre STL, PLY, OBJ, GLB, GLTF, 3MF, FBX et d'autres, plusieurs scans à la fois et en couleur, sur ordinateur ou téléphone. [Guide](docs/guide.md) (en anglais)
- **Votre téléphone comme webcam** : scannez un code QR, aucune app à installer. [Comment ça marche](docs/guide.md#use-your-phone-as-a-webcam)
- **Leviate for Desktop** : la main sur n'importe quel programme, avec un module **3D** pour votre programme 3D ou de CAO et un module **Souris**. [Guide](desktop/)
- **Leviate for Chrome** : les modes 3D et Souris dans les pages du navigateur. [Guide](integrations/chrome-extension/)
- **Leviate for Blender** : la vue ou les objets sélectionnés suivent votre main. [Guide](integrations/blender/)
- **Leviate for Dentra Viewer** : fait tourner, déplace et zoome les modèles du Viewer. [Guide](integrations/dentra/)

Comment il est fait, comment lancer votre propre copie et le compiler : [docs/development.md](docs/development.md) (en anglais).

## Pas un dispositif médical

Leviate est une visionneuse 3D. Ce n'est pas un dispositif médical et il n'est pas fait
pour le diagnostic, la planification de traitements ou toute autre décision clinique.
Vérifiez toujours les scans dans le logiciel approuvé pour cet usage.

## Confidentialité

Le flux vidéo et vos scans sont traités uniquement dans votre navigateur. Rien n'est
envoyé, aucun suivi et aucun compte. Les seuls services externes sont ceux de
**Use phone** (le broker PeerJS et un serveur STUN de Google), qui voient les détails de
connexion mais jamais la vidéo. Leviate for Chrome et le plugin pour Dentra gardent la vidéo
sur l'ordinateur de la même façon. Tous les détails dans la [politique de confidentialité](https://vladpereverzyev.github.io/leviate/privacy.html).

## Utilisation de l'IA

Des parties de Leviate, de son code, de sa documentation et de ses paquets pour les boutiques
d'applications (dont les fichiers Linux de `desktop/packaging/linux/` : l'entrée de bureau, le metainfo
AppStream et le manifeste Flatpak, ainsi que la recette du snap dans `snap/`) ont été écrites avec l'aide d'outils d'IA générative. Chaque
partie a été relue et testée par l'auteur, qui la maintient et en est responsable.

## Contribuer

Les issues et les pull requests sont les bienvenues. Lisez d'abord [CONTRIBUTING.md](CONTRIBUTING.md)
et le [Code de conduite](CODE_OF_CONDUCT.md). Chaque contribution nécessite le
[Contributor License Agreement](CLA.md) : le bot CLA Assistant vous demande de le signer avec
un commentaire sur votre première pull request. Les intégrations pour d'autres programmes de
CAO et 3D sont les plus bienvenues : voir [Bring Leviate to your CAD](docs/development.md#bring-leviate-to-your-cad).
Les problèmes de sécurité se signalent comme l'explique la [politique de sécurité](SECURITY.md),
pas dans une issue publique.

## Soutien

Si Leviate vous est utile vous pouvez soutenir son développement sur
[GitHub Sponsors](https://github.com/sponsors/vladpereverzyev) ou
[Ko-fi](https://ko-fi.com/vladpereverzyev).

## Licence

Copyright (C) 2026 Vladyslav Pereverzyev

Leviate est sous double licence.

- **Open source** : [GNU Affero General Public License v3.0](LICENSE). Vous pouvez
  l'utiliser, l'étudier, le modifier et le partager gratuitement. Si vous distribuez
  une version modifiée ou la proposez à des utilisateurs via un réseau vous devez
  publier votre code source sous la même licence.
- **Commerciale** : si vous voulez intégrer Leviate dans un produit ou un service à
  code fermé sans les obligations de l'AGPL, une licence commerciale est disponible.
  Ouvrez une issue intitulée "Commercial license" ou contactez
  [@vladpereverzyev](https://github.com/vladpereverzyev) sur GitHub.

Le nom "Leviate" et son logo ne sont pas couverts par l'AGPL-3.0 et ne peuvent pas être
utilisés pour des versions modifiées sans autorisation.

Les autres noms de produits et marques appartiennent à leurs propriétaires. Ils sont
utilisés uniquement pour indiquer avec quels logiciels Leviate fonctionne. Leviate n'est
ni affilié à aucun d'eux ni approuvé par eux.

Les intégrations dans `integrations/` ont leur propre fichier de licence. Leviate for
Blender est sous GPL-3.0-or-later, comme Blender le demande pour ses add-ons.

Les composants tiers gardent leurs propres licences. Voir [NOTICE](NOTICE) et
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
