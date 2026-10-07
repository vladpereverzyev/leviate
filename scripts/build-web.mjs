// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// Puts the website together in dist/web/: the files of web/ (pages, styles, the web app,
// three.js, icons, images) and the files of shared/ (hand tracking, gestures, phone
// pairing, MediaPipe, PeerJS, fonts, hand model, version) in one folder, with the same
// layout as the published site. GitHub Pages publishes this folder.
//
//   node scripts/build-web.mjs
//   python -m http.server 8000 --directory dist/web      (to try it locally)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist', 'web');

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'web'), OUT, { recursive: true });
// A file in both folders would hide one of them: stop instead.
fs.cpSync(path.join(ROOT, 'shared'), OUT, { recursive: true, force: false, errorOnExist: true });
console.log(`Website in ${path.relative(ROOT, OUT)}`);
