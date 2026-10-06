// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// Leviate desktop app: the hand drives the program the user works in.
//
//   3D     the gestures of the web app (open hand turns, fist pans, pinch zooms) become
//          mouse drags and wheel steps in the 3D program under the cursor, with the
//          mouse buttons that program uses (renderer/control3d.js)
//   Mouse  the hand moves the cursor and clicks (renderer/pointer.js)
//
// The window is renderer/control.html. Camera, hand tracking, phone pairing and the 3D
// gestures are the files of the web app (js/hand-worker.js, js/gestures.js,
// js/phone.js), served unchanged through the app:// scheme. mouse.js talks to the system.

const { app, BrowserWindow, Menu, dialog, globalShortcut, ipcMain, protocol, screen, session, shell,
  systemPreferences } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const mouse = require('./mouse');

// Packed app: the web app files are copied into web/ by scripts/build-desktop.mjs.
// Development: the repository itself.
const WEB = app.isPackaged ? path.join(__dirname, 'web') : path.resolve(__dirname, '..', '..');
const RENDERER = path.join(__dirname, 'renderer');
const ORIGIN = 'app://leviate';
// Turns the hand off and back on from any program. Control, not Cmd, on macOS too:
// Cmd+Option+M already minimizes windows there.
const HOTKEY = 'Control+Alt+M';
const RING = 72;
const CLUTCH = 220;   // how far a drag goes before it starts again from where it began
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain',
};

const VERSION = /VERSION = '([\d.]+)'/.exec(fs.readFileSync(path.join(WEB, 'js', 'version.js'), 'utf8'))[1];

// The camera must keep running while other programs are in front or the window is
// minimized: that is when the hand works the most.
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');

protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true, codeCache: true },
}]);

let win = null;
let ring = null;
let ringTimer = null;
let ringHide = null;
let drag = null;   // { button, keys, anchor, pos, pressed } in screen points (DIP)

// ---------------------------------------------------------------- files

// app://leviate/desktop/... is this app, everything else the web app.
async function serve(request) {
  let rel = decodeURIComponent(new URL(request.url).pathname).replace(/^\/+/, '');
  let base = WEB;
  if (rel.startsWith('desktop/')) {
    base = RENDERER;
    rel = rel.slice('desktop/'.length);
  }
  const file = path.resolve(base, rel);
  if (!file.startsWith(base + path.sep)) return new Response('Not found', { status: 404 });
  try {
    const body = await fs.promises.readFile(file);
    const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
    return new Response(body, { headers: { 'content-type': type } });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}

// --------------------------------------------------------------- windows

function createWindow() {
  win = new BrowserWindow({
    width: 460,
    height: 900,
    minWidth: 400,
    minHeight: 600,
    title: 'Leviate',
    backgroundColor: '#011E2E',
    icon: path.join(WEB, 'icons', 'icon-512.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: false,
    },
  });
  win.on('page-title-updated', (e) => e.preventDefault());
  // Links open in the browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    e.preventDefault();
    if (/^https?:/.test(url)) shell.openExternal(url);
  });
  win.on('closed', () => {
    endDrag();
    win = null;
    ring?.destroy();
    ring = null;
  });
  win.loadURL(`${ORIGIN}/desktop/control.html?version=${VERSION}`);
}

function createRing() {
  ring = new BrowserWindow({
    width: RING,
    height: RING,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    focusable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    show: false,
    webPreferences: { preload: path.join(__dirname, 'ring-preload.js') },
  });
  ring.setIgnoreMouseEvents(true);
  ring.setAlwaysOnTop(true, 'screen-saver');
  ring.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  ring.loadURL(`${ORIGIN}/desktop/ring.html`);
}

function followCursor() {
  if (!ring) return;
  const p = screen.getCursorScreenPoint();
  ring.setBounds({ x: p.x - RING / 2, y: p.y - RING / 2, width: RING, height: RING });
}

function showRing(visible) {
  if (!ring) return;
  if (visible && !ring.isVisible()) {
    followCursor();
    ring.showInactive();
    ringTimer ||= setInterval(followCursor, 16);
  } else if (!visible && ring.isVisible()) {
    ring.hide();
    clearInterval(ringTimer);
    ringTimer = null;
  }
}

// ---------------------------------------------------------------- mouse

// Windows and Linux move the cursor in physical pixels, macOS in points like Electron.
const native = (p) => (process.platform === 'darwin' ? p : screen.dipToScreenPoint(p));

function moveTo(p, held = null) {
  const n = native({ x: Math.round(p.x), y: Math.round(p.y) });
  mouse.load()?.move(n.x, n.y, held);
}

function enableError() {
  if (!mouse.load()) return mouse.error();
  if (process.platform === 'darwin' && !systemPreferences.isTrustedAccessibilityClient(true)) {
    return 'Allow Leviate in System Settings > Privacy & Security > Accessibility, then choose the mode again.';
  }
  return '';
}

function screens(all) {
  const displays = all ? screen.getAllDisplays() : [screen.getPrimaryDisplay()];
  const left = Math.min(...displays.map((d) => d.bounds.x));
  const top = Math.min(...displays.map((d) => d.bounds.y));
  const right = Math.max(...displays.map((d) => d.bounds.x + d.bounds.width));
  const bottom = Math.max(...displays.map((d) => d.bounds.y + d.bounds.height));
  return { left, top, right, bottom };
}

// The button is pressed only once the hand really moves, so a gesture held still
// never turns into a click (a right click would open a menu in many programs).
function dragMove(dx, dy) {
  const m = mouse.load();
  if (!m || !drag) return;
  if (!drag.pressed) {
    for (const k of drag.keys) m.key(k, true);
    m.down(drag.button);
    drag.pressed = true;
  }
  drag.pos = { x: drag.pos.x + dx, y: drag.pos.y + dy };
  if (Math.hypot(drag.pos.x - drag.anchor.x, drag.pos.y - drag.anchor.y) > CLUTCH) {
    // Far from where it began: let go, jump back and grab again, so the drag never
    // reaches the edge of the 3D view.
    m.up(drag.button);
    moveTo(drag.anchor);
    m.down(drag.button);
    drag.pos = { x: drag.anchor.x + dx, y: drag.anchor.y + dy };
  }
  moveTo(drag.pos, drag.button);
}

function endDrag() {
  const m = mouse.load();
  if (!drag) return;
  const d = drag;
  drag = null;
  if (!m || !d.pressed) return;
  m.up(d.button);
  for (const k of [...d.keys].reverse()) m.key(k, false);
  moveTo(d.anchor);
}

ipcMain.on('mouse:enable', (e) => e.sender.send('mouse:error', enableError()));
ipcMain.on('mouse:move', (e, u, v, all) => {
  if (!mouse.load()) return;
  const r = screens(all);
  moveTo({ x: r.left + u * (r.right - r.left - 1), y: r.top + v * (r.bottom - r.top - 1) });
});
ipcMain.on('mouse:click', (e, button) => {
  const b = button === 'right' ? 'right' : 'left';
  mouse.load()?.down(b);
  mouse.load()?.up(b);
});
ipcMain.on('drag:start', (e, button, keys) => {
  endDrag();
  if (!['left', 'middle', 'right'].includes(button)) return;
  const p = screen.getCursorScreenPoint();
  drag = { button, keys: (keys || []).filter((k) => ['shift', 'ctrl', 'alt'].includes(k)), anchor: p, pos: p, pressed: false };
});
ipcMain.on('drag:move', (e, dx, dy) => dragMove(dx, dy));
ipcMain.on('drag:end', () => endDrag());
ipcMain.on('wheel', (e, steps) => { if (steps) mouse.load()?.wheel(Math.round(steps)); });

ipcMain.on('mouse:ring', (e, mode, progress) => {
  if (!ring) return;
  if (mode) {
    ring.webContents.send('ring:state', { mode, progress });
    showRing(true);
  } else if (!ringHide) {
    showRing(false);
  }
});
ipcMain.on('mouse:flash', (e, mode) => {
  if (!ring) return;
  ring.webContents.send('ring:state', { mode, progress: 0 });
  ring.webContents.send('ring:flash', mode);
  showRing(true);
  clearTimeout(ringHide);
  ringHide = setTimeout(() => { ringHide = null; showRing(false); }, 380);
});

ipcMain.handle('phone:notice', async () => {
  const { response } = await dialog.showMessageBox(win, {
    type: 'info',
    title: 'Phone',
    message: 'Your phone becomes the camera of Leviate',
    detail: 'To find each other, the phone and this computer go through the free PeerJS server '
      + '(0.peerjs.com), which sees the IP addresses of both devices but never the video. The video '
      + 'goes straight from the phone to this computer, encrypted, and is never recorded.',
    buttons: ['Continue', 'Cancel'],
    defaultId: 0,
    cancelId: 1,
  });
  return response === 0;
});

// ------------------------------------------------------------- lifetime

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  app.whenReady().then(() => {
    protocol.handle('app', serve);
    const allowed = new Set(['media', 'clipboard-sanitized-write']);
    session.defaultSession.setPermissionRequestHandler(async (wc, permission, callback) => {
      if (!allowed.has(permission)) return callback(false);
      if (permission === 'media' && process.platform === 'darwin') {
        return callback(await systemPreferences.askForMediaAccess('camera'));
      }
      callback(true);
    });
    session.defaultSession.setPermissionCheckHandler((wc, permission) => allowed.has(permission));

    if (process.platform !== 'darwin') Menu.setApplicationMenu(null);
    createWindow();
    createRing();
    globalShortcut.register(HOTKEY, () => {
      endDrag();
      win?.webContents.send('mode:toggle');
    });
  });

  app.on('activate', () => {
    if (!win) createWindow();
    if (!ring) createRing();
  });
  app.on('before-quit', endDrag);
  app.on('will-quit', () => globalShortcut.unregisterAll());
  app.on('window-all-closed', () => app.quit());
}
