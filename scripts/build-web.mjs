// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// Puts the website together in dist/web/: the files of web/ (pages, styles, the web app,
// three.js, icons, images) and the files of shared/ (hand tracking, gestures, phone
// pairing, MediaPipe, PeerJS, fonts, hand model, version) in one folder, with the same
// layout as the published site. GitHub Pages publishes this folder.
//
// The download buttons get the direct links to the files of the latest release here, so
// a click downloads at once. The release workflow publishes the site again after every
// release. Without an answer from GitHub the buttons keep the link to the releases page.
//
//   node scripts/build-web.mjs
//   python -m http.server 8000 --directory dist/web      (to try it locally)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist', 'web');
const REPO = 'vladpereverzyev/leviate';

async function latestRelease() {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'leviate-build' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

function linkDownloads(release) {
  const file = path.join(OUT, 'download.html');
  let html = fs.readFileSync(file, 'utf8');
  const version = release.tag_name.replace(/^v/, '');
  const assets = new Set(release.assets.map((a) => a.name));
  let linked = 0;
  html = html.replace(/data-file="([^"]+)" href="[^"]*"/g, (all, pattern) => {
    const name = pattern.replace('{v}', version);
    if (!assets.has(name)) return all;
    linked++;
    return `data-file="${pattern}" href="https://github.com/${REPO}/releases/download/${release.tag_name}/${name}"`;
  });
  const date = new Date(release.published_at).toLocaleDateString('en-GB', { dateStyle: 'long', timeZone: 'UTC' });
  html = html.replace(/<p class="release" id="release">[\s\S]*?<\/p>/,
    `<p class="release" id="release">Version ${version}, ${date} · `
    + `<a href="${release.html_url}" target="_blank" rel="noopener">Release notes</a> · `
    + `<a href="https://github.com/${REPO}/releases" target="_blank" rel="noopener">All versions</a></p>`);
  fs.writeFileSync(file, html);
  console.log(`Download buttons: ${linked} direct links to ${release.tag_name}`);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'web'), OUT, { recursive: true });
// A file in both folders would hide one of them: stop instead.
fs.cpSync(path.join(ROOT, 'shared'), OUT, { recursive: true, force: false, errorOnExist: true });

const release = await latestRelease();
if (release) linkDownloads(release);
else console.log('Download buttons: no answer from GitHub, they link to the releases page');
console.log(`Website in ${path.relative(ROOT, OUT)}`);
