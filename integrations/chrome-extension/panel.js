// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// The side panel of the Chrome extension: camera or phone, hand tracking and the two
// modules of Leviate for Desktop, played in the page of the active tab (page.js).
//
//   3D     renderer/control3d.js turns the gestures into drags and wheel steps
//   Mouse  renderer/pointer.js moves a cursor in the page and clicks
//
// Hand tracking runs on a timer with the hand worker of the web app, so it keeps going
// while the page has the focus. Closing the side panel stops everything.

import './no-banner.js';
import { GestureEngine, Mode } from './js/gestures.js';
import { frameBitmap } from './js/gloves.js';
import { hostPhone, qrSvg } from './js/phone.js';
import { VERSION } from './js/version.js';
import { Control3D, PROFILES } from './renderer/control3d.js';
import { Pointer, Pose } from './renderer/pointer.js';
import { Page } from './page.js';

const $ = (id) => document.getElementById(id);
const STORE_KEY = 'leviate.chrome';
const FPS = 30;
const HOTKEY = 'Alt+Shift+M';
const BONES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10],
  [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]];
const COLORS = {
  [Mode.ROTATE]: '#10B279', [Mode.PAN]: '#E0B85A', [Mode.ZOOM]: '#57abd8',
  [Pose.MOVE]: '#2791CB', [Pose.LEFT]: '#10B279', [Pose.RIGHT]: '#E0B85A',
};
const LABELS = {
  [Mode.ROTATE]: 'Turn', [Mode.PAN]: 'Pan', [Mode.ZOOM]: 'Zoom',
  [Pose.MOVE]: 'Move', [Pose.LEFT]: 'Left click', [Pose.RIGHT]: 'Right click',
};
const BUTTONS = [['left', 'Left button'], ['middle', 'Middle button'], ['right', 'Right button'], ['left+right', 'Left and right buttons']];
const KEYS = [['', 'No key'], ['shift', 'Shift +'], ['ctrl', 'Ctrl +'], ['alt', 'Alt +']];

// In the browser most 3D viewers turn with the left button and pan with the right one.
const settings = {
  mode: 'off', lastMode: '3d', camera: '', mirror: true, collapsed: {},
  profile: 'left-right', customRotate: { button: 'left', keys: [] }, customPan: { button: 'right', keys: [] },
  rotate: 1, pan: 1, zoom: 1, invertZoom: false,
  dwell: 1, reach: 0.6, smoothing: 0.5, ring: true, phoneNotice: false,
};
try { Object.assign(settings, JSON.parse(localStorage.getItem(STORE_KEY)) || {}); } catch {}
// The hand starts off every time the panel opens: it takes over the page only when asked to.
settings.mode = 'off';
const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch {} };

const page = new Page({ onError: showError });
const engine = new GestureEngine();
const control3d = new Control3D(page, settings);
const pointer = new Pointer({
  move: (u, v) => page.move(u, v),
  click: (button) => page.click(button),
}, settings);

const video = $('video');
let stream = null;
let phone = null;          // pairing session while waiting for or using the phone
let facing = 'user';       // camera of the phone
let worker = null;
let busy = false;
let lastTime = -1;
let timer = null;
let frames = 0;
let fpsStart = performance.now();
let lastRing = '';

// ------------------------------------------------------------- tracking

function startWorker() {
  return new Promise((resolve, reject) => {
    const w = new Worker('hand-worker.js');
    w.onerror = (e) => reject(new Error(e.message || 'Hand tracking failed to start'));
    w.onmessage = ({ data }) => {
      if (data.type === 'loaded') w.postMessage({ type: 'init' });
      else if (data.type === 'error') reject(new Error(data.message));
      else if (data.type === 'ready') {
        w.onmessage = ({ data: msg }) => {
          if (msg.type !== 'result') return;
          busy = false;
          if (stream) onHand(msg.lm);
        };
        resolve(w);
      }
    };
  });
}

function tick() {
  if (!worker || !stream || busy || video.readyState < 2 || video.currentTime === lastTime) return;
  lastTime = video.currentTime;
  busy = true;
  frameBitmap(video)
    .then((bitmap) => worker.postMessage({ type: 'frame', bitmap, ts: performance.now() }, [bitmap]))
    .catch(() => { busy = false; });
}

const mirrored = () => (phone ? facing === 'user' : settings.mirror);

function onHand(lm) {
  const mirror = mirrored();
  let pose = null;
  if (settings.mode === '3d') {
    const cmd = engine.update(lm, { mirror });
    control3d.update(cmd);
    pose = lm ? cmd.mode : null;
  } else if (settings.mode === 'mouse') {
    pointer.update(lm, mirror);
    pose = lm ? pointer.mode : null;
  }
  ring();
  draw(lm, pose);
  showPose(lm, pose);

  frames++;
  const now = performance.now();
  if (now - fpsStart >= 1000) {
    camInfo(`${Math.round(frames * 1000 / (now - fpsStart))} fps`);
    frames = 0;
    fpsStart = now;
  }
}

function ring() {
  const show = settings.mode === 'mouse' && settings.ring
    && (pointer.mode === Pose.LEFT || pointer.mode === Pose.RIGHT) && pointer.progress > 0;
  const state = show ? `${pointer.stage}:${pointer.progress.toFixed(2)}` : '';
  if (state === lastRing) return;
  lastRing = state;
  page.ring(show ? pointer.stage : null, show ? pointer.progress : 0);
}

function draw(lm, pose) {
  const canvas = $('hand');
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  if (!lm || !video.videoWidth) return;
  // Same box as object-fit: contain, mirrored like the video.
  const scale = Math.min(w / video.videoWidth, h / video.videoHeight);
  const iw = video.videoWidth * scale;
  const ih = video.videoHeight * scale;
  const ox = (w - iw) / 2;
  const oy = (h - ih) / 2;
  const mirror = mirrored();
  const p = lm.map(({ x, y }) => [ox + (mirror ? 1 - x : x) * iw, oy + y * ih]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = COLORS[pose] || '#7d90a0';
  ctx.beginPath();
  for (const [a, b] of BONES) { ctx.moveTo(...p[a]); ctx.lineTo(...p[b]); }
  ctx.stroke();
  ctx.fillStyle = '#fff';
  for (const [x, y] of p) { ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill(); }
}

function showPose(lm, pose) {
  const badge = $('badge');
  badge.hidden = !stream;
  badge.textContent = !lm ? 'No hand' : LABELS[pose] || 'Hand seen';
  badge.style.color = (lm && COLORS[pose]) || '#7d90a0';
}

// --------------------------------------------------------------- camera

function status(text, error = false) {
  $('status').textContent = text;
  $('status').classList.toggle('error', error);
}

function camInfo(fps = '') {
  const track = stream?.getVideoTracks()[0];
  $('cam-info').textContent = !track ? '' : [
    `${video.videoWidth || track.getSettings().width} × ${video.videoHeight || track.getSettings().height}`,
    fps,
    phone ? 'Phone' : track.label,
  ].filter(Boolean).join(' · ');
}

function setCamUi() {
  const on = !!stream || !!phone;
  $('start').textContent = on ? 'Stop' : 'Start';
  $('start').classList.toggle('on', on);
  $('start').hidden = !!phone && !stream;
  $('phone-link').textContent = !phone ? 'Use phone' : stream ? 'Disconnect phone' : 'Cancel';
  $('phone-link').classList.toggle('on', !!phone);
  $('preview').classList.toggle('mirror', mirrored());
  if (!stream) {
    $('badge').hidden = true;
    draw(null);
  }
  camInfo();
}

async function attach(s) {
  stream = s;
  video.srcObject = s;
  await video.play().catch(() => {});
  engine.reset();
  pointer.reset();
  setCamUi();
  if (!worker) {
    $('badge').hidden = false;
    $('badge').textContent = 'Loading…';
    try {
      worker = await startWorker();
    } catch (err) {
      status(`Hand tracking failed: ${err.message}`, true);
      return;
    }
  }
  timer ||= setInterval(tick, 1000 / FPS);
  status('');
}

function release() {
  // The 3D module may hold a mouse button: let it go when the video stops.
  control3d.stop();
  page.endDrag();
  engine.reset();
  pointer.reset();
  ring();
}

function stopCamera() {
  phone?.close?.();
  phone = null;
  $('qr').hidden = true;
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  video.srcObject = null;
  clearInterval(timer);
  timer = null;
  busy = false;
  release();
  setCamUi();
  status('');
}

async function startWebcam() {
  $('start').textContent = '…';
  const constraints = { audio: false, video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } } };
  if (settings.camera) constraints.video.deviceId = { exact: settings.camera };
  let s;
  try {
    s = await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    if (settings.camera && err.name === 'OverconstrainedError') {
      settings.camera = '';
      save();
      return startWebcam();
    }
    setCamUi();
    if (err.name === 'NotAllowedError') {
      // The side panel cannot show the question of Chrome: a tab asks once.
      status('Allow the camera in the tab that just opened, then press Start again.');
      chrome.tabs.create({ url: chrome.runtime.getURL('camera.html') });
      return;
    }
    status(`Camera not available. ${err.message}`, true);
    return;
  }
  await listCameras();
  await attach(s);
}

async function startPhone() {
  const session = phone = {};
  $('qr-code').replaceChildren();
  $('qr-text').textContent = 'Connecting…';
  $('preview').classList.remove('mirror');
  $('qr').hidden = false;
  setCamUi();
  try {
    const host = await hostPhone({
      onStream: (s, f) => {
        if (phone !== session) return;
        facing = f;
        $('qr').hidden = true;
        attach(s);
      },
      onFacing: (f) => { facing = f; setCamUi(); },
      onHangUp: () => {
        if (phone !== session) return;
        stream = null;
        video.srcObject = null;
        release();
        setCamUi();
        $('qr').hidden = false;
        $('qr-text').textContent = 'Phone disconnected. Tap Start camera on the phone or scan again';
      },
      onEnd: () => { if (phone === session) stopCamera(); },
    });
    if (phone !== session) { host.close(); return; }
    session.close = host.close;
    session.url = host.url;
    $('qr-code').innerHTML = qrSvg(host.url);
    $('qr-text').textContent = 'Scan with your phone. Same Wi‑Fi on both';
    status('');
  } catch (err) {
    if (phone === session) stopCamera();
    status(`Phone pairing is not available. ${err.message}`, true);
  }
}

async function listCameras() {
  const cams = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
  const select = $('camera');
  select.replaceChildren(new Option('Default camera', ''),
    ...cams.map((d, i) => new Option(d.label || `Camera ${i + 1}`, d.deviceId)));
  select.value = cams.some((c) => c.deviceId === settings.camera) ? settings.camera : '';
}

// ------------------------------------------------------------------- UI

function showError(text) {
  if (text && settings.mode !== 'off' && /stopped Leviate/.test(text)) setMode('off');
  $('error').textContent = text;
  $('error').hidden = !text;
}

function setMode(mode) {
  release();
  if (mode !== 'off') settings.lastMode = mode;
  settings.mode = mode;
  save();
  $('error').hidden = true;
  page.hideCursor();
  if (mode === 'off') page.stop();
  else page.start();
  showSettings();
}

function modeInfo() {
  if (settings.mode === 'off') return `The hand only shows in the preview. ${HOTKEY} turns it on from any page.`;
  return settings.mode === '3d' ? `The hand turns, pans and zooms the 3D view under the mouse in the page. ${HOTKEY} turns it off.`
    : `The hand moves a cursor in the page and clicks. ${HOTKEY} turns it off.`;
}

function showSettings() {
  for (const b of $('mode').children) b.classList.toggle('on', b.dataset.value === settings.mode);
  $('mode-info').textContent = modeInfo();
  $('panel-3d').hidden = settings.mode !== '3d';
  $('panel-mouse').hidden = settings.mode !== 'mouse';
  $('mirror').checked = settings.mirror;
  $('profile').value = settings.profile;
  $('custom').hidden = settings.profile !== 'custom';
  $('c-rotate-button').value = settings.customRotate.button;
  $('c-rotate-keys').value = settings.customRotate.keys[0] || '';
  $('c-pan-button').value = settings.customPan.button;
  $('c-pan-keys').value = settings.customPan.keys[0] || '';
  for (const key of ['invertZoom', 'ring']) $(key).checked = settings[key];
  $('preview').classList.toggle('mirror', mirrored());
}

const FORMAT = {
  dwell: (v) => `${v.toFixed(1)} s`,
  reach: (v) => `${Math.round(v * 100)}%`,
  smoothing: (v) => `${Math.round(v * 100)}%`,
  rotate: (v) => `${v.toFixed(2)}×`,
  pan: (v) => `${v.toFixed(2)}×`,
  zoom: (v) => `${v.toFixed(2)}×`,
};

function setup() {
  $('footer-version').textContent = 'v' + VERSION;

  // Viewers in the browser first, then the programs of Leviate for Desktop.
  const web = PROFILES.find((p) => p.id === 'left-right');
  $('profile').replaceChildren(...[web, ...PROFILES.filter((p) => p !== web)].map((p) => new Option(p.name, p.id)));
  for (const id of ['c-rotate-button', 'c-pan-button']) $(id).replaceChildren(...BUTTONS.map(([v, t]) => new Option(t, v)));
  for (const id of ['c-rotate-keys', 'c-pan-keys']) $(id).replaceChildren(...KEYS.map(([v, t]) => new Option(t, v)));

  for (const b of $('mode').children) b.onclick = () => setMode(b.dataset.value);
  $('start').onclick = () => (stream || phone ? stopCamera() : startWebcam());
  $('phone-link').onclick = () => {
    if (phone) return stopCamera();
    if (!settings.phoneNotice) {
      $('phone-notice').hidden = false;
      return;
    }
    stopCamera();
    startPhone();
  };
  $('phone-go').onclick = () => {
    settings.phoneNotice = true;
    save();
    $('phone-notice').hidden = true;
    stopCamera();
    startPhone();
  };
  $('phone-cancel').onclick = () => { $('phone-notice').hidden = true; };
  for (const win of document.querySelectorAll('.win')) {
    win.classList.toggle('collapsed', settings.collapsed[win.id] ?? win.hasAttribute('data-folded'));
    win.querySelector('.win-head').onclick = () => {
      settings.collapsed[win.id] = win.classList.toggle('collapsed');
      save();
    };
  }
  $('camera').onchange = (e) => {
    settings.camera = e.target.value;
    save();
    if (stream && !phone) { stopCamera(); startWebcam(); }
  };
  $('mirror').onchange = (e) => { settings.mirror = e.target.checked; save(); showSettings(); };
  $('profile').onchange = (e) => { release(); settings.profile = e.target.value; save(); showSettings(); };
  const custom = (key, field) => (e) => {
    release();
    settings[key] = { ...settings[key], [field]: field === 'keys' ? (e.target.value ? [e.target.value] : []) : e.target.value };
    save();
  };
  $('c-rotate-button').onchange = custom('customRotate', 'button');
  $('c-rotate-keys').onchange = custom('customRotate', 'keys');
  $('c-pan-button').onchange = custom('customPan', 'button');
  $('c-pan-keys').onchange = custom('customPan', 'keys');
  for (const key of ['invertZoom', 'ring']) {
    $(key).onchange = (e) => { settings[key] = e.target.checked; save(); ring(); };
  }
  for (const [key, format] of Object.entries(FORMAT)) {
    const input = $(key);
    const out = input.parentElement.querySelector('output');
    input.value = settings[key];
    out.textContent = format(settings[key]);
    input.oninput = () => {
      settings[key] = Number(input.value);
      out.textContent = format(settings[key]);
      if (key in pointer) pointer[key] = settings[key];
      save();
    };
  }
  $('qr-code').onclick = async () => {
    if (!phone?.url) return;
    try {
      await navigator.clipboard.writeText(phone.url);
      status('Link copied');
    } catch {}
  };

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'toggle') setMode(settings.mode === 'off' ? settings.lastMode : 'off');
    if (msg?.type === 'camera-allowed' && !stream && !phone) startWebcam();
  });
  // The page leaves no button held when the panel closes.
  addEventListener('pagehide', () => { release(); page.stop(); });
  navigator.mediaDevices.addEventListener?.('devicechange', () => { if (stream) listCameras(); });
  showSettings();
}

setup();
