# Contributing to Leviate

Thanks for helping. Bug reports, ideas and pull requests are welcome.

## Before you open a pull request

- Keep it a static app: plain HTML, CSS and JavaScript modules, no build step.
- Everything must run in the browser on the CPU. No server, no GPU-only code.
- New dependencies go in `vendor/` with their license file and a line in
  `THIRD-PARTY-NOTICES.md`. Only permissive licenses (MIT, BSD, Apache-2.0 or similar).
- Texts in the repo are in English, without long dashes and without a comma before "and".
- Run `git config core.hooksPath .githooks` once, so every commit raises the version.
- Test on a desktop browser and on a phone if your change touches the camera or the layout.

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
