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

**Pruébalo ahora: <https://vladpereverzyev.github.io/leviate/>**

Mueve escaneos 3D con las manos desnudas. Leviate es una app web que convierte cualquier
webcam, en un ordenador o en un teléfono, en un mando de mano para modelos 3D. Abre un
escaneo, levanta la mano delante de la cámara y gíralo, desplázalo o amplíalo sin tocar
nada.

Todo funciona en el navegador sobre la CPU. Sin instalación, sin servidor, sin GPU
y tus archivos nunca salen de tu dispositivo.

![Leviate en un navegador de escritorio](web/docs/screenshot.png)

## Funciones

- **Gestos de la mano**: mano abierta para girar, puño para desplazar, pulgar e índice
  para el zoom.
- **Cualquier webcam**: integrada o USB en el ordenador, frontal o trasera en el teléfono.
- **Tu teléfono como webcam**: escanea un código QR con un iPhone o un Android y su
  cámara transmite al ordenador. Sin apps que instalar.
- **Salida de cámara a tu gusto**: dispositivo, resolución (480p, 720p, 1080p),
  fotogramas por segundo, cámara frontal o trasera y espejo. El panel muestra lo que
  la cámara entrega de verdad.
- **Muchos formatos 3D**: STL, PLY, OBJ, GLB, GLTF, 3MF, FBX, DAE, 3DS, AMF, VTK, PCD y XYZ.
- **Varios escaneos a la vez**: los archivos cargados juntos mantienen sus coordenadas
  originales, así las arcadas superior e inferior o las piezas de un conjunto quedan
  alineadas.
- **Los escaneos conservan el color**: colores por vértice y texturas de PLY, colores
  por vértice de OBJ y OBJ con MTL e imágenes de textura.
- **Herramientas por objeto**: color, mostrar u ocultar, eliminar.
- **Ventanas flotantes**: archivos y webcam viven en ventanas separadas que puedes mover
  y plegar. En el teléfono se apilan bajo la cabecera.
- **Herramientas de vista**: vistas frontal, superior, izquierda y derecha, malla,
  plato giratorio, captura en PNG y pantalla completa.
- **Gira alrededor de cualquier punto**: clic central (o doble clic, doble toque en el
  teléfono) sobre un punto del modelo y cada rotación gira alrededor de él.
  **Reset** vuelve al centro.
- **Ratón y táctil** siguen funcionando junto a los gestos.
- **Blender**: el add-on Leviate for Blender lleva el mismo control con la mano dentro
  de Blender, con la webcam o con el teléfono. La mano mueve la vista o los objetos seleccionados.
- **Totalmente sin conexión**: todas las librerías y el modelo de la mano están en el
  repositorio.

## Gestos

![Las tres posturas de la mano: la mano abierta gira, el puño desplaza, pulgar e índice hacen zoom](web/docs/gestures.png)

Los dibujos muestran los 21 puntos de la mano que la app sigue y dibuja sobre la vista
previa de la webcam, con los mismos colores que usa para cada gesto.

| Postura de la mano | Acción |
| --- | --- |
| Mano abierta (cuatro o cinco dedos fuera) | Mueve la mano para **girar** el modelo |
| Puño | Mueve la mano para **desplazar** el modelo en el espacio |
| Pulgar e índice fuera, los demás dedos cerrados | Separa los dos dedos para **acercar** y júntalos para **alejar** |

El zoom mide la distancia entre pulgar e índice respecto al tamaño de la palma, así que
acercar la mano a la cámara no hace zoom por sí solo. Al pasar de una postura a otra el
modelo no salta, porque cada gesto empieza donde se detuvo el anterior.

La sensibilidad de cada gesto y el suavizado se ajustan en la sección **Gestures** del
panel. Los ajustes se guardan en el navegador.

## Inicio rápido

Abre **<https://vladpereverzyev.github.io/leviate/>** en Chrome, Edge, Safari o Firefox,
carga uno o más archivos 3D y pulsa **Start** en la ventana Webcam. Eso es todo: sin
instalación, sin cuenta. Después de la primera visita todo lo que la app necesita ya
está en el navegador.

### En un teléfono

<table>
<tr>
<td width="220"><img src="web/docs/screenshot-phone.png" alt="Leviate en un teléfono" width="200"></td>
<td valign="middle">

Abre el mismo enlace en el teléfono y todo funciona también allí:

- **Archivos**: elige escaneos desde la app Archivos, iCloud Drive o Google Drive.
- **Gestos**: la cámara frontal observa tu mano mientras miras la pantalla.
- **Ventanas**: Files y Webcam se apilan bajo la cabecera y se abre una a la vez.
  Toca un título para abrirla o cerrarla.
- **Táctil**: arrastra con un dedo para girar, con dos dedos para desplazar, pellizca
  para el zoom.
- **Barra de herramientas**: vistas y herramientas quedan abajo, a un toque.

Para usar el teléfono solo como cámara de un ordenador, mira
[Usa tu teléfono como webcam](#usa-tu-teléfono-como-webcam).

</td>
</tr>
</table>

### Tu propia copia

Leviate es un sitio estático, así que cualquier servidor web puede alojarlo. Los
navegadores no cargan módulos JavaScript ni WebAssembly desde `file://`, así que sirve
la carpeta por HTTP:

```sh
git clone https://github.com/vladpereverzyev/leviate.git
cd leviate/web
python -m http.server 8000
```

Luego abre la dirección que muestra el servidor. Los teléfonos necesitan una dirección
`https` para abrir la cámara, así que publica tu copia en un alojamiento HTTPS como
GitHub Pages, Netlify o Cloudflare Pages.

## Usa tu teléfono como webcam

Cualquier iPhone o Android puede ser la cámara de Leviate abierto en un ordenador.
Nada que instalar en ninguno de los dos.

<table>
<tr>
<td width="260"><img src="web/docs/phone-qr.png" alt="Ventana Webcam con el código QR para emparejar" width="240"></td>
<td valign="middle">

1. En el ordenador abre la ventana **Webcam** y pulsa **Use phone**.
   Aparece un código QR en la vista previa.
2. Escanéalo con la cámara del teléfono. Leviate se abre en Safari o Chrome en el teléfono.
3. Toca **Start camera** y permite la cámara. Empieza con la cámara frontal;
   **Flip** cambia a la trasera.
4. El vídeo del teléfono aparece en la ventana Webcam y los gestos funcionan como con
   una webcam normal.

</td>
</tr>
</table>

Mantén la página abierta en el teléfono mientras lo usas. Pulsa **Disconnect phone** en
el ordenador para terminar la sesión. **Stop** en el teléfono la pone en pausa: el
ordenador vuelve a mostrar el mismo código QR y **Start camera** en el teléfono vuelve a
conectar, sin escanearlo de nuevo. Si se pierde la conexión y el ordenador muestra un
código nuevo, **Scan QR code** en la página del teléfono lo lee ahí mismo. Un clic en el
código QR copia el enlace de emparejamiento, útil cuando quieres mandarlo al teléfono de
otra forma.

Cómo funciona: los dos dispositivos se conectan con WebRTC. El servidor gratuito
[PeerJS](https://peerjs.com) solo los presenta y pasa los datos de conexión; el vídeo va
directo del teléfono al ordenador, cifrado. Si los dos están en redes que bloquean un
enlace directo, el vídeo pasa por un servidor TURN de PeerJS, siempre cifrado. El código
QR siempre apunta a una página `https`, porque un teléfono solo abre la cámara allí. Una
copia que funciona en tu propio ordenador se empareja a través de
<https://vladpereverzyev.github.io/leviate/>.

## Úsalo en Blender

**Leviate for Blender** lleva el control con la mano dentro de Blender: la webcam y el
seguimiento de la mano funcionan en Blender mismo, sin navegador.

1. Descarga el zip para tu sistema de la [última release](https://github.com/vladpereverzyev/leviate/releases/latest):
   `leviate-blender-<versión>-windows-x64.zip`, `-macos-arm64.zip` o `-linux-x64.zip`.
   Arrástralo a Blender 4.2 o posterior.
2. En la vista 3D pulsa **N** y abre la pestaña **Leviate**. Elige **This computer** para
   la webcam o **Phone**, luego pulsa **Start camera**. Con **Phone** aparece un código QR:
   escanéalo y toca **Start camera** en el teléfono, sin instalar apps.
3. La mano abierta gira, el puño desplaza, el pellizco hace zoom. **Move** elige la vista
   o los objetos seleccionados.

En la esquina de la vista 3D aparece una pequeña vista previa de la cámara con los puntos
de la mano. El vídeo nunca se graba: la webcam se queda en Blender, el teléfono envía su
vídeo directamente a Blender. Guía completa en
[integrations/blender](integrations/blender/).

## Leviate for Desktop

**Leviate for Desktop** lleva la mano a cualquier programa del ordenador, con la webcam o el
móvil (código QR, como en la app web). Tiene dos módulos:

- **3D**: los gestos de la app web en tu programa 3D. La mano abierta gira, el puño desplaza,
  el pellizco hace zoom en la vista bajo el cursor. Elige cómo usa el ratón ese programa
  (*Right turns · Left+right pans* por defecto, el de los programas CAD dentales, o por
  ejemplo *Middle turns · Shift+middle pans* para Blender) o define tú los botones.
- **Mouse**: la mano abierta mueve el cursor, un dedo quieto un momento hace clic izquierdo,
  dos dedos quietos hacen clic derecho.

![Las poses del módulo Mouse: mano abierta mueve el cursor, un dedo quieto hace clic izquierdo, dos dedos clic derecho](web/docs/mouse-gestures.png)

Descárgala de la [última versión](https://github.com/vladpereverzyev/leviate/releases/latest): `leviate-<versión>-windows-x64.exe`,
`-macos-arm64.dmg` (Apple silicon), `-macos-x64.dmg` (Intel) o `-linux-x64.AppImage`.
Guía completa en [apps/desktop](apps/desktop/) (en inglés).

## Archivos compatibles

| Formato | Colores | Notas |
| --- | --- | --- |
| STL | un color que eliges tú | las normales se reconstruyen al cargar |
| PLY | colores por vértice o textura | para una textura carga la imagen con el PLY (`comment TextureFile` en la cabecera); un PLY sin caras se muestra como nube de puntos |
| OBJ | colores por vértice o MTL con texturas | carga el `.obj` junto con su `.mtl` y sus imágenes |
| GLB, GLTF | materiales y texturas propios | compresión Draco y meshoptimizer compatible; para `.gltf` añade su `.bin` y sus imágenes |
| 3MF | colores propios | |
| FBX, DAE, 3DS | materiales y texturas propios | añade las imágenes de textura con el archivo |
| AMF | colores propios | |
| VTK, VTP | colores por vértice | |
| PCD, XYZ | colores de los puntos | se muestran como nubes de puntos |

Selecciona o arrastra todos los archivos de un escaneo a la vez. Si falta una textura o
un archivo asociado la app te dice cuál.

## Cómo funciona

1. **Cámara**: `getUserMedia` abre la webcam elegida con la resolución y los fotogramas
   por segundo pedidos.
2. **Seguimiento de la mano**: [MediaPipe Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker)
   funciona en WebAssembly con el delegado de CPU (XNNPACK) y devuelve 21 puntos de la
   mano por cada nuevo fotograma. Funciona en un Web Worker (`web/js/hand-worker.js`), así
   la vista 3D nunca lo espera; los navegadores sin module workers vuelven al hilo
   principal.
3. **Postura**: `web/js/gestures.js` comprueba qué dedos están extendidos comparando la
   dirección de cada punta con la dirección de la palma y obtiene una de las tres
   posturas. Una postura debe ser estable durante unos fotogramas antes de activarse,
   lo que elimina el parpadeo.
4. **Movimiento**: el centro de la palma se suaviza y su desplazamiento entre
   fotogramas se convierte en giro o desplazamiento. Para el zoom se sigue en el
   tiempo la relación entre la distancia pulgar índice y el tamaño de la palma.
5. **Renderizado**: [three.js](https://threejs.org) dibuja los escaneos con WebGL.
   El giro sigue los ejes de la pantalla, así que mover la mano a la derecha siempre
   gira el modelo a la derecha, sea cual sea la vista.

## Estructura del proyecto

| Ruta | Para qué sirve |
| --- | --- |
| `web/` | La app web, publicada en GitHub Pages por `.github/workflows/pages.yml` |
| `web/index.html` | Diseño: escena, objetos, webcam, gestos y paneles de vista |
| `web/css/style.css` | Estilos para escritorio y móvil |
| `web/js/app.js` | Escena, carga de archivos, cámara, bucle de seguimiento e interfaz |
| `web/js/gestures.js` | Clasificación de posturas y movimiento (sin DOM, fácil de probar) |
| `web/js/version.js` | Versión actual, mostrada en la app |
| `scripts/bump.mjs` | Sube la versión (patch, minor o major) |
| `web/js/hand-worker.js` | Seguimiento de la mano en un Web Worker, fuera del hilo principal |
| `web/js/phone.js` | Teléfono como webcam: emparejamiento con QR en el ordenador, página de cámara en el teléfono |
| `web/js/windows.js` | Ventanas flotantes: arrastrar, plegar, diseño para teléfono |
| `integrations/` | Add-ons que llevan el control con la mano a otros programas (Blender) |
| `scripts/build-blender.py` | Crea el zip del add-on para Blender |
| `apps/desktop/` | Leviate for Desktop (Electron): la mano en cualquier programa, módulos 3D y Mouse |
| `scripts/build-desktop.mjs` | Crea la app de escritorio para Windows, macOS o Linux |
| `web/vendor/three/` | three.js, sus cargadores y decodificadores (MIT, Draco Apache-2.0) |
| `web/vendor/peerjs/`, `web/vendor/qrcode/` | Emparejamiento WebRTC y generador de códigos QR (MIT) |
| `web/vendor/fonts/` | Fuente Jost (SIL OFL 1.1) |
| `web/docs/` | Capturas, ventana QR y dibujos de gestos usados en este README |
| `web/icons/`, `web/site.webmanifest` | Iconos de la app para navegadores, iOS y Android |
| `web/vendor/mediapipe/` | MediaPipe Tasks Vision y su runtime WebAssembly (Apache-2.0) |
| `web/models/hand_landmarker.task` | Modelo de la mano de MediaPipe (Apache-2.0) |

## Versiones

La versión se ve junto al nombre en la app y está en `web/js/version.js`. Sigue el
[versionado semántico](https://semver.org) y crece con cada commit: el hook pre-commit
en `.githooks/` sube el número de patch automáticamente. Actívalo una vez después de
clonar:

```sh
git config core.hooksPath .githooks
```

Para una versión minor o major ejecuta `node scripts/bump.mjs minor` (o `major`) antes
del commit. Un tag `v<versión>` inicia el workflow Build & Release: crea los zip de las
integraciones y los publica en una nueva release en la
[página de releases](https://github.com/vladpereverzyev/leviate/releases). La app web no
está en la release, siempre funciona desde el enlace de arriba.

## No es un producto sanitario

Leviate es un visor 3D. No es un producto sanitario y no sirve para diagnóstico,
planificación de tratamientos ni ninguna otra decisión clínica. Revisa siempre los
escaneos en el software aprobado para ese fin.

## Privacidad

El vídeo y tus escaneos se procesan solo dentro de tu navegador. No se sube nada, no
hay seguimiento ni cuenta. El único servicio externo es el broker PeerJS que usa
**Use phone**, que ve los datos de conexión pero nunca el vídeo.

## Contribuir

Issues y pull requests son bienvenidos. Lee antes [CONTRIBUTING.md](CONTRIBUTING.md) y
el [Código de conducta](CODE_OF_CONDUCT.md). Cada contribución necesita el
[Contributor License Agreement](CLA.md): el bot CLA Assistant te pide firmarlo con un
comentario en tu primer pull request.

### Lleva Leviate a tu CAD

Las integraciones para otros programas CAD y 3D son la contribución más bienvenida:
FreeCAD, Rhino, Fusion, SolidWorks, Inventor, SketchUp, software CAD dental con una API
abierta y cualquier programa que admita scripts. Blender abre el camino. Las reglas para
las integraciones:

1. Una carpeta por programa en `integrations/<programa>/` con código, README y LICENSE.
2. Los mismos gestos en todas partes: reutiliza el seguimiento de la mano de Leviate for
   Blender (`gestures.py` y el modelo MediaPipe), mira [integrations/README.md](integrations/README.md).
3. Solo local: la cámara se lee en el ordenador, nada se graba ni se envía, sin seguimiento.
4. Ligeras: usa los scripts y el sistema de add-ons del programa, evita instalaciones extra.
5. Licencia: la que pida el programa (los add-ons de Blender son GPL-3.0-or-later), si no
   AGPL-3.0. Se aplica el CLA.
6. Nombre: "Leviate for <Programa>", no hecho ni respaldado por el dueño del programa.
7. El workflow Build & Release crea cada integración como zip y la adjunta a la release.

## Apoyo

Si Leviate te resulta útil puedes apoyar su desarrollo en
[GitHub Sponsors](https://github.com/sponsors/vladpereverzyev) o
[Ko-fi](https://ko-fi.com/vladpereverzyev).

## Licencia

Copyright (C) 2026 Vladyslav Pereverzyev

Leviate tiene doble licencia.

- **Código abierto**: [GNU Affero General Public License v3.0](LICENSE). Puedes usarlo,
  estudiarlo, modificarlo y compartirlo gratis. Si distribuyes una versión modificada o
  la ofreces a otros a través de una red debes publicar tu código fuente con la misma
  licencia.
- **Comercial**: si quieres incluir Leviate en un producto o servicio de código cerrado
  sin las obligaciones de la AGPL, hay una licencia comercial disponible. Abre una issue
  con el título "Commercial license" o contacta con
  [@vladpereverzyev](https://github.com/vladpereverzyev) en GitHub.

El nombre "Leviate" y su logotipo no están cubiertos por la AGPL-3.0 y no pueden usarse
en versiones modificadas sin permiso.

Las integraciones de `integrations/` llevan su propio archivo de licencia. Leviate for
Blender es GPL-3.0-or-later, como Blender pide para sus add-ons.

Los componentes de terceros mantienen sus propias licencias. Mira [NOTICE](NOTICE) y
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
