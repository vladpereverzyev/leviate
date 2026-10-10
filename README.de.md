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

Bewege 3D-Modelle und die Maus mit der bloßen Hand. Halte die Hand vor die Webcam oder
dein Handy und drehe, verschiebe und zoome einen 3D-Scan, ohne etwas zu berühren: praktisch,
wenn die Hände beschäftigt, in Handschuhen oder nicht sauber sind. Die Hand wird auf deinem
Gerät erkannt, das Video wird nie aufgezeichnet oder gesendet.

**Jetzt im Browser ausprobieren: <https://vladpereverzyev.github.io/leviate/>**

![Leviate im Browser](docs/images/screenshot.png)

## Installieren

| Wo | Wie |
| --- | --- |
| **Browser** (Computer oder Handy) | Nichts zu installieren: öffne <https://vladpereverzyev.github.io/leviate/> |
| **Windows** | `leviate-<version>-windows-x64.exe` aus dem [neuesten Release](https://github.com/vladpereverzyev/leviate/releases/latest) |
| **macOS** (signiert und notarisiert) | `-macos-arm64.dmg` (Apple silicon) oder `-macos-x64.dmg` (Intel) aus dem [neuesten Release](https://github.com/vladpereverzyev/leviate/releases/latest) |
| **Ubuntu** und Linux mit snap | [Snap Store](https://snapcraft.io/leviate): `sudo snap install leviate` |
| **Linux** | `-linux-x64.AppImage` oder `-linux-x64.flatpak` aus dem [neuesten Release](https://github.com/vladpereverzyev/leviate/releases/latest) |
| **Chrome**, Edge | [Chrome Web Store](https://chromewebstore.google.com/detail/leviate/moipdbapejodmhhmhhngbcehcgngchlh) |
| **Blender** 4.2 oder neuer | [Blender Extensions](https://extensions.blender.org/add-ons/leviate/), oder in Blender unter **Get Extensions** nach Leviate suchen |
| **Dentra Viewer** | das Panel **Plugin** des Viewers, siehe [integrations/dentra](integrations/dentra/) |

Alle Downloads, mit einer Anleitung für jedes System: <https://vladpereverzyev.github.io/leviate/download.html>

## Gesten

![Die drei Handposen: offene Hand dreht, Faust verschiebt, Daumen und Zeigefinger zoomen](docs/images/gestures.png)

| Handpose | 3D-Ansicht | Maus (Leviate for Desktop und Chrome) |
| --- | --- | --- |
| Offene Hand | **drehen** | Cursor **bewegen** |
| Faust | **verschieben** |  |
| Daumen und Zeigefinger | spreizen zum **Hineinzoomen**, schließen zum **Herauszoomen** |  |
| Ein Finger ruhig |  | **Linksklick**, ruhig halten für **Doppelklick** |
| Zwei Finger ruhig |  | **Rechtsklick** |

Handschuhe funktionieren auch, Nitril und Latex in jeder Farbe. **Strg+Alt+M** (Ctrl+Option+M unter macOS) schaltet die Hand in Leviate for Desktop aus jedem Programm aus und wieder ein.

## Was drin ist

- **Web-App**: öffnet STL, PLY, OBJ, GLB, GLTF, 3MF, FBX und mehr, mehrere Scans zugleich und in Farbe, am Computer oder Handy. [Anleitung](docs/guide.md) (Englisch)
- **Dein Handy als Webcam**: QR-Code scannen, keine App nötig. [So funktioniert es](docs/guide.md#use-your-phone-as-a-webcam)
- **Leviate for Desktop**: die Hand in jedem Programm, mit einem Modul **3D** für dein 3D- oder CAD-Programm und einem Modul **Maus**. [Anleitung](desktop/)
- **Leviate for Chrome**: die Modi 3D und Maus in den Seiten des Browsers. [Anleitung](integrations/chrome-extension/)
- **Leviate for Blender**: die Ansicht oder die ausgewählten Objekte folgen deiner Hand. [Anleitung](integrations/blender/)
- **Leviate for Dentra Viewer**: dreht, verschiebt und zoomt die Modelle des Viewers. [Anleitung](integrations/dentra/)

Wie es gebaut ist, wie du eine eigene Kopie startest und baust: [docs/development.md](docs/development.md) (Englisch).

## Kein Medizinprodukt

Leviate ist ein 3D-Betrachter. Es ist kein Medizinprodukt und nicht für Diagnose,
Behandlungsplanung oder andere klinische Entscheidungen gedacht. Prüfe Scans immer in
der dafür zugelassenen Software.

## Datenschutz

Der Videostream und deine Scans werden nur in deinem Browser verarbeitet. Nichts wird
hochgeladen, kein Tracking und kein Konto. Die einzigen externen Dienste sind die von
**Use phone** (der PeerJS-Broker und ein STUN-Server von Google), die die Verbindungsdaten
sehen, aber nie das Video. Leviate for Chrome und das Plugin für Dentra behalten das Video
genauso auf dem Computer. Alle Details in der [Datenschutzerklärung](https://vladpereverzyev.github.io/leviate/privacy.html).

## Einsatz von KI

Teile von Leviate, seines Codes, seiner Dokumentation und seiner Pakete für die App-Stores
(darunter die Linux-Dateien in `desktop/packaging/linux/`: der Desktop-Eintrag, die AppStream-Metainfo und
das Flatpak-Manifest sowie das Snap-Rezept in `snap/`) wurden mit Hilfe von Werkzeugen generativer KI geschrieben. Jeder Teil
wurde vom Autor geprüft und getestet, der ihn pflegt und dafür verantwortlich ist.

## Mitwirken

Issues und Pull Requests sind willkommen. Bitte lies zuerst [CONTRIBUTING.md](CONTRIBUTING.md)
und den [Verhaltenskodex](CODE_OF_CONDUCT.md). Jeder Beitrag braucht das
[Contributor License Agreement](CLA.md): der Bot CLA Assistant bittet dich bei deinem ersten
Pull Request, es mit einem Kommentar zu unterschreiben. Integrationen für andere CAD- und
3D-Programme sind besonders willkommen: siehe [Bring Leviate to your CAD](docs/development.md#bring-leviate-to-your-cad).
Sicherheitsprobleme meldest du wie in der [Security Policy](SECURITY.md) beschrieben, nicht in
einem öffentlichen Issue.

## Unterstützung

Wenn dir Leviate nützt, kannst du die Entwicklung über
[GitHub Sponsors](https://github.com/sponsors/vladpereverzyev) oder
[Ko-fi](https://ko-fi.com/vladpereverzyev) unterstützen.

## Lizenz

Copyright (C) 2026 Vladyslav Pereverzyev

Leviate steht unter einer doppelten Lizenz.

- **Open Source**: [GNU Affero General Public License v3.0](LICENSE). Du darfst es
  kostenlos nutzen, untersuchen, ändern und teilen. Wenn du eine geänderte Version
  verbreitest oder sie anderen über ein Netzwerk anbietest, musst du deinen Quellcode
  unter derselben Lizenz veröffentlichen.
- **Kommerziell**: wenn du Leviate ohne die Pflichten der AGPL in ein
  Closed-Source-Produkt oder einen Dienst einbauen willst, gibt es eine kommerzielle Lizenz. Öffne
  ein Issue mit dem Titel "Commercial license" oder kontaktiere
  [@vladpereverzyev](https://github.com/vladpereverzyev) auf GitHub.

Der Name "Leviate" und sein Logo fallen nicht unter die AGPL-3.0 und dürfen ohne
Erlaubnis nicht für geänderte Versionen verwendet werden.

Andere Produktnamen und Marken gehören ihren Inhabern. Sie werden nur genannt, um zu
zeigen, mit welchen Programmen Leviate funktioniert. Leviate ist mit keinem von ihnen
verbunden und wird von keinem unterstützt.

Die Integrationen in `integrations/` haben eine eigene Lizenzdatei. Leviate for Blender
steht unter GPL-3.0-or-later, wie Blender es für seine Add-ons verlangt.

Komponenten von Drittanbietern behalten ihre eigenen Lizenzen. Siehe [NOTICE](NOTICE)
und [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
