// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// Puts Leviate for Dentra Viewer together in dist/dentra/ and packs it into
// dist/leviate-dentra-<version>.zip, the file uploaded in the Developer area of Dentra:
//   integrations/dentra/   dentra-plugin.json, the page, the plugin and its look
//   shared/                gestures, gloves, version, MediaPipe (SIMD build), hand model, font
// The plugin keeps its own version, in dentra-plugin.json.
//
//   node scripts/build-dentra.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipFolder } from './zip.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'integrations', 'dentra');
const SHARED = path.join(ROOT, 'shared');
const OUT = path.join(ROOT, 'dist', 'dentra');

const { version } = JSON.parse(fs.readFileSync(path.join(SRC, 'dentra-plugin.json'), 'utf8'));

fs.rmSync(OUT, { recursive: true, force: true });
// The README and the LICENSE of the folder stay out: Dentra takes only some file types and
// the license goes in as LICENSE.txt below.
fs.cpSync(SRC, OUT, { recursive: true, filter: (f) => !['README.md', 'LICENSE'].includes(path.basename(f)) });
fs.mkdirSync(path.join(OUT, 'js'));
for (const name of ['gestures.js', 'gloves.js']) fs.copyFileSync(path.join(SHARED, 'js', name), path.join(OUT, 'js', name));
// The footer of the plugin shows the version of the plugin, not the one of the apps.
fs.writeFileSync(path.join(OUT, 'js', 'version.js'), `// Written by scripts/build-dentra.mjs from dentra-plugin.json.
export const VERSION = '${version}';
`);
// The Viewer runs in browsers with WebAssembly SIMD: the other build of MediaPipe stays out.
fs.cpSync(path.join(SHARED, 'vendor', 'mediapipe'), path.join(OUT, 'vendor', 'mediapipe'), {
  recursive: true, filter: (f) => !/nosimd/.test(path.basename(f)),
});
fs.mkdirSync(path.join(OUT, 'models'));
fs.copyFileSync(path.join(SHARED, 'models', 'hand_landmarker.task'), path.join(OUT, 'models', 'hand_landmarker.task'));
fs.mkdirSync(path.join(OUT, 'fonts'));
for (const name of ['jost-400.woff2', 'OFL.txt']) fs.copyFileSync(path.join(SHARED, 'vendor', 'fonts', name), path.join(OUT, 'fonts', name));
// Text files only as .txt or .md in the zip of Dentra.
fs.copyFileSync(path.join(ROOT, 'LICENSE'), path.join(OUT, 'LICENSE.txt'));
fs.copyFileSync(path.join(ROOT, 'NOTICE'), path.join(OUT, 'NOTICE.txt'));
fs.copyFileSync(path.join(ROOT, 'THIRD-PARTY-NOTICES.md'), path.join(OUT, 'THIRD-PARTY-NOTICES.md'));
fs.copyFileSync(path.join(SHARED, 'vendor', 'mediapipe', 'LICENSE'), path.join(OUT, 'vendor', 'mediapipe', 'LICENSE.txt'));
fs.rmSync(path.join(OUT, 'vendor', 'mediapipe', 'LICENSE'));

const zip = path.join(ROOT, 'dist', `leviate-dentra-${version}.zip`);
zipFolder(OUT, zip);
console.log(`Leviate for Dentra ${version}: ${path.relative(ROOT, OUT)} and ${path.relative(ROOT, zip)} (${(fs.statSync(zip).size / 1e6).toFixed(1)} MB)`);
