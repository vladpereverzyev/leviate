// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// Builds Leviate for Desktop for the system it runs on, into dist/desktop/:
//   Windows  leviate-<version>-windows-x64.exe      (installer)
//   macOS    leviate-<version>-macos-arm64.dmg and -macos-x64.dmg
//   Linux    leviate-<version>-linux-x64.AppImage
//   Mac App Store  leviate-<version>-mac-app-store.pkg (with --mas)
//   Microsoft Store  leviate-<version>-windows-store.appx (with --appx, on Windows)
//
// The app uses the files of shared/ (hand worker, gestures, phone pairing, MediaPipe,
// PeerJS, the font, the hand model, the icon), copied unchanged into desktop/shared/ with
// the license files. The version comes from shared/js/version.js, like the other downloads.
//
//   cd desktop && npm ci
//   node scripts/build-desktop.mjs          (from the repository root)
//   node scripts/build-desktop.mjs --dir    (unpacked app only, quicker to try)
//   node scripts/build-desktop.mjs --mas    (Mac App Store package, see .github/workflows/mas.yml)

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
fs.copyFileSync(path.join(SHARED, 'icons', 'icon.ico'), path.join(BUILD, 'icon.ico'));

const platform = { win32: '--win', darwin: '--mac', linux: '--linux' }[process.platform];
const builder = path.join(APP, 'node_modules', 'electron-builder', 'cli.js');
// --mas: the sandboxed Mac App Store package (macOS only), signed with the certificates of
// the keychain and the identity given as -c.mas.identity=... by the Mac App Store workflow.
const mas = process.argv.includes('--mas');
// --appx: the MSIX package for the Microsoft Store (Windows only), with its tile images.
// The Store signs it, so it needs no certificate here.
const appx = process.argv.includes('--appx');
if (appx) fs.cpSync(path.join(APP, 'appx'), path.join(BUILD, 'appx'), { recursive: true });
// The Store wants a 1024 px icon (512 pt @2x) in the app's .icns: the build icon becomes
// the 1024 px one of mas/, which also the universal app picks up.
if (mas) fs.copyFileSync(path.join(APP, 'mas', 'icon.png'), path.join(BUILD, 'icon.png'));
const args = [builder, ...(mas ? ['--mac', 'mas:universal'] : appx ? ['--win', 'appx:x64'] : [platform]), `-c.extraMetadata.version=${version}`, '--publish', 'never'];
if (process.argv.includes('--dir')) args.push('--dir');
args.push(...process.argv.slice(2).filter((a) => a.startsWith('-c.')));

console.log(`Leviate ${version} for ${process.platform}`);
execFileSync(process.execPath, args, { cwd: APP, stdio: 'inherit' });
