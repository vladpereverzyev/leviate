# Leviate

[![Build & Release](https://github.com/vladpereverzyev/leviate/actions/workflows/build.yml/badge.svg)](https://github.com/vladpereverzyev/leviate/actions/workflows/build.yml)
[![Latest release](https://img.shields.io/github/v/release/vladpereverzyev/leviate?cacheSeconds=300)](https://github.com/vladpereverzyev/leviate/releases)
[![Downloads](https://img.shields.io/github/downloads/vladpereverzyev/leviate/total?cacheSeconds=300)](https://github.com/vladpereverzyev/leviate/releases)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)

[![en](https://img.shields.io/badge/lang-en-red.svg)](https://github.com/vladpereverzyev/leviate/blob/main/README.md)
[![it](https://img.shields.io/badge/lang-it-green.svg)](https://github.com/vladpereverzyev/leviate/blob/main/README.it.md)
[![es](https://img.shields.io/badge/lang-es-yellow.svg)](https://github.com/vladpereverzyev/leviate/blob/main/README.es.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](https://github.com/vladpereverzyev/leviate/blob/main/README.fr.md)
[![de](https://img.shields.io/badge/lang-de-lightgrey.svg)](https://github.com/vladpereverzyev/leviate/blob/main/README.de.md)

**Essayez-le maintenant : <https://vladpereverzyev.github.io/leviate/>**

Déplacez des scans 3D à mains nues. Leviate est une application web qui transforme
n'importe quelle webcam, sur un ordinateur ou un téléphone, en manette à la main pour
modèles 3D. Ouvrez un scan, levez la main devant la caméra et faites-le tourner,
glisser ou zoomer sans rien toucher.

Tout tourne dans le navigateur sur le CPU. Aucune installation, aucun serveur, aucun
GPU nécessaire et vos fichiers ne quittent jamais votre appareil.

![Leviate dans un navigateur de bureau](docs/screenshot.png)

## Fonctions

- **Gestes de la main** : main ouverte pour tourner, poing pour déplacer, pouce et index
  pour zoomer.
- **N'importe quelle webcam** : intégrée ou USB sur un ordinateur, avant ou arrière sur
  un téléphone.
- **Votre téléphone comme webcam** : scannez un code QR avec un iPhone ou un Android et
  sa caméra diffuse vers l'ordinateur. Aucune application à installer.
- **Sortie caméra au choix** : appareil, résolution (480p, 720p, 1080p), images par
  seconde, caméra avant ou arrière et miroir. Le panneau montre ce que la caméra
  fournit vraiment.
- **De nombreux formats 3D** : STL, PLY, OBJ, GLB, GLTF, 3MF, FBX, DAE, 3DS, AMF, VTK,
  PCD et XYZ.
- **Plusieurs scans à la fois** : les fichiers chargés ensemble gardent leurs
  coordonnées d'origine, ainsi les arcades supérieure et inférieure ou les pièces d'un
  assemblage restent alignées.
- **Les scans gardent leurs couleurs** : couleurs par sommet et textures PLY, couleurs
  par sommet OBJ et OBJ avec MTL et images de texture.
- **Outils par objet** : couleur, afficher ou masquer, supprimer.
- **Fenêtres flottantes** : fichiers et webcam vivent dans des fenêtres séparées que
  vous pouvez déplacer et replier. Sur un téléphone elles s'empilent sous l'en-tête.
- **Outils de vue** : vues de face, de dessus, de gauche et de droite, fil de fer,
  plateau tournant, capture en PNG et plein écran.
- **Tourner autour de n'importe quel point** : clic molette (ou double clic, double
  toucher sur un téléphone) sur un point du modèle et chaque rotation tourne autour de
  lui. **Reset** revient au centre.
- **Souris et tactile** fonctionnent toujours à côté des gestes.
- **Blender et autres logiciels** : **Link app** envoie les gestes à Blender avec
  l'add-on Leviate, la main déplace alors la vue de Blender ou les objets sélectionnés.
- **Entièrement hors ligne** : toutes les bibliothèques et le modèle de la main sont
  dans le dépôt.

## Gestes

![Les trois poses de la main : la main ouverte tourne, le poing déplace, pouce et index zooment](docs/gestures.png)

Les dessins montrent les 21 points de la main que l'application suit et dessine sur
l'aperçu de la webcam, dans les mêmes couleurs que pour chaque geste.

| Pose de la main | Action |
| --- | --- |
| Main ouverte (quatre ou cinq doigts tendus) | Bougez la main pour **faire tourner** le modèle |
| Poing | Bougez la main pour **déplacer** le modèle dans l'espace |
| Pouce et index tendus, autres doigts fermés | Écartez les deux doigts pour **agrandir** et rapprochez-les pour **réduire** |

Le zoom mesure l'écart entre pouce et index par rapport à la taille de la paume, donc
approcher la main de la caméra ne zoome pas tout seul. Quand vous passez d'une pose à
une autre le modèle ne saute pas, car chaque geste repart de là où le précédent
s'est arrêté.

La sensibilité de chaque geste et le lissage se règlent dans la section **Gestures**
du panneau. Les réglages sont gardés dans le navigateur.

## Démarrage rapide

Ouvrez **<https://vladpereverzyev.github.io/leviate/>** dans Chrome, Edge, Safari ou
Firefox, chargez un ou plusieurs fichiers 3D et appuyez sur **Start** dans la fenêtre
Webcam. C'est tout : aucune installation, aucun compte. Après la première visite tout
ce dont l'application a besoin est déjà dans le navigateur.

### Sur un téléphone

<table>
<tr>
<td width="220"><img src="docs/screenshot-phone.png" alt="Leviate sur un téléphone" width="200"></td>
<td valign="middle">

Ouvrez le même lien sur le téléphone et tout y fonctionne aussi :

- **Fichiers** : choisissez des scans depuis l'app Fichiers, iCloud Drive ou Google Drive.
- **Gestes** : la caméra avant regarde votre main pendant que vous regardez l'écran.
- **Fenêtres** : Files et Webcam s'empilent sous l'en-tête et s'ouvrent une à la fois.
  Touchez un titre pour l'ouvrir ou la fermer.
- **Tactile** : glissez un doigt pour tourner, deux doigts pour déplacer, pincez pour
  zoomer.
- **Barre d'outils** : vues et outils restent en bas, à portée de doigt.

Pour utiliser le téléphone seulement comme caméra d'un ordinateur, voir
[Votre téléphone comme webcam](#votre-téléphone-comme-webcam).

</td>
</tr>
</table>

### Votre propre copie

Leviate est un site statique, n'importe quel serveur web peut donc l'héberger. Les
navigateurs ne chargent pas de modules JavaScript ni de WebAssembly depuis `file://`,
servez donc le dossier en HTTP :

```sh
git clone https://github.com/vladpereverzyev/leviate.git
cd leviate
python -m http.server 8000
```

Ouvrez ensuite l'adresse affichée par le serveur. Les téléphones ont besoin d'une
adresse `https` pour ouvrir la caméra, publiez donc votre copie sur un hébergement HTTPS
comme GitHub Pages, Netlify ou Cloudflare Pages.

## Votre téléphone comme webcam

N'importe quel iPhone ou Android peut servir de caméra à Leviate ouvert sur un
ordinateur. Rien à installer sur l'un ou l'autre.

<table>
<tr>
<td width="260"><img src="docs/phone-qr.png" alt="Fenêtre Webcam avec le code QR d'appairage" width="240"></td>
<td valign="middle">

1. Sur l'ordinateur ouvrez la fenêtre **Webcam** et appuyez sur **Use phone**.
   Un code QR apparaît dans l'aperçu.
2. Scannez-le avec la caméra du téléphone. Leviate s'ouvre dans Safari ou Chrome sur
   le téléphone.
3. Touchez **Start camera** et autorisez la caméra. Elle démarre avec la caméra avant ;
   **Flip** passe à la caméra arrière.
4. La vidéo du téléphone apparaît dans la fenêtre Webcam et les gestes fonctionnent
   comme avec une webcam normale.

</td>
</tr>
</table>

Gardez la page ouverte sur le téléphone pendant l'utilisation. Appuyez sur
**Disconnect phone** sur l'ordinateur ou **Stop** sur le téléphone pour terminer la
session. Un clic sur le code QR copie le lien d'appairage, pratique pour l'envoyer au
téléphone d'une autre façon.

Fonctionnement : les deux appareils se connectent avec WebRTC. Le serveur gratuit
[PeerJS](https://peerjs.com) ne fait que les présenter et transmettre les détails de
connexion ; la vidéo va directement du téléphone à l'ordinateur, chiffrée. Si les deux
sont sur des réseaux qui bloquent un lien direct, la vidéo passe par un serveur TURN de
PeerJS, toujours chiffrée. Le code QR pointe toujours vers une page `https`, car un
téléphone n'ouvre la caméra que là. Une copie qui tourne sur votre propre ordinateur
s'appaire via <https://vladpereverzyev.github.io/leviate/>.

## Dans Blender

Leviate peut aussi piloter Blender. Le suivi de la main reste dans le navigateur et
l'add-on **Leviate for Blender** reçoit les gestes. Rien à installer à part l'add-on.

1. Téléchargez `leviate-blender-<version>.zip` depuis la [dernière release](https://github.com/vladpereverzyev/leviate/releases/latest)
   et glissez-le dans Blender 4.2 ou plus récent.
2. Dans la vue 3D appuyez sur **N**, ouvrez l'onglet **Leviate** et appuyez sur
   **Wait for Leviate**.
3. Dans Leviate démarrez la caméra (ou **Use phone**) et appuyez sur **Link app**.

La main ouverte orbite, le poing déplace, le pincement zoome. Le panneau peut aussi
déplacer les objets sélectionnés au lieu de la vue. Tout reste sur l'ordinateur : la
page parle à Blender via `127.0.0.1` et n'envoie que les mouvements de la main. La
première fois Chrome ou Edge demande l'accès aux applications de cet appareil : appuyez
sur **Autoriser**. Safari ne le permet pas. Guide complet dans
[integrations/blender](integrations/blender/).

## Fichiers pris en charge

| Format | Couleurs | Remarques |
| --- | --- | --- |
| STL | une couleur de votre choix | les normales sont recalculées au chargement |
| PLY | couleurs par sommet ou texture | pour une texture chargez l'image avec le PLY (`comment TextureFile` dans l'en-tête) ; un PLY sans faces s'affiche comme nuage de points |
| OBJ | couleurs par sommet ou MTL avec textures | chargez le `.obj` avec son `.mtl` et ses images |
| GLB, GLTF | matériaux et textures propres | compression Draco et meshoptimizer prise en charge ; pour un `.gltf` ajoutez son `.bin` et ses images |
| 3MF | couleurs propres | |
| FBX, DAE, 3DS | matériaux et textures propres | ajoutez les images de texture avec le fichier |
| AMF | couleurs propres | |
| VTK, VTP | couleurs par sommet | |
| PCD, XYZ | couleurs des points | affichés comme nuages de points |

Sélectionnez ou déposez tous les fichiers d'un scan en même temps. S'il manque une
texture ou un fichier associé l'application vous dit lequel.

## Fonctionnement

1. **Caméra** : `getUserMedia` ouvre la webcam choisie avec la résolution et les images
   par seconde demandées.
2. **Suivi de la main** : [MediaPipe Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker)
   tourne en WebAssembly avec le délégué CPU (XNNPACK) et renvoie 21 points de la main
   pour chaque nouvelle image. Il tourne dans un Web Worker (`js/hand-worker.js`), la
   vue 3D ne l'attend donc jamais ; les navigateurs sans module workers reviennent au
   thread principal.
3. **Pose** : `js/gestures.js` vérifie quels doigts sont tendus en comparant la
   direction de chaque bout de doigt à la direction de la paume et en tire l'une des
   trois poses. Une pose doit rester stable quelques images avant de s'activer, ce qui
   supprime le scintillement.
4. **Mouvement** : le centre de la paume est lissé et son déplacement entre deux
   images devient rotation ou déplacement. Pour le zoom le rapport entre l'écart pouce
   index et la taille de la paume est suivi dans le temps.
5. **Rendu** : [three.js](https://threejs.org) dessine les scans avec WebGL. La rotation
   suit les axes de l'écran, donc bouger la main vers la droite tourne toujours le
   modèle vers la droite, quelle que soit la vue.

## Structure du projet

| Chemin | Rôle |
| --- | --- |
| `index.html` | Mise en page : scène, objets, webcam, gestes et panneaux de vue |
| `css/style.css` | Styles pour bureau et mobile |
| `js/app.js` | Scène, chargement des fichiers, caméra, boucle de suivi et interface |
| `js/gestures.js` | Classification des poses et mouvement (sans DOM, facile à tester) |
| `js/version.js` | Version actuelle, affichée dans l'application |
| `scripts/bump.mjs` | Monte la version (patch, minor ou major) |
| `js/hand-worker.js` | Suivi de la main dans un Web Worker, hors du thread principal |
| `js/phone.js` | Téléphone comme webcam : appairage par QR sur l'ordinateur, page caméra sur le téléphone |
| `js/windows.js` | Fenêtres flottantes : glisser, replier, mise en page téléphone |
| `js/link.js` | Link app : envoie les gestes à un logiciel sur cet ordinateur |
| `integrations/` | Add-ons pour d'autres logiciels (Blender) et le protocole qu'ils utilisent |
| `scripts/build-blender.py` | Crée le zip de l'add-on Blender |
| `vendor/three/` | three.js, ses chargeurs et décodeurs (MIT, Draco Apache-2.0) |
| `vendor/peerjs/`, `vendor/qrcode/` | Appairage WebRTC et générateur de codes QR (MIT) |
| `vendor/fonts/` | Police Jost (SIL OFL 1.1) |
| `docs/` | Captures, fenêtre QR et dessins des gestes utilisés dans ce README |
| `icons/`, `site.webmanifest` | Icônes de l'application pour navigateurs, iOS et Android |
| `vendor/mediapipe/` | MediaPipe Tasks Vision et son runtime WebAssembly (Apache-2.0) |
| `models/hand_landmarker.task` | Modèle de la main MediaPipe (Apache-2.0) |

## Versions

La version s'affiche à côté du nom dans l'application et se trouve dans
`js/version.js`. Elle suit le [versionnage sémantique](https://semver.org) et augmente
à chaque commit : le hook pre-commit dans `.githooks/` monte le numéro de patch
automatiquement. Activez-le une fois après le clonage :

```sh
git config core.hooksPath .githooks
```

Pour une version minor ou major lancez `node scripts/bump.mjs minor` (ou `major`) avant
le commit. Un tag `v<version>` lance le workflow Build & Release : il crée les zip des
intégrations et les publie comme unique release sur la
[page des releases](https://github.com/vladpereverzyev/leviate/releases). L'application
web n'est pas dans la release, elle tourne toujours depuis le lien en haut.

## Pas un dispositif médical

Leviate est une visionneuse 3D. Ce n'est pas un dispositif médical et il n'est pas fait
pour le diagnostic, la planification de traitements ou toute autre décision clinique.
Vérifiez toujours les scans dans le logiciel approuvé pour cet usage.

## Confidentialité

Le flux vidéo et vos scans sont traités uniquement dans votre navigateur. Rien n'est
envoyé, aucun suivi et aucun compte. Le seul service externe est le broker PeerJS
utilisé par **Use phone**, qui voit les détails de connexion mais jamais la vidéo.
**Link app** n'envoie que les mouvements de la main à un logiciel sur le même ordinateur.

## Contribuer

Issues et pull requests sont les bienvenues. Lisez d'abord
[CONTRIBUTING.md](CONTRIBUTING.md) et le [Code de conduite](CODE_OF_CONDUCT.md).
Chaque contribution nécessite le [Contributor License Agreement](CLA.md) : le bot CLA
Assistant vous demande de le signer avec un commentaire sur votre première pull request.

### Amenez Leviate dans votre CAO

Les intégrations pour d'autres logiciels de CAO et 3D sont la contribution la plus
attendue : FreeCAD, Rhino, Fusion, SolidWorks, Inventor, SketchUp, logiciels de CAO
dentaire avec une API ouverte et tout logiciel scriptable. Blender montre la voie. Les
règles pour les intégrations :

1. Un dossier par logiciel dans `integrations/<logiciel>/` avec source, README et LICENSE.
2. Le même protocole pour tous, décrit dans [integrations/README.md](integrations/README.md).
   Besoin de plus ? Ouvrez d'abord une issue.
3. Local uniquement : écoute sur `127.0.0.1`, seulement les pages Leviate, aucun suivi.
4. Légères : utilisez les scripts et le système d'add-ons du logiciel, évitez les
   installations en plus.
5. Licence : celle que demande le logiciel (les add-ons Blender sont GPL-3.0-or-later),
   sinon AGPL-3.0. Le CLA s'applique.
6. Nom : "Leviate for <Logiciel>", ni fait ni approuvé par l'éditeur du logiciel.
7. Le workflow Build & Release crée chaque intégration en zip et l'ajoute à la release.

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

Les intégrations dans `integrations/` ont leur propre fichier de licence. Leviate for
Blender est sous GPL-3.0-or-later, comme Blender le demande pour ses add-ons.

Les composants tiers gardent leurs propres licences. Voir [NOTICE](NOTICE) et
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
