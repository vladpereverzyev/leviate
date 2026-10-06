// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// Builds the Leviate desktop app for the system it runs on, into dist/desktop/:
//   Windows  leviate-<version>-windows-x64.exe      (installer)
//   macOS    leviate-<version>-macos-arm64.dmg and -macos-x64.dmg
//   Linux    leviate-<version>-linux-x64.AppImage
//
// The files it shares with the web app (hand worker, gestures, phone pairing, MediaPipe,
// PeerJS, the font, the hand model) are copied unchanged into apps/desktop/web/. The
// version comes from js/version.js, like the other downloads.
//
//   cd apps/desktop && npm ci
//   node scripts/build-desktop.mjs          (from the repository root)
//   node scripts/build-desktop.mjs --dir    (unpacked app only, quicker to try)

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(ROOT, 'apps', 'desktop');
const WEB = path.join(APP, 'web');
const BUILD = path.join(APP, 'build');

// What the desktop app uses of the web app, nothing else.
const FILES = ['js/hand-worker.js', 'js/gestures.js', 'js/phone.js', 'js/consent.js', 'js/version.js',
  'vendor/mediapipe', 'vendor/peerjs', 'vendor/qrcode', 'vendor/fonts', 'models', 'icons/icon.svg',
  'icons/icon-512.png', 'LICENSE', 'NOTICE', 'THIRD-PARTY-NOTICES.md'];

const version = /VERSION = '([\d.]+)'/.exec(fs.readFileSync(path.join(ROOT, 'js', 'version.js'), 'utf8'))[1];

fs.rmSync(WEB, { recursive: true, force: true });
for (const name of FILES) fs.cpSync(path.join(ROOT, name), path.join(WEB, name), { recursive: true });
fs.mkdirSync(BUILD, { recursive: true });
fs.copyFileSync(path.join(ROOT, 'icons', 'icon-512.png'), path.join(BUILD, 'icon.png'));

const platform = { win32: '--win', darwin: '--mac', linux: '--linux' }[process.platform];
const builder = path.join(APP, 'node_modules', 'electron-builder', 'cli.js');
const args = [builder, platform, `-c.extraMetadata.version=${version}`];
if (process.argv.includes('--dir')) args.push('--dir');

console.log(`Leviate ${version} for ${process.platform}`);
execFileSync(process.execPath, args, { cwd: APP, stdio: 'inherit' });
