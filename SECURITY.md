# Security policy

## Supported versions

Security fixes go into the newest version only. Please update before you report.

| Part of Leviate | Supported version |
| --- | --- |
| Web app | the one online at <https://vladpereverzyev.github.io/leviate/> |
| Leviate for Desktop (Windows, macOS, Linux) | the [latest release](https://github.com/vladpereverzyev/leviate/releases/latest), and the copies from the Mac App Store, the Microsoft Store and the Snap Store |
| Leviate for Chrome | the version on the [Chrome Web Store](https://chromewebstore.google.com/detail/leviate/moipdbapejodmhhmhhngbcehcgngchlh) |
| Leviate for Blender | the newest release on [Blender Extensions](https://extensions.blender.org/add-ons/leviate/) |

## Reporting a vulnerability

Please do not open a public issue for a security problem. Report it privately instead:

- with **Report a vulnerability** in the
  [Security tab](https://github.com/vladpereverzyev/leviate/security) of this repository, or
- by email to **info@vladpereverzyev.com**, with "Leviate security" in the subject.

Tell what is affected (which part and version), how to reproduce it and what an attacker
could do with it. A proof of concept helps, but please do not access data that is not yours.

You get an answer within 7 days. Once the problem is confirmed, a fix is released as soon as
possible, usually within 30 days, and you are credited in the release notes unless you
prefer otherwise. Please keep the details private until the fix is out.

## What is in scope

- The code in this repository: the web app, Leviate for Desktop, Leviate for Chrome, Leviate
  for Blender and the Dentra plugin.
- The build and release workflows in `.github/workflows/`, which build and sign the
  downloads.

Problems in the services Leviate uses (GitHub Pages, the PeerJS server, the STUN server of
Google, the app stores) should be reported to those services.

## How Leviate keeps you safe

- The camera video is processed on your device and never recorded or sent anywhere; see the
  [privacy policy](https://vladpereverzyev.github.io/leviate/privacy.html).
- The downloads are built from this repository by GitHub Actions. The macOS app is signed
  and notarized by Apple; see the [code signing policy](README.md#code-signing-policy).
