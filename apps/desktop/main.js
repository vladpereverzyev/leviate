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
const CLUTCH = 350;   // how far a drag goes before it starts again from where it began
const PRESS = 6;      // how far the hand moves the cursor before the buttons go down
const FRAME = 34;     // time between two moves of the hand at 30 fps, in ms
const STEP = 8;       // time between two moves of the cursor during a drag, in ms
const WHEEL_GAP = 15; // time between two parts of a wheel step, in ms
const WHEEL_MAX = 6;  // wheel steps waiting at most, so the zoom stops soon after the hand
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
let drag = null;   // { buttons, keys, anchor, pos, target, pressed } in screen points (DIP)

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

// The buttons are pressed only once the hand has moved a few points, so a gesture held
// still or barely moved never turns into a click (a right click opens a menu in many
// programs, a left click selects). Each move of the hand comes about 30 times a second;
// the cursor covers it in small steps until the next one, so the view turns smoothly.
function dragMove(dx, dy) {
  if (!drag) return;
  const now = Date.now();
  // The camera may give fewer frames (dim light): spread each move over a bit more than
  // the time the last ones took, so the cursor is still going when the next one comes.
  if (drag.last) drag.frame += (Math.min(Math.max(now - drag.last, 16), 200) - drag.frame) * 0.3;
  drag.last = now;
  drag.target = { x: drag.target.x + dx, y: drag.target.y + dy };
  drag.due = now + drag.frame * 1.5;
  drag.timer ||= setInterval(dragStep, STEP);
}

function press(d, m) {
  for (const k of d.keys) m.key(k, true);
  for (const b of d.buttons) m.down(b);
  d.pressed = true;
}

function letGo(d, m) {
  for (const b of [...d.buttons].reverse()) m.up(b);
  d.pressed = false;
}

function dragStep() {
  const m = mouse.load();
  const d = drag;
  if (!m || !d) return;
  const now = Date.now();
  if (!d.pressed) {
    if (now < d.rest || Math.hypot(d.target.x - d.anchor.x, d.target.y - d.anchor.y) < PRESS) return;
    press(d, m);
  }
  const k = now >= d.due ? 1 : Math.min(1, STEP / (d.due - now));
  const next = { x: d.pos.x + (d.target.x - d.pos.x) * k, y: d.pos.y + (d.target.y - d.pos.y) * k };
  const at = screen.getCursorScreenPoint();
  if (Math.hypot(at.x - d.anchor.x, at.y - d.anchor.y) > CLUTCH) {
    // The cursor is far from where it began: let go, jump back and grab again once the
    // hand has moved on, so the drag never reaches the edge of the 3D view. Programs that
    // hold the cursor still while they turn the view never get here.
    letGo(d, m);
    d.target = { x: d.target.x - (d.pos.x - d.anchor.x), y: d.target.y - (d.pos.y - d.anchor.y) };
    d.pos = d.anchor;
    d.carry = { x: 0, y: 0 };
    moveTo(d.anchor);
    d.rest = now + STEP * 4;   // the program sees the cursor back before the buttons go down
    return;
  }
  nudge(d, at, next.x - d.pos.x, next.y - d.pos.y);
  d.pos = next;
}

// Moves the cursor by whole points from where it really is, never back to a place of our
// own: some programs hold the cursor on one spot while they turn the view and read only
// how far it moved, so putting it back where we left it would turn the view again and
// again with the hand held still.
function nudge(d, at, dx, dy) {
  d.carry.x += dx;
  d.carry.y += dy;
  const sx = Math.trunc(d.carry.x);
  const sy = Math.trunc(d.carry.y);
  if (!sx && !sy) return;
  d.carry.x -= sx;
  d.carry.y -= sy;
  moveTo({ x: at.x + sx, y: at.y + sy }, d.buttons[0]);
}

function endDrag() {
  const m = mouse.load();
  if (!drag) return;
  const d = drag;
  drag = null;
  clearInterval(d.timer);
  if (!m) return;
  if (d.pressed) {
    nudge(d, screen.getCursorScreenPoint(), d.target.x - d.pos.x, d.target.y - d.pos.y);
    letGo(d, m);
  }
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
  // 'left+right' holds both buttons together. The right one goes down first and up last,
  // so the left one is never pressed alone: alone it would click in the program.
  const buttons = String(button).split('+').sort((a, b) => (b === 'right') - (a === 'right'));
  if (!buttons.every((b) => ['left', 'middle', 'right'].includes(b))) return;
  const p = screen.getCursorScreenPoint();
  drag = {
    buttons, keys: (keys || []).filter((k) => ['shift', 'ctrl', 'alt'].includes(k)),
    anchor: p, pos: p, target: p, carry: { x: 0, y: 0 }, pressed: false, rest: 0, due: 0, last: 0, frame: FRAME, timer: null,
  };
});
ipcMain.on('drag:move', (e, dx, dy) => dragMove(dx, dy));
ipcMain.on('drag:end', () => endDrag());
// The wheel goes out in small even parts, so the zoom flows instead of jumping by a few
// steps on each frame of the camera. Windows takes parts of a step; elsewhere the parts
// add up to whole steps.
const WHEEL_PART = process.platform === 'win32' ? 0.2 : 1;
let wheelLeft = 0;
let wheelTimer = null;
ipcMain.on('wheel', (e, steps) => {
  if (!steps || !mouse.load()) return;
  if (Math.sign(steps) !== Math.sign(wheelLeft)) wheelLeft = 0;
  wheelLeft = Math.max(-WHEEL_MAX, Math.min(WHEEL_MAX, wheelLeft + steps));
  wheelTimer ||= setInterval(() => {
    if (Math.abs(wheelLeft) < WHEEL_PART) {
      clearInterval(wheelTimer);
      wheelTimer = null;
      return;
    }
    const part = Math.sign(wheelLeft) * WHEEL_PART;
    wheelLeft -= part;
    mouse.load()?.wheel(part);
  }, WHEEL_GAP);
});

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
