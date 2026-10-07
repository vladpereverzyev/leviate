// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// New versions from the releases on GitHub. The window asks check() when it opens (unless
// the user turned it off); when a newer release has the file for this computer it offers
// it, and install() downloads that file and opens it:
//
//   Windows  the installer, then Leviate closes so the installer can replace it
//   macOS    the dmg, opened in Finder: drag Leviate to Applications as the first time
//   Linux    the new AppImage takes the place of the running one, then Leviate restarts
//
// No signing is needed, unlike the updater of Electron, which needs a signed app on macOS.

const { app, net, shell } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO = 'vladpereverzyev/leviate';

// 1.3.19 > 1.3.18 > 1.3.9
function newer(a, b) {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  }
  return false;
}

function fileFor(version) {
  if (process.platform === 'win32') return `leviate-${version}-windows-x64.exe`;
  if (process.platform === 'darwin') return `leviate-${version}-macos-${process.arch === 'arm64' ? 'arm64' : 'x64'}.dmg`;
  return `leviate-${version}-linux-x64.AppImage`;
}

// { version, file, url, notes } of a newer release for this computer, or null.
async function check(current) {
  try {
    const res = await net.fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': `Leviate/${current}` },
    });
    if (!res.ok) return null;
    const release = await res.json();
    const version = String(release.tag_name || '').replace(/^v/, '');
    if (!/^\d+(\.\d+)*$/.test(version) || !newer(version, current)) return null;
    const file = fileFor(version);
    const asset = (release.assets || []).find((a) => a.name === file);
    if (!asset) return null;
    return { version, file, url: asset.browser_download_url, size: asset.size, notes: release.html_url };
  } catch {
    return null;
  }
}

// Downloads the file of the update, telling progress(0..1) on the way, then opens it.
async function install(update, progress) {
  const res = await net.fetch(update.url);
  if (!res.ok) throw new Error(`download failed (${res.status})`);
  const total = Number(res.headers.get('content-length')) || update.size || 0;
  const target = process.platform === 'darwin'
    ? path.join(app.getPath('downloads'), update.file)
    : path.join(os.tmpdir(), update.file);
  const part = target + '.part';
  const out = fs.createWriteStream(part);
  let done = 0;
  const reader = res.body.getReader();
  try {
    for (;;) {
      const { done: end, value } = await reader.read();
      if (end) break;
      if (!out.write(Buffer.from(value))) await new Promise((r) => out.once('drain', r));
      done += value.length;
      if (total) progress(done / total);
    }
  } finally {
    await new Promise((r) => out.end(r));
  }
  if (total && done !== total) throw new Error('the download was cut short');
  fs.renameSync(part, target);

  if (process.platform === 'win32') {
    const error = await shell.openPath(target);
    if (error) throw new Error(error);
    app.quit();   // the installer replaces Leviate once it has closed
  } else if (process.platform === 'darwin') {
    const error = await shell.openPath(target);
    if (error) throw new Error(error);
  } else {
    const running = process.env.APPIMAGE;
    if (!running) {
      shell.showItemInFolder(target);
      return;
    }
    fs.chmodSync(target, 0o755);
    fs.copyFileSync(target, running + '.new');
    fs.chmodSync(running + '.new', 0o755);
    fs.renameSync(running + '.new', running);
    app.relaunch({ execPath: running });
    app.quit();
  }
}

module.exports = { check, install, newer };
