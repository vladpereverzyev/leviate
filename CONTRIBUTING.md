# Contributing to Leviate

Thanks for helping. Bug reports, ideas and pull requests are welcome.

## Before you open a pull request

- Keep it a static app: plain HTML, CSS and JavaScript modules, no build step.
- Everything must run in the browser on the CPU. No server, no GPU-only code.
- New dependencies go in `web/vendor/` with their license file and a line in
  `THIRD-PARTY-NOTICES.md`. Only permissive licenses (MIT, BSD, Apache-2.0 or similar).
- Texts in the repo are in English, without long dashes and without a comma before "and".
- Run `git config core.hooksPath .githooks` once, so every commit raises the version.
- Test on a desktop browser and on a phone if your change touches the camera or the layout.

## Integrations for CAD and 3D programs

The most welcome contribution is an integration that brings Leviate to another program:
FreeCAD, Rhino, Fusion, SolidWorks, Inventor, SketchUp, dental CAD software with an open
API and any program that can be scripted. [Leviate for Blender](integrations/blender/)
is the example to follow. The policy for integrations:

1. **One folder per program**: `integrations/<program>/` with the source, a README
   (install, use, tested versions) and its LICENSE.
2. **Same gestures everywhere**: reuse the hand tracking of Leviate for Blender
   (`engine/gestures.py`, `engine/tracker.py` and the MediaPipe model), as described in
   [integrations/README.md](integrations/README.md). Gesture changes go first in
   `shared/js/gestures.js` and then in every port, so the hand behaves the same everywhere.
3. **Local only**: the camera is read on the computer, nothing is recorded or sent,
   no telemetry.
4. **Light**: use the program's own scripting and add-on system, avoid extra installs.
   New dependencies must have a permissive or GPL compatible license and go in
   `THIRD-PARTY-NOTICES.md`.
5. **License**: what the program asks for (Blender add-ons are GPL-3.0-or-later),
   otherwise AGPL-3.0. The CLA below applies to integrations too.
6. **Name**: "Leviate for <Program>". Say in its README that it is not made or endorsed
   by the owner of the program.
7. **Release**: add a build step to `.github/workflows/build.yml` that packs the
   integration as one zip. The zip is attached to the release with the others.
8. **Tested**: write in the pull request which versions of the program you tried.

## Contributor License Agreement

Leviate is dual licensed: AGPL-3.0 for everyone and a commercial license sold by the
copyright holder. To keep that possible every contribution needs the
[Contributor License Agreement](CLA.md).

Signing takes one comment. When you open your first pull request the CLA Assistant bot
asks you to sign. Reply in the pull request with exactly this sentence:

```
I have read the CLA Document and I hereby sign the CLA
```

The bot records your GitHub name and the date in the `cla-signatures` branch. You sign
once for all your future pull requests. Pull requests from people who have not signed
cannot be merged.
