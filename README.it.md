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

**Provalo subito: <https://vladpereverzyev.github.io/leviate/>**

Muovi le scansioni 3D a mani nude. Leviate è un'app web che trasforma qualsiasi webcam,
su un computer o su un telefono, in un controller a mano per modelli 3D. Apri una
scansione, alza la mano davanti alla camera e ruotala, spostala o ingrandiscila senza
toccare niente.

Tutto gira nel browser sulla CPU. Niente da installare, nessun server, nessuna GPU
richiesta e i tuoi file non lasciano mai il dispositivo.

![Leviate in un browser desktop](docs/screenshot.png)

## Funzioni

- **Gesti della mano**: mano aperta per ruotare, pugno per spostare, pollice e indice
  per lo zoom.
- **Qualsiasi webcam**: integrata o USB sul computer, anteriore o posteriore sul telefono.
- **Il telefono come webcam**: inquadri un codice QR con un iPhone o un Android e la sua
  camera trasmette al computer. Nessuna app da installare.
- **Uscita della camera a scelta**: dispositivo, risoluzione (480p, 720p, 1080p),
  fotogrammi al secondo, camera anteriore o posteriore e specchio. Il pannello mostra
  quello che la camera fornisce davvero.
- **Tanti formati 3D**: STL, PLY, OBJ, GLB, GLTF, 3MF, FBX, DAE, 3DS, AMF, VTK, PCD e XYZ.
- **Più scansioni insieme**: i file caricati insieme tengono le coordinate originali,
  così arcata superiore e inferiore o le parti di un assieme restano allineate.
- **Le scansioni restano a colori**: colori per vertice e texture dei PLY, colori per
  vertice degli OBJ e OBJ con MTL e immagini delle texture.
- **Strumenti per ogni oggetto**: colore, mostra o nascondi, rimuovi.
- **Finestre mobili**: file e webcam stanno in finestre separate che puoi spostare
  e chiudere. Sul telefono si impilano sotto l'intestazione.
- **Strumenti di vista**: viste frontale, dall'alto, sinistra e destra, wireframe,
  piatto rotante, screenshot in PNG e schermo intero.
- **Ruota intorno a qualsiasi punto**: clic con la rotellina (o doppio clic, doppio tocco
  sul telefono) su un punto del modello e ogni rotazione gira intorno a quel punto.
  **Reset** torna al centro.
- **Mouse e touch** funzionano sempre accanto ai gesti.
- **Blender**: l'add-on Leviate for Blender porta lo stesso controllo con la mano dentro
  Blender, con la sua camera. La mano muove la vista o gli oggetti selezionati.
- **Completamente offline**: tutte le librerie e il modello della mano sono nel repository.

## Gesti

![Le tre pose della mano: la mano aperta ruota, il pugno sposta, pollice e indice fanno lo zoom](docs/gestures.png)

I disegni mostrano i 21 punti della mano che l'app segue e disegna sopra l'anteprima
della webcam, negli stessi colori che usa per ogni gesto.

| Posa della mano | Azione |
| --- | --- |
| Mano aperta (quattro o cinque dita fuori) | Muovi la mano per **ruotare** il modello |
| Pugno | Muovi la mano per **spostare** il modello nello spazio |
| Pollice e indice fuori, le altre dita chiuse | Apri le due dita per **ingrandire** e chiudile per **rimpicciolire** |

Lo zoom misura la distanza tra pollice e indice rispetto alla grandezza del palmo,
quindi avvicinare la mano alla camera non fa zoom da solo. Quando passi da una posa
all'altra il modello non salta, perché ogni gesto riparte da dove si era fermato
il precedente.

La sensibilità di ogni gesto e la quantità di smussatura si regolano nella sezione
**Gestures** del pannello. Le impostazioni restano salvate nel browser.

## Per iniziare

Apri **<https://vladpereverzyev.github.io/leviate/>** in Chrome, Edge, Safari o Firefox,
carica uno o più file 3D e premi **Start** nella finestra Webcam. Tutto qui: niente da
installare, nessun account. Dopo la prima visita tutto quello che serve all'app è già
nel browser.

### Sul telefono

<table>
<tr>
<td width="220"><img src="docs/screenshot-phone.png" alt="Leviate su un telefono" width="200"></td>
<td valign="middle">

Apri lo stesso link sul telefono e funziona tutto anche lì:

- **File**: scegli le scansioni dall'app File, da iCloud Drive o da Google Drive.
- **Gesti**: la camera anteriore guarda la tua mano mentre guardi lo schermo.
- **Finestre**: Files e Webcam si impilano sotto l'intestazione e se ne apre una alla
  volta. Tocca un titolo per aprirla o chiuderla.
- **Touch**: trascina con un dito per ruotare, con due dita per spostare, pizzica
  per lo zoom.
- **Barra degli strumenti**: viste e strumenti restano in basso, a un tocco.

Per usare il telefono solo come camera di un computer, vedi
[Usa il telefono come webcam](#usa-il-telefono-come-webcam).

</td>
</tr>
</table>

### Una copia tutta tua

Leviate è un sito statico, quindi qualsiasi server web lo può ospitare. I browser non
caricano moduli JavaScript o WebAssembly da `file://`, quindi servi la cartella in HTTP:

```sh
git clone https://github.com/vladpereverzyev/leviate.git
cd leviate
python -m http.server 8000
```

Poi apri l'indirizzo che stampa il server. I telefoni hanno bisogno di un indirizzo
`https` per aprire la camera, quindi pubblica la tua copia su un hosting HTTPS come
GitHub Pages, Netlify o Cloudflare Pages.

## Usa il telefono come webcam

Qualsiasi iPhone o Android può fare da camera a Leviate aperto su un computer.
Niente da installare su nessuno dei due.

<table>
<tr>
<td width="260"><img src="docs/phone-qr.png" alt="Finestra Webcam con il codice QR per collegare il telefono" width="240"></td>
<td valign="middle">

1. Sul computer apri la finestra **Webcam** e premi **Use phone**.
   Nell'anteprima compare un codice QR.
2. Inquadralo con la camera del telefono. Leviate si apre in Safari o Chrome sul telefono.
3. Tocca **Start camera** e consenti la camera. Parte con la camera anteriore;
   **Flip** passa a quella posteriore.
4. Il video del telefono compare nella finestra Webcam e i gesti funzionano come con
   una webcam normale.

</td>
</tr>
</table>

Tieni aperta la pagina sul telefono mentre lo usi. Premi **Disconnect phone** sul
computer o **Stop** sul telefono per chiudere la sessione. Un clic sul codice QR copia
il link di collegamento, comodo quando vuoi mandarlo al telefono in un altro modo.

Come funziona: i due dispositivi si collegano con WebRTC. Il server gratuito
[PeerJS](https://peerjs.com) li presenta soltanto e passa i dati di connessione; il
video va dritto dal telefono al computer, cifrato. Se entrambi sono su reti che
bloccano il collegamento diretto, il video passa da un server TURN di PeerJS, sempre
cifrato. Il codice QR punta sempre a una pagina `https`, perché un telefono apre la
camera solo lì. Una copia che gira sul tuo computer si collega attraverso
<https://vladpereverzyev.github.io/leviate/>.

## Usalo in Blender

**Leviate for Blender** porta il controllo con la mano dentro Blender: la webcam e il
tracciamento della mano girano in Blender stesso, senza browser.

1. Scarica lo zip per il tuo sistema dall'[ultima release](https://github.com/vladpereverzyev/leviate/releases/latest):
   `leviate-blender-<versione>-windows-x64.zip`, `-macos-arm64.zip` o `-linux-x64.zip`.
   Trascinalo in Blender 4.2 o successivo.
2. Nella vista 3D premi **N**, apri la scheda **Leviate** e premi **Start camera**.
3. La mano aperta ruota, il pugno sposta, il pizzico fa lo zoom. **Move** sceglie la vista
   o gli oggetti selezionati.

Nell'angolo della vista 3D compare una piccola anteprima della camera con i punti della
mano. Il video resta in Blender e non viene mai registrato né inviato. Guida completa in
[integrations/blender](integrations/blender/).

## File supportati

| Formato | Colori | Note |
| --- | --- | --- |
| STL | un colore a tua scelta | le normali vengono ricostruite al caricamento |
| PLY | colori per vertice o texture | per una texture carica l'immagine insieme al PLY (`comment TextureFile` nell'intestazione); un PLY senza facce si vede come nuvola di punti |
| OBJ | colori per vertice o MTL con texture | carica l'`.obj` insieme al suo `.mtl` e alle immagini |
| GLB, GLTF | materiali e texture propri | compressione Draco e meshoptimizer supportata; per i `.gltf` aggiungi il `.bin` e le immagini |
| 3MF | colori propri | |
| FBX, DAE, 3DS | materiali e texture propri | aggiungi le immagini delle texture al file |
| AMF | colori propri | |
| VTK, VTP | colori per vertice | |
| PCD, XYZ | colori dei punti | si vedono come nuvole di punti |

Seleziona o trascina tutti i file di una scansione nello stesso momento. Se manca una
texture o un file collegato l'app ti dice quale.

## Come funziona

1. **Camera**: `getUserMedia` apre la webcam scelta con la risoluzione e i fotogrammi
   al secondo richiesti.
2. **Tracciamento della mano**: [MediaPipe Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker)
   gira in WebAssembly con il delegato CPU (XNNPACK) e restituisce 21 punti della mano
   per ogni nuovo fotogramma. Gira in un Web Worker (`js/hand-worker.js`), così la vista
   3D non lo aspetta mai; i browser senza module worker ripiegano sul thread principale.
3. **Posa**: `js/gestures.js` controlla quali dita sono distese confrontando la
   direzione di ogni punta con la direzione del palmo e ne ricava una delle tre pose.
   Una posa deve restare stabile per qualche fotogramma prima di attivarsi, così non
   sfarfalla.
4. **Movimento**: il centro del palmo viene smussato e il suo spostamento tra un
   fotogramma e l'altro diventa rotazione o spostamento. Per lo zoom si segue nel
   tempo il rapporto tra la distanza pollice indice e la grandezza del palmo.
5. **Rendering**: [three.js](https://threejs.org) disegna le scansioni con WebGL.
   La rotazione segue gli assi dello schermo, quindi muovere la mano a destra gira
   sempre il modello a destra, qualunque sia la vista.

## Struttura del progetto

| Percorso | A cosa serve |
| --- | --- |
| `index.html` | Layout: scena, oggetti, webcam, gesti e pannelli di vista |
| `css/style.css` | Stili per desktop e telefono |
| `js/app.js` | Scena, caricamento dei file, camera, ciclo di tracciamento e interfaccia |
| `js/gestures.js` | Riconoscimento delle pose e movimento (niente DOM, facile da testare) |
| `js/version.js` | Versione attuale, mostrata nell'app |
| `scripts/bump.mjs` | Alza la versione (patch, minor o major) |
| `js/hand-worker.js` | Tracciamento della mano in un Web Worker, fuori dal thread principale |
| `js/phone.js` | Telefono come webcam: collegamento con QR sul computer, pagina camera sul telefono |
| `js/windows.js` | Finestre mobili: trascinamento, chiusura, layout per telefono |
| `integrations/` | Add-on che portano il controllo con la mano dentro altri programmi (Blender) |
| `scripts/build-blender.py` | Crea lo zip dell'add-on per Blender |
| `vendor/three/` | three.js, i suoi loader e decoder (MIT, Draco Apache-2.0) |
| `vendor/peerjs/`, `vendor/qrcode/` | Collegamento WebRTC e generatore di codici QR (MIT) |
| `vendor/fonts/` | Font Jost (SIL OFL 1.1) |
| `docs/` | Screenshot, finestra QR e disegni dei gesti usati in questo README |
| `icons/`, `site.webmanifest` | Icone dell'app per browser, iOS e Android |
| `vendor/mediapipe/` | MediaPipe Tasks Vision e il suo runtime WebAssembly (Apache-2.0) |
| `models/hand_landmarker.task` | Modello della mano di MediaPipe (Apache-2.0) |

## Versioni

La versione si vede accanto al nome nell'app e sta in `js/version.js`. Segue il
[versionamento semantico](https://semver.org) e cresce a ogni commit: l'hook
pre-commit in `.githooks/` alza da solo il numero di patch. Attivalo una volta dopo
il clone:

```sh
git config core.hooksPath .githooks
```

Per una release minor o major lancia `node scripts/bump.mjs minor` (o `major`) prima
del commit. Un tag `v<versione>` avvia il workflow Build & Release: crea gli zip delle
integrazioni e li pubblica in una nuova release nella
[pagina delle release](https://github.com/vladpereverzyev/leviate/releases). L'app web
non è nella release, gira sempre dal link in cima.

## Non è un dispositivo medico

Leviate è un visualizzatore 3D. Non è un dispositivo medico e non serve per diagnosi,
pianificazione dei trattamenti o qualsiasi altra decisione clinica. Controlla sempre
le scansioni nel software approvato per quello scopo.

## Privacy

Il flusso video e le tue scansioni vengono elaborati solo dentro il browser. Non viene
caricato niente, nessun tracciamento e nessun account. L'unico servizio esterno è il
broker PeerJS usato da **Use phone**, che vede i dati di connessione ma mai il video.

## Contribuire

Issue e pull request sono benvenute. Leggi prima [CONTRIBUTING.md](CONTRIBUTING.md)
e il [Codice di condotta](CODE_OF_CONDUCT.md). Ogni contributo richiede il
[Contributor License Agreement](CLA.md): il bot CLA Assistant ti chiede di firmarlo
con un commento sulla tua prima pull request.

### Porta Leviate nel tuo CAD

Le integrazioni per altri programmi CAD e 3D sono il contributo più gradito: FreeCAD,
Rhino, Fusion, SolidWorks, Inventor, SketchUp, software CAD dentale con un'API aperta e
qualsiasi programma che si possa programmare con script. Blender apre la strada. Le
regole per le integrazioni:

1. Una cartella per programma in `integrations/<programma>/` con sorgente, README e LICENSE.
2. Gli stessi gesti ovunque: riusa il tracciamento della mano di Leviate for Blender
   (`gestures.py` e il modello MediaPipe), vedi [integrations/README.md](integrations/README.md).
3. Solo in locale: la camera viene letta sul computer, niente registrato o inviato, nessun tracciamento.
4. Leggere: usa gli script e il sistema di add-on del programma, evita installazioni in più.
5. Licenza: quella che chiede il programma (gli add-on di Blender sono GPL-3.0-or-later),
   altrimenti AGPL-3.0. Vale il CLA.
6. Nome: "Leviate for <Programma>", non fatto né approvato dal proprietario del programma.
7. Ogni integrazione viene creata come zip dal workflow Build & Release e allegata alla
   release.

## Supporto

Se Leviate ti è utile puoi sostenerne lo sviluppo su
[GitHub Sponsors](https://github.com/sponsors/vladpereverzyev) o
[Ko-fi](https://ko-fi.com/vladpereverzyev).

## Licenza

Copyright (C) 2026 Vladyslav Pereverzyev

Leviate ha una doppia licenza.

- **Open source**: [GNU Affero General Public License v3.0](LICENSE). Puoi usarlo,
  studiarlo, modificarlo e condividerlo gratis. Se distribuisci una versione modificata
  o la offri ad altri attraverso una rete devi pubblicare il tuo codice sorgente con la
  stessa licenza.
- **Commerciale**: se vuoi includere Leviate in un prodotto o servizio a codice chiuso
  senza gli obblighi della AGPL, è disponibile una licenza commerciale. Apri una issue
  con titolo "Commercial license" o contatta
  [@vladpereverzyev](https://github.com/vladpereverzyev) su GitHub.

Il nome "Leviate" e il suo logo non sono coperti dalla AGPL-3.0 e non si possono usare
per versioni modificate senza permesso.

Le integrazioni in `integrations/` hanno il loro file di licenza. Leviate for Blender è
GPL-3.0-or-later, come Blender chiede per i suoi add-on.

I componenti di terze parti mantengono le loro licenze. Vedi [NOTICE](NOTICE) e
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
