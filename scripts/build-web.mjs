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

async function github(url) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'leviate-build' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/${url}`, { headers });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

// Leviate for Desktop is the release marked latest; Leviate for Blender has releases of its
// own with its own version (never marked latest), found by its zips.
async function latestReleases() {
  const desktop = await github('releases/latest');
  const all = await github('releases?per_page=50');
  const blender = (all || []).find((r) => !r.draft && r.assets.some((x) => x.name.startsWith('leviate-blender-'))) || null;
  return { desktop, blender };
}

function linkDownloads(html, release, isBlender) {
  const version = release.tag_name.replace(/^v/, '');
  const assets = new Set(release.assets.map((a) => a.name));
  let linked = 0;
  html = html.replace(/data-file="([^"]+)" href="[^"]*"/g, (all, pattern) => {
    if (pattern.startsWith('leviate-blender-') !== isBlender) return all;
    const name = pattern.replace('{v}', version);
    if (!assets.has(name)) return all;
    linked++;
    return `data-file="${pattern}" href="https://github.com/${REPO}/releases/download/${release.tag_name}/${name}"`;
  });
  console.log(`Download buttons: ${linked} direct links to ${release.tag_name}`);
  return html;
}

function releaseLine(html, release) {
  const version = release.tag_name.replace(/^v/, '');
  const date = new Date(release.published_at).toLocaleDateString('en-GB', { dateStyle: 'long', timeZone: 'UTC' });
  return html.replace(/<p class="release" id="release">[\s\S]*?<\/p>/,
    `<p class="release" id="release">Version ${version}, ${date} · `
    + `<a href="${release.html_url}" target="_blank" rel="noopener">Release notes</a> · `
    + `<a href="https://github.com/${REPO}/releases" target="_blank" rel="noopener">All versions</a></p>`);
}

// Every page has the same footer as the web app, and so do Leviate for Desktop, for Chrome
// and for Dentra Viewer: same
// links, same words, same order. Stop if one of them is different.
function footerTexts(file) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  return [...html.matchAll(/<footer[^>]*>([\s\S]*?)<\/footer>/g)]
    .map((foot) => foot[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}
const FOOTERS = ['web/index.html', 'web/download.html', 'web/privacy.html', 'web/404.html', 'desktop/renderer/control.html',
  'integrations/chrome-extension/panel.html', 'integrations/dentra/index.html'];
const [footer] = footerTexts(FOOTERS[0]);
for (const file of FOOTERS) {
  const texts = footerTexts(file);
  if (!texts.length || texts.some((text) => text !== footer)) {
    console.error(`The footer of ${file} is not the same as the one of ${FOOTERS[0]}`);
    process.exit(1);
  }
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'web'), OUT, { recursive: true });
// A file in both folders would hide one of them: stop instead.
fs.cpSync(path.join(ROOT, 'shared'), OUT, { recursive: true, force: false, errorOnExist: true });

// The catalog for AI agents: .well-known/ai-catalog.json is the source and ard.json, the name
// of the newer revision of the specification, gets the same entries. Stop on a broken entry.
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'web', '.well-known', 'ai-catalog.json'), 'utf8'));
for (const e of catalog.entries) {
  if (!/^urn:air:[a-zA-Z0-9.-]+(:[a-zA-Z0-9._-]+)+$/.test(e.identifier) || !e.displayName || !e.type || !e.url === !e.data) {
    console.error(`ai-catalog.json: entry ${e.identifier} is not valid`);
    process.exit(1);
  }
}
fs.writeFileSync(path.join(OUT, '.well-known', 'ard.json'), JSON.stringify(catalog, null, 2) + '\n');

const { desktop, blender } = await latestReleases();
const page = path.join(OUT, 'download.html');
let html = fs.readFileSync(page, 'utf8');
if (desktop) html = releaseLine(linkDownloads(html, desktop, false), desktop);
if (blender) html = linkDownloads(html, blender, true);
if (!desktop || !blender) console.log('Download buttons: no answer from GitHub for some, they link to the releases page');
fs.writeFileSync(page, html);
console.log(`Website in ${path.relative(ROOT, OUT)}`);
