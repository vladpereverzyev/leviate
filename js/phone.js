// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// Use a phone as a webcam.
// The computer shows a QR code with a pairing link. The phone opens the link,
// sends its camera over WebRTC and the computer tracks the hand on that video.
// PeerJS only brokers the connection; the video goes straight between devices.

import qrcode from '../vendor/qrcode/qrcode.mjs';
import { ensure } from './consent.js';

// Phones need https to open the camera, so a computer on localhost pairs
// through the published copy of the app.
export const PUBLIC_URL = 'https://vladpereverzyev.github.io/leviate/';

let peerReady = null;
function loadPeer() {
  peerReady ||= new Promise((resolve, reject) => {
    if (window.Peer) return resolve(window.Peer);
    const s = document.createElement('script');
    s.src = new URL('../vendor/peerjs/peerjs.min.js', import.meta.url).href;
    s.onload = () => resolve(window.Peer);
    s.onerror = () => reject(new Error('Could not load PeerJS'));
    document.head.append(s);
  });
  return peerReady;
}

function randomId() {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return 'leviate-' + [...bytes].map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, 14);
}

function pairingUrl(id) {
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol !== 'https:';
  const base = local ? PUBLIC_URL : location.origin + location.pathname;
  return `${base}?pair=${id}`;
}

export function qrSvg(text) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
}

// ------------------------------------------------------------ computer

// One pairing code per page. The server lets the same id and token back in, so the
// code stays the same each time and a phone paired before only taps Start camera.
let identity = null;

// Waits for a phone. Calls onStream(stream, facing) when video arrives,
// onFacing(facing) when the phone switches camera and onHangUp() when it hangs up:
// the computer then keeps waiting with the same code. onEnd() follows close().
export async function hostPhone({ onStream, onFacing, onHangUp, onEnd, onStatus }) {
  const Peer = await loadPeer();
  identity ||= { id: randomId(), token: randomId().slice(8) };
  const { id } = identity;
  const peer = new Peer(id, { token: identity.token });
  let call = null;
  let closed = false;

  const hangUp = (which) => {
    if (closed || !which || call !== which) return;
    call = null;
    which.close();
    onHangUp?.();
  };

  const end = () => {
    if (closed) return;
    closed = true;
    call?.close();
    peer.destroy();
    onEnd?.();
  };

  await new Promise((resolve, reject) => {
    peer.on('open', resolve);
    peer.on('error', (err) => (closed ? null : reject(err)));
  });
  onStatus?.('waiting');

  peer.on('call', (incoming) => {
    // One phone at a time: a new call replaces the old one.
    const old = call;
    call = incoming;
    old?.close();
    incoming.answer();
    incoming.on('stream', (s) => onStream(s, incoming.metadata?.facing || 'user'));
    incoming.on('close', () => hangUp(incoming));
    incoming.peerConnection?.addEventListener('connectionstatechange', () => {
      const state = incoming.peerConnection?.connectionState;
      if (state === 'failed' || state === 'closed') hangUp(incoming);
    });
  });
  peer.on('connection', (conn) => {
    conn.on('data', (msg) => {
      if (msg?.facing) onFacing?.(msg.facing);
      if (msg?.bye) hangUp(call);
    });
  });
  peer.on('disconnected', () => { if (!call) peer.reconnect(); });

  return { url: pairingUrl(id), close: end };
}

// --------------------------------------------------------------- phone

let jsQRReady = null;
function loadJsQR() {
  jsQRReady ||= new Promise((resolve, reject) => {
    if (window.jsQR) return resolve(window.jsQR);
    const s = document.createElement('script');
    s.src = new URL('../vendor/jsqr/jsQR.js', import.meta.url).href;
    s.onload = () => resolve(window.jsQR);
    s.onerror = () => reject(new Error('Could not load the QR reader'));
    document.head.append(s);
  });
  return jsQRReady;
}

// The pairing id inside a scanned code, or null when it is not a Leviate code.
function pairFromCode(text) {
  try {
    const id = new URL(text).searchParams.get('pair');
    return /^leviate-[a-z0-9]+$/.test(id || '') ? id : null;
  } catch {
    return null;
  }
}

// Reads QR codes from a playing video: the browser's own reader when it has one
// (Chrome on Android), jsQR otherwise (Safari on iPhone).
async function qrReader(video) {
  if ('BarcodeDetector' in window) {
    try {
      if ((await BarcodeDetector.getSupportedFormats()).includes('qr_code')) {
        const detector = new BarcodeDetector({ formats: ['qr_code'] });
        return async () => (await detector.detect(video)).map((c) => c.rawValue);
      }
    } catch { /* fall back to jsQR */ }
  }
  const jsQR = await loadJsQR();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  return async () => {
    const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight, 1));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    if (!canvas.width || !canvas.height) return [];
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const code = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
    return code ? [code.data] : [];
  };
}

export async function runPhoneCamera(pairId) {
  document.body.classList.add('phone-mode');
  const $ = (id) => document.getElementById(id);
  const ui = {
    video: $('pm-video'),
    start: $('pm-start'),
    flip: $('pm-flip'),
    scan: $('pm-scan'),
    status: $('pm-status'),
  };
  $('phone-mode').hidden = false;

  // Always start with the front camera; Flip switches to the rear one.
  let facing = 'user';
  let stream = null;
  let peer = null;
  let call = null;
  let conn = null;
  let wakeLock = null;
  let scanning = null;   // { stream } while the camera looks for a QR code

  const status = (text) => { ui.status.textContent = text; };
  const AGAIN = ' Tap Start camera to connect again, or Scan QR code if the computer shows a new code.';

  // The link is gone: the camera stops and the phone can pair again, with the same
  // code (Start camera) or with a new one read right here (Scan QR code).
  function lost(text) {
    stop();
    status(text + AGAIN);
  }

  async function openCamera() {
    stream?.getTracks().forEach((t) => t.stop());
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
    });
    ui.video.srcObject = stream;
    ui.video.classList.toggle('mirror', facing === 'user');
    await ui.video.play();
  }

  async function start() {
    if (!await ensure('camera', 'external')) {
      status('Allow Camera and External services in the cookie preferences to use this phone as a camera.');
      return;
    }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      status('Open this page over https to use the camera.');
      return;
    }
    stopScan();
    ui.start.disabled = true;
    ui.scan.hidden = true;
    status('Opening the camera…');
    try {
      await openCamera();
      status('Connecting to your computer…');
      const Peer = await loadPeer();
      peer = new Peer();
      await new Promise((resolve, reject) => { peer.on('open', resolve); peer.on('error', reject); });
      // JSON keeps the small control messages readable for the Blender add-on too.
      conn = peer.connect(pairId, { serialization: 'json' });
      call = peer.call(pairId, stream, { metadata: { facing } });
      const mine = call;
      call.peerConnection?.addEventListener('connectionstatechange', () => {
        if (call !== mine) return;
        const state = mine.peerConnection.connectionState;
        if (state === 'connected') status('Connected. Keep this page open and point the camera at your hand.');
        // "disconnected" often comes back by itself, so it only warns.
        if (state === 'disconnected') status('Connection interrupted, trying to get it back…');
        if (state === 'failed') lost('Connection failed. Check that both devices are online.');
        if (state === 'closed') lost('The computer closed the connection.');
      });
      call.on('close', () => { if (call === mine) lost('The computer closed the connection.'); });
      peer.on('error', (err) => {
        if (call !== mine) return;
        // Nobody waits with this code any more: Blender or the page started again.
        if (err.type === 'peer-unavailable') lost('The computer is no longer waiting with this code.');
        else lost('Connection error. ' + err.message);
      });
      ui.start.textContent = 'Stop';
      ui.start.disabled = false;
      ui.flip.hidden = false;
      try { wakeLock = await navigator.wakeLock?.request('screen'); } catch {}
    } catch (err) {
      console.error(err);
      stop();
      status('Could not start. ' + err.message);
    }
  }

  function stop() {
    // Forget the call first, so its close events know it was ended here.
    const [oldCall, oldPeer, oldConn] = [call, peer, conn];
    call = peer = conn = null;
    try { oldConn?.open && oldConn.send({ bye: true }); } catch {}
    oldCall?.close();
    oldPeer?.destroy();
    stream?.getTracks().forEach((t) => t.stop());
    wakeLock?.release?.();
    stream = wakeLock = null;
    ui.video.srcObject = null;
    ui.start.textContent = 'Start camera';
    ui.start.disabled = false;
    ui.flip.hidden = true;
    ui.scan.hidden = false;
  }

  async function scan() {
    if (scanning) {
      stopScan();
      status('Ready. Tap Start camera.');
      return;
    }
    if (!await ensure('camera', 'external')) {
      status('Allow Camera and External services in the cookie preferences to use this phone as a camera.');
      return;
    }
    stop();
    const session = scanning = { stream: null };
    ui.scan.textContent = 'Cancel';
    status('Point the camera at the QR code on the computer.');
    try {
      session.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (scanning !== session) {
        session.stream.getTracks().forEach((t) => t.stop());
        return;
      }
      ui.video.srcObject = session.stream;
      ui.video.classList.remove('mirror');
      await ui.video.play();
      const read = await qrReader(ui.video);
      while (scanning === session) {
        const found = (await read()).map(pairFromCode).find(Boolean);
        if (found && scanning === session) {
          pairId = found;
          // Keep the new code in the address, so a reload pairs with it too.
          history.replaceState(null, '', location.pathname + '?pair=' + found);
          stopScan();
          await start();
          return;
        }
        await new Promise((r) => setTimeout(r, 150));
      }
    } catch (err) {
      console.error(err);
      if (scanning === session) {
        stopScan();
        status('Could not scan. ' + err.message);
      }
    }
  }

  function stopScan() {
    if (!scanning) return;
    scanning.stream?.getTracks().forEach((t) => t.stop());
    scanning = null;
    if (!stream) ui.video.srcObject = null;
    ui.scan.textContent = 'Scan QR code';
  }

  async function flip() {
    facing = facing === 'user' ? 'environment' : 'user';
    try {
      await openCamera();
      const track = stream.getVideoTracks()[0];
      const sender = call?.peerConnection?.getSenders().find((s) => s.track?.kind === 'video');
      await sender?.replaceTrack(track);
      if (conn?.open) conn.send({ facing });
    } catch (err) {
      status('Could not switch camera. ' + err.message);
    }
  }

  ui.start.addEventListener('click', () => {
    if (!stream) return start();
    stop();
    status('Stopped.' + AGAIN);
  });
  ui.flip.addEventListener('click', flip);
  ui.scan.addEventListener('click', scan);
  window.addEventListener('pagehide', () => { stopScan(); stop(); });
  status('Ready. Tap Start camera.');
}
