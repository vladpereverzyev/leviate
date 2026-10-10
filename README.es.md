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

Mueve modelos 3D y el ratón con la mano. Levanta la mano delante de la webcam, o de tu
teléfono, y gira, desplaza y amplía un escaneo 3D sin tocar nada: útil cuando tienes las manos
ocupadas, con guantes o sucias. La mano se sigue en tu dispositivo y el vídeo nunca se graba
ni se envía.

**Pruébalo ya en el navegador: <https://vladpereverzyev.github.io/leviate/>**

![Leviate en el navegador](docs/images/screenshot.png)

## Instalar

| Dónde | Cómo |
| --- | --- |
| **Navegador** (ordenador o teléfono) | Nada que instalar: abre <https://vladpereverzyev.github.io/leviate/> |
| **Windows** | `leviate-<version>-windows-x64.exe` de la [última versión](https://github.com/vladpereverzyev/leviate/releases/latest) |
| **macOS** (firmado y notarizado) | `-macos-arm64.dmg` (Apple silicon) o `-macos-x64.dmg` (Intel) de la [última versión](https://github.com/vladpereverzyev/leviate/releases/latest) |
| **Ubuntu** y Linux con snap | [Snap Store](https://snapcraft.io/leviate): `sudo snap install leviate` |
| **Linux** | `-linux-x64.AppImage` o `-linux-x64.flatpak` de la [última versión](https://github.com/vladpereverzyev/leviate/releases/latest) |
| **Chrome**, Edge | [Chrome Web Store](https://chromewebstore.google.com/detail/leviate/moipdbapejodmhhmhhngbcehcgngchlh) |
| **Blender** 4.2 o posterior | [Blender Extensions](https://extensions.blender.org/add-ons/leviate/), o en Blender **Get Extensions** y busca Leviate |
| **Dentra Viewer** | el panel **Plugin** del Viewer, ver [integrations/dentra](integrations/dentra/) |

Todas las descargas, con una guía para cada sistema: <https://vladpereverzyev.github.io/leviate/download.html>

## Gestos

![Las tres posturas de la mano: mano abierta gira, puño desplaza, pulgar e índice amplían](docs/images/gestures.png)

| Postura de la mano | Vista 3D | Ratón (Leviate for Desktop y Chrome) |
| --- | --- | --- |
| Mano abierta | **girar** | **mover** el cursor |
| Puño | **desplazar** |  |
| Pulgar e índice | sepáralos para **ampliar**, júntalos para **reducir** |  |
| Un dedo quieto |  | **clic izquierdo**, mantenlo quieto para **doble clic** |
| Dos dedos quietos |  | **clic derecho** |

También funciona con guantes, de nitrilo y látex de cualquier color. **Ctrl+Alt+M** (Ctrl+Option+M en macOS) apaga y enciende la mano desde cualquier programa en Leviate for Desktop.

## Qué incluye

- **App web**: abre STL, PLY, OBJ, GLB, GLTF, 3MF, FBX y más, varios escaneos a la vez y en color, en ordenador o teléfono. [Guía](docs/guide.md) (en inglés)
- **Tu teléfono como webcam**: escanea un código QR, sin apps que instalar. [Cómo funciona](docs/guide.md#use-your-phone-as-a-webcam)
- **Leviate for Desktop**: la mano en cualquier programa, con un módulo **3D** para tu programa 3D o CAD y un módulo **Ratón**. [Guía](desktop/)
- **Leviate for Chrome**: los modos 3D y Ratón dentro de las páginas del navegador. [Guía](integrations/chrome-extension/)
- **Leviate for Blender**: la vista o los objetos seleccionados siguen tu mano. [Guía](integrations/blender/)
- **Leviate for Dentra Viewer**: gira, desplaza y amplía los modelos del Viewer. [Guía](integrations/dentra/)

Cómo está hecho, cómo ejecutar tu propia copia y cómo compilarlo: [docs/development.md](docs/development.md) (en inglés).

## No es un producto sanitario

Leviate es un visor 3D. No es un producto sanitario y no sirve para diagnóstico,
planificación de tratamientos ni ninguna otra decisión clínica. Revisa siempre los
escaneos en el software aprobado para ese fin.

## Privacidad

El vídeo y tus escaneos se procesan solo dentro de tu navegador. No se sube nada, no
hay seguimiento ni cuenta. Los únicos servicios externos son los de
**Use phone** (el broker PeerJS y un servidor STUN de Google), que ven los datos de
conexión pero nunca el vídeo. Leviate for Chrome y el plugin para Dentra mantienen el vídeo en
el ordenador de la misma forma. Todos los detalles en la [política de privacidad](https://vladpereverzyev.github.io/leviate/privacy.html).

## Uso de IA

Partes de Leviate, de su código, de su documentación y de sus paquetes para las tiendas de
aplicaciones (entre ellas los archivos de Linux de `desktop/packaging/linux/`: la entrada de escritorio, el
metainfo de AppStream y el manifiesto de Flatpak, y la receta del snap en `snap/`) se escribieron con la ayuda de herramientas de
IA generativa. Cada parte fue revisada y probada por el autor, que la mantiene y es responsable
de ella.

## Contribuir

Las issues y pull requests son bienvenidas. Lee primero [CONTRIBUTING.md](CONTRIBUTING.md)
y el [Código de conducta](CODE_OF_CONDUCT.md). Cada contribución necesita el
[Contributor License Agreement](CLA.md): el bot CLA Assistant te pide firmarlo con un
comentario en tu primera pull request. Las integraciones para otros programas CAD y 3D son las
más bienvenidas: ver [Bring Leviate to your CAD](docs/development.md#bring-leviate-to-your-cad).
Los problemas de seguridad se comunican como explica la [política de seguridad](SECURITY.md),
no en una issue pública.

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

Los demás nombres de productos y marcas pertenecen a sus propietarios. Se usan solo para
indicar con qué programas funciona Leviate. Leviate no está afiliado ni respaldado por
ninguno de ellos.

Las integraciones de `integrations/` llevan su propio archivo de licencia. Leviate for
Blender es GPL-3.0-or-later, como Blender pide para sus add-ons.

Los componentes de terceros mantienen sus propias licencias. Mira [NOTICE](NOTICE) y
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
