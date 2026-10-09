// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// Puts Leviate for Chrome together in dist/chrome-extension/ and packs it into
// dist/leviate-chrome-<version>.zip, the file for the Chrome Web Store:
//   integrations/chrome-extension/   manifest, side panel, page driver, icons
//   shared/                          hand worker, gestures, phone pairing, MediaPipe, PeerJS, model
//   desktop/renderer/                the 3D and Mouse modules and the look of Leviate for Desktop
// The version comes from shared/js/version.js, like the other downloads.
//
//   node scripts/build-chrome.mjs
// To try it: chrome://extensions, Developer mode, Load unpacked, dist/chrome-extension.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipFolder } from './zip.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'integrations', 'chrome-extension');
const SHARED = path.join(ROOT, 'shared');
const OUT = path.join(ROOT, 'dist', 'chrome-extension');
const LICENSES = ['LICENSE', 'NOTICE', 'THIRD-PARTY-NOTICES.md'];

const version = /VERSION = '([\d.]+)'/.exec(fs.readFileSync(path.join(SHARED, 'js', 'version.js'), 'utf8'))[1];

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(SRC, OUT, { recursive: true, filter: (f) => path.basename(f) !== 'README.md' });
for (const dir of ['js', 'models', 'icons']) fs.cpSync(path.join(SHARED, dir), path.join(OUT, dir), { recursive: true });
// Chrome always has WebAssembly SIMD: the other build of MediaPipe stays out.
fs.cpSync(path.join(SHARED, 'vendor'), path.join(OUT, 'vendor'), {
  recursive: true, filter: (f) => !/nosimd/.test(path.basename(f)),
});
fs.rmSync(path.join(OUT, 'icons', 'icon.ico'), { force: true });
fs.mkdirSync(path.join(OUT, 'renderer'));
for (const name of ['control.css', 'control3d.js', 'pointer.js']) {
  fs.copyFileSync(path.join(ROOT, 'desktop', 'renderer', name), path.join(OUT, 'renderer', name));
}
for (const name of LICENSES) fs.copyFileSync(path.join(ROOT, name), path.join(OUT, name));

const manifestPath = path.join(OUT, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.version = version;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

const zip = path.join(ROOT, 'dist', `leviate-chrome-${version}.zip`);
zipFolder(OUT, zip);
console.log(`Leviate for Chrome ${version}: ${path.relative(ROOT, OUT)} and ${path.relative(ROOT, zip)} (${(fs.statSync(zip).size / 1e6).toFixed(1)} MB)`);
