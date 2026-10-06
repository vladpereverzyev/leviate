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

// Waits for a phone. Calls onStream(stream, facing) when video arrives,
// onFacing(facing) when the phone switches camera and onEnd() when it hangs up.
export async function hostPhone({ onStream, onFacing, onEnd, onStatus }) {
  const Peer = await loadPeer();
  const id = randomId();
  const peer = new Peer(id);
  let call = null;
  let closed = false;

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
    call?.close();
    call = incoming;
    call.answer();
    call.on('stream', (s) => onStream(s, call.metadata?.facing || 'user'));
    call.on('close', end);
    call.peerConnection?.addEventListener('connectionstatechange', () => {
      const state = call?.peerConnection?.connectionState;
      if (state === 'failed' || state === 'closed') end();
    });
  });
  peer.on('connection', (conn) => {
    conn.on('data', (msg) => {
      if (msg?.facing) onFacing?.(msg.facing);
      if (msg?.bye) end();
    });
  });
  peer.on('disconnected', () => { if (!call) peer.reconnect(); });

  return { url: pairingUrl(id), close: end };
}

// --------------------------------------------------------------- phone

export async function runPhoneCamera(pairId) {
  document.body.classList.add('phone-mode');
  const $ = (id) => document.getElementById(id);
  const ui = {
    video: $('pm-video'),
    start: $('pm-start'),
    flip: $('pm-flip'),
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

  const status = (text) => { ui.status.textContent = text; };

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
    ui.start.disabled = true;
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
      call.peerConnection?.addEventListener('connectionstatechange', () => {
        const state = call.peerConnection.connectionState;
        if (state === 'connected') status('Connected. Keep this page open and point the camera at your hand.');
        if (state === 'failed') status('Connection failed. Check that both devices are online and try again.');
        if (state === 'disconnected' || state === 'closed') status('Disconnected.');
      });
      call.on('close', () => status('The computer closed the connection.'));
      peer.on('error', (err) => status('Connection error. ' + err.message));
      ui.start.textContent = 'Stop';
      ui.start.disabled = false;
      ui.flip.hidden = false;
      try { wakeLock = await navigator.wakeLock?.request('screen'); } catch {}
    } catch (err) {
      console.error(err);
      status('Could not start. ' + err.message);
      stop();
    }
  }

  function stop() {
    try { conn?.open && conn.send({ bye: true }); } catch {}
    call?.close();
    peer?.destroy();
    stream?.getTracks().forEach((t) => t.stop());
    wakeLock?.release?.();
    stream = peer = call = conn = wakeLock = null;
    ui.video.srcObject = null;
    ui.start.textContent = 'Start camera';
    ui.start.disabled = false;
    ui.flip.hidden = true;
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

  ui.start.addEventListener('click', () => (stream ? (stop(), status('Stopped.')) : start()));
  ui.flip.addEventListener('click', flip);
  window.addEventListener('pagehide', stop);
  status('Ready. Tap Start camera.');
}
