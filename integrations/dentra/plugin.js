// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// Leviate for Dentra Viewer: the hand in front of the webcam, or of the phone, turns, pans
// and zooms the models, with the gestures of the Leviate web app (js/gestures.js):
//
//   open hand  -> turns      fist -> pans      thumb and index -> zoom
//
// The Viewer opens the camera and sends its pictures; with Use phone the pictures come
// from the phone through WebRTC, paired with a QR code as in the other Leviate apps. The
// hand is found here, by MediaPipe on the CPU, and only the moves of the view go back to
// the Viewer (DentraViewer.view.move).

import { FilesetResolver, HandLandmarker } from './vendor/mediapipe/vision_bundle.mjs';
import { GestureEngine, Mode } from './js/gestures.js';
import { Gloves } from './js/gloves.js';
import { hostPhone, qrSvg } from './js/phone.js';
import { VERSION } from './js/version.js';

const Viewer = window.DentraViewer;
const $ = (id) => document.getElementById(id);

// The whole camera picture pans the model by about its own size. The Viewer takes at
// most 0.5 per call.
const PAN = 1.5;
const LIMIT = 0.5;

const BONES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10],
  [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]];
const COLORS = { [Mode.ROTATE]: '#10B279', [Mode.PAN]: '#E0B85A', [Mode.ZOOM]: '#57abd8' };
const LABELS = { [Mode.ROTATE]: 'Turn', [Mode.PAN]: 'Pan', [Mode.ZOOM]: 'Zoom' };

const TEXT = {
  en: { start: 'Start', stop: 'Stop', usePhone: 'Use phone', cancel: 'Cancel', disconnect: 'Disconnect phone', continue: 'Continue',
    rotate: 'Open hand turns', pan: 'Fist pans', zoom: 'Pinch zooms', reset: 'Reset the view',
    camera: 'Camera', gestures: 'Gestures', mirror: 'Mirror', sRotate: 'Turn', sPan: 'Pan', sZoom: 'Zoom', sSmooth: 'Smooth', invertZoom: 'Invert zoom',
    loading: 'Loading the hand model…', ready: 'Raise your hand in front of the camera.', noHand: 'No hand',
    Turn: 'Turn', Pan: 'Pan', Zoom: 'Zoom', seen: 'Hand seen', off: 'Press Start and allow the camera, or use your phone.',
    failed: 'Hand tracking failed to start.', cameraOff: 'The camera is not available.',
    connecting: 'Connecting…', scan: 'Scan with your phone. Same Wi‑Fi on both', phoneLeft: 'Phone disconnected. Tap Start camera on the phone or scan again',
    phoneOn: 'The phone is the camera.', phoneFailed: 'Phone pairing is not available.',
    noticeTitle: 'Your phone becomes the camera of Leviate. Connect the phone and this computer to the same Wi‑Fi network.',
    noticeText: 'To find each other, the phone and this computer go through the free PeerJS server (0.peerjs.com) and a STUN server of Google, which see the IP addresses of both devices but never the video. The video goes straight from the phone to this computer, encrypted and never recorded.' },
  it: { start: 'Avvia', stop: 'Ferma', usePhone: 'Usa telefono', cancel: 'Annulla', disconnect: 'Scollega telefono', continue: 'Continua',
    rotate: 'Mano aperta gira', pan: 'Pugno sposta', zoom: 'Pizzico ingrandisce', reset: 'Rimetti la vista',
    camera: 'Camera', gestures: 'Gesti', mirror: 'Specchio', sRotate: 'Gira', sPan: 'Sposta', sZoom: 'Zoom', sSmooth: 'Morbido', invertZoom: 'Inverti zoom',
    loading: 'Carico il modello della mano…', ready: 'Alza la mano davanti alla camera.', noHand: 'Nessuna mano',
    Turn: 'Gira', Pan: 'Sposta', Zoom: 'Zoom', seen: 'Mano vista', off: 'Premi Avvia e consenti la camera, oppure usa il telefono.',
    failed: 'Il tracciamento della mano non parte.', cameraOff: 'La camera non è disponibile.',
    connecting: 'Mi collego…', scan: 'Inquadra col telefono. Stessa rete Wi‑Fi', phoneLeft: 'Telefono scollegato. Tocca Start camera sul telefono o inquadra di nuovo',
    phoneOn: 'Il telefono è la camera.', phoneFailed: 'Il collegamento col telefono non è disponibile.',
    noticeTitle: 'Il telefono diventa la camera di Leviate. Collega il telefono e questo computer alla stessa rete Wi‑Fi.',
    noticeText: 'Per trovarsi, il telefono e questo computer passano dal server gratuito PeerJS (0.peerjs.com) e da un server STUN di Google, che vedono gli indirizzi IP dei due dispositivi ma mai il video. Il video va dritto dal telefono a questo computer, cifrato e mai registrato.' },
  es: { start: 'Iniciar', stop: 'Parar', usePhone: 'Usar teléfono', cancel: 'Cancelar', disconnect: 'Desconectar teléfono', continue: 'Continuar',
    rotate: 'Mano abierta gira', pan: 'Puño mueve', zoom: 'Pellizco acerca', reset: 'Restablecer la vista',
    camera: 'Cámara', gestures: 'Gestos', mirror: 'Espejo', sRotate: 'Girar', sPan: 'Mover', sZoom: 'Zoom', sSmooth: 'Suave', invertZoom: 'Invertir zoom',
    loading: 'Cargando el modelo de la mano…', ready: 'Levanta la mano delante de la cámara.', noHand: 'Sin mano',
    Turn: 'Girar', Pan: 'Mover', Zoom: 'Zoom', seen: 'Mano vista', off: 'Pulsa Iniciar y permite la cámara, o usa el teléfono.',
    failed: 'El seguimiento de la mano no arranca.', cameraOff: 'La cámara no está disponible.',
    connecting: 'Conectando…', scan: 'Escanea con el teléfono. Misma red Wi‑Fi', phoneLeft: 'Teléfono desconectado. Toca Start camera en el teléfono o escanea de nuevo',
    phoneOn: 'El teléfono es la cámara.', phoneFailed: 'La conexión con el teléfono no está disponible.',
    noticeTitle: 'Tu teléfono se convierte en la cámara de Leviate. Conecta el teléfono y este ordenador a la misma red Wi‑Fi.',
    noticeText: 'Para encontrarse, el teléfono y este ordenador pasan por el servidor gratuito PeerJS (0.peerjs.com) y un servidor STUN de Google, que ven las direcciones IP de ambos dispositivos pero nunca el vídeo. El vídeo va directo del teléfono a este ordenador, cifrado y nunca grabado.' },
  fr: { start: 'Démarrer', stop: 'Arrêter', usePhone: 'Utiliser le téléphone', cancel: 'Annuler', disconnect: 'Déconnecter le téléphone', continue: 'Continuer',
    rotate: 'Main ouverte tourne', pan: 'Poing déplace', zoom: 'Pince zoome', reset: 'Rétablir la vue',
    camera: 'Caméra', gestures: 'Gestes', mirror: 'Miroir', sRotate: 'Tourner', sPan: 'Déplacer', sZoom: 'Zoom', sSmooth: 'Fluide', invertZoom: 'Inverser le zoom',
    loading: 'Chargement du modèle de la main…', ready: 'Levez la main devant la caméra.', noHand: 'Pas de main',
    Turn: 'Tourner', Pan: 'Déplacer', Zoom: 'Zoom', seen: 'Main vue', off: 'Appuyez sur Démarrer et autorisez la caméra, ou utilisez le téléphone.',
    failed: 'Le suivi de la main ne démarre pas.', cameraOff: "La caméra n'est pas disponible.",
    connecting: 'Connexion…', scan: 'Scannez avec le téléphone. Même réseau Wi‑Fi', phoneLeft: 'Téléphone déconnecté. Touchez Start camera sur le téléphone ou scannez à nouveau',
    phoneOn: 'Le téléphone est la caméra.', phoneFailed: "La connexion avec le téléphone n'est pas disponible.",
    noticeTitle: 'Votre téléphone devient la caméra de Leviate. Connectez le téléphone et cet ordinateur au même réseau Wi‑Fi.',
    noticeText: 'Pour se trouver, le téléphone et cet ordinateur passent par le serveur gratuit PeerJS (0.peerjs.com) et un serveur STUN de Google, qui voient les adresses IP des deux appareils mais jamais la vidéo. La vidéo va directement du téléphone à cet ordinateur, chiffrée et jamais enregistrée.' },
  de: { start: 'Starten', stop: 'Stoppen', usePhone: 'Handy nutzen', cancel: 'Abbrechen', disconnect: 'Handy trennen', continue: 'Weiter',
    rotate: 'Offene Hand dreht', pan: 'Faust verschiebt', zoom: 'Pinch zoomt', reset: 'Ansicht zurücksetzen',
    camera: 'Kamera', gestures: 'Gesten', mirror: 'Spiegeln', sRotate: 'Drehen', sPan: 'Verschieben', sZoom: 'Zoom', sSmooth: 'Weich', invertZoom: 'Zoom umkehren',
    loading: 'Handmodell wird geladen…', ready: 'Heb die Hand vor die Kamera.', noHand: 'Keine Hand',
    Turn: 'Drehen', Pan: 'Verschieben', Zoom: 'Zoom', seen: 'Hand erkannt', off: 'Drück Starten und erlaube die Kamera, oder nutze dein Handy.',
    failed: 'Die Handerkennung startet nicht.', cameraOff: 'Die Kamera ist nicht verfügbar.',
    connecting: 'Verbinde…', scan: 'Mit dem Handy scannen. Gleiches WLAN', phoneLeft: 'Handy getrennt. Tipp auf Start camera am Handy oder scanne erneut',
    phoneOn: 'Das Handy ist die Kamera.', phoneFailed: 'Die Verbindung mit dem Handy ist nicht verfügbar.',
    noticeTitle: 'Dein Handy wird zur Kamera von Leviate. Verbinde Handy und Computer mit demselben WLAN.',
    noticeText: 'Um sich zu finden, gehen Handy und Computer über den kostenlosen PeerJS-Server (0.peerjs.com) und einen STUN-Server von Google, die die IP-Adressen beider Geräte sehen, aber nie das Video. Das Video geht direkt vom Handy zu diesem Computer, verschlüsselt und nie aufgezeichnet.' },
};
let t = TEXT.en;

const settings = {
  mirror: true, quality: 640, fps: 30,
  rotate: 5, pan: 1, zoom: 1, smooth: 0.5, invertZoom: false, phoneNotice: false,
};
const engine = new GestureEngine();
const gloves = new Gloves();
let landmarker = null;
let loading = null;
let source = null;       // 'camera' or 'phone' while pictures come in
let phone = null;        // pairing session while waiting for or using the phone
let facing = 'user';     // camera of the phone
let phoneVideo = null;
let phoneTimer = null;
let latest = null;       // newest picture, waiting for the hand tracking
let scheduled = false;
let lastTs = 0;

// ------------------------------------------------------------------ UI

function status(text, error = false) {
  $('status').textContent = text;
  $('status').classList.toggle('error', error);
  fitPanel();
}

function translate() {
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = t[el.dataset.t];
  $('start').textContent = source === 'camera' ? t.stop : t.start;
  $('start').classList.toggle('on', source === 'camera');
  $('phone').textContent = !phone ? t.usePhone : source === 'phone' ? t.disconnect : t.cancel;
  $('phone').classList.toggle('on', !!phone);
}

// The panel as tall as what it shows, within what the Viewer allows.
let lastHeight = 0;
function fitPanel() {
  if (!Viewer) return;
  const height = Math.max(80, Math.min(560, Math.ceil(document.documentElement.scrollHeight) + 2));
  if (Math.abs(height - lastHeight) < 4) return;
  lastHeight = height;
  Viewer.panel.height(height);
}

const save = () => Viewer.storage.set({ ...settings });

const FORMAT = {
  rotate: (v) => `${v.toFixed(1)}×`,
  panSpeed: (v) => `${v.toFixed(2)}×`,
  zoomSpeed: (v) => `${v.toFixed(2)}×`,
  smooth: (v) => `${Math.round(v * 100)}%`,
};
const KEY = { rotate: 'rotate', panSpeed: 'pan', zoomSpeed: 'zoom', smooth: 'smooth' };

function setupOptions() {
  $('mirror').checked = settings.mirror;
  $('invertZoom').checked = settings.invertZoom;
  $('quality').value = String(settings.quality);
  $('fps').value = String(settings.fps);
  $('mirror').onchange = (e) => { settings.mirror = e.target.checked; save(); };
  $('invertZoom').onchange = (e) => { settings.invertZoom = e.target.checked; save(); };
  const restart = () => {
    if (source !== 'camera') return;
    Viewer.camera.stop();
    Viewer.camera.start({ fps: settings.fps, width: settings.quality });
  };
  $('quality').onchange = (e) => { settings.quality = Number(e.target.value); save(); restart(); };
  $('fps').onchange = (e) => { settings.fps = Number(e.target.value); save(); restart(); };
  for (const [id, format] of Object.entries(FORMAT)) {
    const input = $(id);
    const out = input.parentElement.querySelector('output');
    input.value = settings[KEY[id]];
    out.textContent = format(settings[KEY[id]]);
    input.oninput = () => {
      settings[KEY[id]] = Number(input.value);
      out.textContent = format(settings[KEY[id]]);
      engine.smoothing = 1 - settings.smooth;
      save();
    };
  }
  // Smooth as in the web app: more smoothing, less of each new frame.
  engine.smoothing = 1 - settings.smooth;
  for (const d of document.querySelectorAll('details')) d.addEventListener('toggle', fitPanel);
}

// --------------------------------------------------------------- tracking

function loadLandmarker() {
  loading ||= (async () => {
    const fileset = await FilesetResolver.forVisionTasks(new URL('./vendor/mediapipe/wasm', import.meta.url).href);
    return HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: new URL('./models/hand_landmarker.task', import.meta.url).href, delegate: 'CPU' },
      runningMode: 'VIDEO',
      numHands: 1,
      minHandDetectionConfidence: 0.6,
      minHandPresenceConfidence: 0.6,
      minTrackingConfidence: 0.5,
    });
  })();
  return loading;
}

async function ensureLandmarker() {
  if (landmarker) return true;
  status(t.loading);
  try {
    landmarker = await loadLandmarker();
    return true;
  } catch (err) {
    console.error(err);
    loading = null;
    status(`${t.failed} ${err?.message || ''}`, true);
    return false;
  }
}

const clamp = (v) => Math.max(-LIMIT, Math.min(LIMIT, v));

function apply({ mode, dx, dy, zoom }) {
  if (mode === Mode.ROTATE && (dx || dy)) {
    Viewer.view.move({ rotate: { x: clamp(dy * settings.rotate), y: clamp(dx * settings.rotate), z: 0 } });
  } else if (mode === Mode.PAN && (dx || dy)) {
    const k = PAN * settings.pan;
    Viewer.view.move({ pan: { x: clamp(dx * k), y: clamp(-dy * k) } });
  } else if (mode === Mode.ZOOM && zoom !== 1) {
    const z = Math.pow(zoom, settings.zoom * (settings.invertZoom ? -1 : 1)) - 1;
    Viewer.view.move({ zoom: clamp(z) });
  }
}

const mirrored = () => (source === 'phone' ? facing === 'user' : settings.mirror);

function draw(image, lm, mode) {
  const canvas = $('view');
  const ctx = canvas.getContext('2d');
  if (canvas.width !== image.width || canvas.height !== image.height) {
    canvas.width = image.width;
    canvas.height = image.height;
  }
  ctx.save();
  if (mirrored()) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
  ctx.drawImage(image, 0, 0);
  if (lm) {
    const p = lm.map(({ x, y }) => [x * canvas.width, y * canvas.height]);
    ctx.lineWidth = Math.max(2, canvas.width / 200);
    ctx.strokeStyle = COLORS[mode] || '#7d90a0';
    ctx.beginPath();
    for (const [a, b] of BONES) { ctx.moveTo(...p[a]); ctx.lineTo(...p[b]); }
    ctx.stroke();
    ctx.fillStyle = '#fff';
    for (const [x, y] of p) { ctx.beginPath(); ctx.arc(x, y, ctx.lineWidth * 1.3, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}

function clearPreview() {
  const canvas = $('view');
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  $('badge').hidden = true;
}

// Only the newest picture is tracked: when the hand tracking is slower than the camera,
// the pictures in between are dropped instead of piling up.
function onFrame(image) {
  if (!source || !landmarker) { image.close?.(); return; }
  latest?.close?.();
  latest = image;
  if (scheduled) return;
  scheduled = true;
  setTimeout(track, 0);
}

function track() {
  scheduled = false;
  const image = latest;
  latest = null;
  if (!image || !source || !landmarker) { image?.close?.(); return; }
  const ts = Math.max(performance.now(), lastTs + 1);
  lastTs = ts;
  let lm = null;
  try {
    const filter = gloves.next();
    const input = filter ? gloves.apply(image, image.width, image.height, filter) : image;
    lm = landmarker.detectForVideo(input, ts).landmarks?.[0] || null;
    gloves.seen(!!lm, filter);
  } catch (err) {
    console.error(err);
  }
  const cmd = engine.update(lm, { mirror: mirrored() });
  apply(cmd);
  draw(image, lm, cmd.mode);
  image.close?.();
  const badge = $('badge');
  badge.hidden = false;
  badge.textContent = !lm ? t.noHand : t[LABELS[cmd.mode]] || t.seen;
  badge.style.color = (lm && COLORS[cmd.mode]) || '#7d90a0';
}

// ----------------------------------------------------------------- camera

async function startCamera() {
  stopAll();
  source = 'camera';
  translate();
  if (!await ensureLandmarker()) { stopAll(false); return; }
  if (source !== 'camera') return;
  engine.reset();
  Viewer.camera.start({ fps: settings.fps, width: settings.quality });
  status(t.ready);
}

// Everything off. With clearStatus false an error stays on screen.
function stopAll(clearStatus = true) {
  if (source === 'camera') Viewer.camera.stop();
  source = null;
  phone?.close?.();
  phone = null;
  clearInterval(phoneTimer);
  phoneTimer = null;
  if (phoneVideo) { phoneVideo.srcObject = null; phoneVideo = null; }
  $('qr').hidden = true;
  latest?.close?.();
  latest = null;
  engine.reset();
  clearPreview();
  translate();
  if (clearStatus) status(t.off);
}

// ------------------------------------------------------------------ phone

// The video of the phone, read at the frame rate and size chosen under Camera.
function watchPhone(stream) {
  phoneVideo = document.createElement('video');
  phoneVideo.muted = true;
  phoneVideo.playsInline = true;
  phoneVideo.srcObject = stream;
  phoneVideo.play().catch(() => {});
  clearInterval(phoneTimer);
  let last = -1;
  phoneTimer = setInterval(async () => {
    const v = phoneVideo;
    if (!v || v.readyState < 2 || v.currentTime === last) return;
    last = v.currentTime;
    const scale = Math.min(1, settings.quality / Math.max(v.videoWidth, 1));
    try {
      onFrame(await createImageBitmap(v, { resizeWidth: Math.round(v.videoWidth * scale), resizeHeight: Math.round(v.videoHeight * scale) }));
    } catch {}
  }, 1000 / settings.fps);
}

async function startPhone() {
  stopAll();
  const session = phone = {};
  translate();
  $('qr-code').replaceChildren();
  $('qr-text').textContent = t.connecting;
  $('qr').hidden = false;
  status('');
  if (!await ensureLandmarker() || phone !== session) return;
  status('');
  try {
    const host = await hostPhone({
      publicOnly: true,
      onStream: (stream, f) => {
        if (phone !== session) return;
        facing = f;
        source = 'phone';
        $('qr').hidden = true;
        engine.reset();
        watchPhone(stream);
        translate();
        status(t.phoneOn);
      },
      onFacing: (f) => { facing = f; },
      onHangUp: () => {
        if (phone !== session) return;
        source = null;
        clearInterval(phoneTimer);
        phoneVideo = null;
        clearPreview();
        $('qr').hidden = false;
        $('qr-text').textContent = t.phoneLeft;
        translate();
      },
      onEnd: () => { if (phone === session) stopAll(); },
    });
    if (phone !== session) { host.close(); return; }
    session.close = host.close;
    $('qr-code').innerHTML = qrSvg(host.url);
    $('qr-text').textContent = t.scan;
  } catch (err) {
    console.error(err);
    if (phone === session) stopAll(false);
    status(`${t.phoneFailed} ${err?.message || ''}`.trim(), true);
  }
}

// ------------------------------------------------------------------ setup

async function setup() {
  $('version').textContent = 'v' + VERSION;
  const info = await Viewer.ready();
  t = TEXT[String(info?.language || 'en').slice(0, 2)] || TEXT.en;
  const saved = await Viewer.storage.get().catch(() => null);
  if (saved && typeof saved === 'object') {
    for (const key of Object.keys(settings)) if (typeof saved[key] === typeof settings[key]) settings[key] = saved[key];
  }
  translate();
  setupOptions();
  status(t.off);
  fitPanel();
  addEventListener('resize', fitPanel);
  // The font changes the height of the texts once it has loaded.
  document.fonts?.ready.then(fitPanel);

  $('start').onclick = () => (source === 'camera' ? stopAll() : startCamera());
  $('phone').onclick = () => {
    if (phone) return stopAll();
    if (!settings.phoneNotice) {
      $('phone-notice').hidden = false;
      fitPanel();
      return;
    }
    startPhone();
  };
  $('phone-go').onclick = () => {
    settings.phoneNotice = true;
    save();
    $('phone-notice').hidden = true;
    startPhone();
  };
  $('phone-cancel').onclick = () => { $('phone-notice').hidden = true; fitPanel(); };
  $('reset').onclick = () => Viewer.view.reset();

  Viewer.camera.onFrame(onFrame);
  Viewer.camera.onStatus?.((s) => {
    // The Viewer tells whether the camera is on, or why not: a refusal stops Leviate.
    const why = typeof s === 'string' ? s : s?.error || s?.reason || s?.message || '';
    if (source === 'camera' && (s?.error || /denied|blocked|error|not allowed|unavailable|refus/i.test(why))) {
      stopAll(false);
      status(`${t.cameraOff} ${why}`.trim(), true);
    }
  });
  // The hand model loads while the dentist looks around, so Start answers at once.
  loadLandmarker().catch(() => { loading = null; });
}

setup();
