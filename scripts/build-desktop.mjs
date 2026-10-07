// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// Builds Leviate for Desktop for the system it runs on, into dist/desktop/:
//   Windows  leviate-<version>-windows-x64.exe      (installer)
//   macOS    leviate-<version>-macos-arm64.dmg and -macos-x64.dmg
//   Linux    leviate-<version>-linux-x64.AppImage
//
// The app uses the files of shared/ (hand worker, gestures, phone pairing, MediaPipe,
// PeerJS, the font, the hand model, the icon), copied unchanged into desktop/shared/ with
// the license files. The version comes from shared/js/version.js, like the other downloads.
//
//   cd desktop && npm ci
//   node scripts/build-desktop.mjs          (from the repository root)
//   node scripts/build-desktop.mjs --dir    (unpacked app only, quicker to try)

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(ROOT, 'desktop');
const SHARED = path.join(ROOT, 'shared');
const COPY = path.join(APP, 'shared');
const BUILD = path.join(APP, 'build');

const LICENSES = ['LICENSE', 'NOTICE', 'THIRD-PARTY-NOTICES.md'];

const version = /VERSION = '([\d.]+)'/.exec(fs.readFileSync(path.join(SHARED, 'js', 'version.js'), 'utf8'))[1];

fs.rmSync(COPY, { recursive: true, force: true });
fs.cpSync(SHARED, COPY, { recursive: true });
for (const name of LICENSES) fs.copyFileSync(path.join(ROOT, name), path.join(COPY, name));
fs.mkdirSync(BUILD, { recursive: true });
fs.copyFileSync(path.join(SHARED, 'icons', 'icon-512.png'), path.join(BUILD, 'icon.png'));

const platform = { win32: '--win', darwin: '--mac', linux: '--linux' }[process.platform];
const builder = path.join(APP, 'node_modules', 'electron-builder', 'cli.js');
const args = [builder, platform, `-c.extraMetadata.version=${version}`];
if (process.argv.includes('--dir')) args.push('--dir');

console.log(`Leviate ${version} for ${process.platform}`);
execFileSync(process.execPath, args, { cwd: APP, stdio: 'inherit' });
