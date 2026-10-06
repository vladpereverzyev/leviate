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
copyright holder. To keep that possible every contribution needs this agreement.

By submitting a contribution (code, documentation, images or any other material) to
this repository you agree that:

1. You wrote the contribution yourself or have the right to submit it.
2. You keep the copyright of your contribution.
3. You grant Vladyslav Pereverzyev a perpetual, worldwide, non-exclusive, royalty-free
   and irrevocable license to use, copy, modify, sublicense and distribute your
   contribution under the AGPL-3.0 and under any other license, including commercial
   licenses.
4. You grant everyone a patent license for your contribution on the same terms as
   section 11 of the AGPL-3.0.
5. Your contribution is provided as is, without warranty.

Add this line to the description of your pull request to confirm:

```
I have read the Contributor License Agreement in CONTRIBUTING.md and I agree to it.
```

Pull requests without this line cannot be merged.
