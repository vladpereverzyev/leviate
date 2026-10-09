// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// Leviate for Dentra Viewer: the hand in front of the webcam turns, pans and zooms the
// models, with the gestures of the Leviate web app (js/gestures.js):
//
//   open hand  -> turns      fist -> pans      thumb and index -> zoom
//
// The Viewer opens the camera and sends its pictures; the hand is found here, by
// MediaPipe on the CPU, and only the moves of the view go back to the Viewer
// (DentraViewer.view.move). Nothing leaves the plugin.

import { FilesetResolver, HandLandmarker } from './vendor/mediapipe/vision_bundle.mjs';
import { GestureEngine, Mode } from './js/gestures.js';
import { Gloves } from './js/gloves.js';
import { VERSION } from './js/version.js';

const Viewer = window.DentraViewer;
const $ = (id) => document.getElementById(id);

// The gains of the web app: the whole camera picture turns the model by 5 radians and
// pans it by about its own size. The Viewer takes at most 0.5 per call.
const TURN = 5;
const PAN = 1.5;
const LIMIT = 0.5;
const FPS = 30;

const BONES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10],
  [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]];
const COLORS = { [Mode.ROTATE]: '#10B279', [Mode.PAN]: '#E0B85A', [Mode.ZOOM]: '#57abd8' };

const TEXT = {
  en: { start: 'Start', stop: 'Stop', rotate: 'Open hand turns', pan: 'Fist pans', zoom: 'Pinch zooms', mirror: 'Mirror',
    loading: 'Loading the hand model…', ready: 'Raise your hand in front of the camera.', noHand: 'No hand',
    Turn: 'Turn', Pan: 'Pan', Zoom: 'Zoom', seen: 'Hand seen', off: 'Press Start and allow the camera.',
    failed: 'Hand tracking failed to start.', camera: 'The camera is not available.' },
  it: { start: 'Avvia', stop: 'Ferma', rotate: 'Mano aperta gira', pan: 'Pugno sposta', zoom: 'Pizzico ingrandisce', mirror: 'Specchio',
    loading: 'Carico il modello della mano…', ready: 'Alza la mano davanti alla camera.', noHand: 'Nessuna mano',
    Turn: 'Gira', Pan: 'Sposta', Zoom: 'Zoom', seen: 'Mano vista', off: 'Premi Avvia e consenti la camera.',
    failed: 'Il tracciamento della mano non parte.', camera: 'La camera non è disponibile.' },
  es: { start: 'Iniciar', stop: 'Parar', rotate: 'Mano abierta gira', pan: 'Puño mueve', zoom: 'Pellizco acerca', mirror: 'Espejo',
    loading: 'Cargando el modelo de la mano…', ready: 'Levanta la mano delante de la cámara.', noHand: 'Sin mano',
    Turn: 'Girar', Pan: 'Mover', Zoom: 'Zoom', seen: 'Mano vista', off: 'Pulsa Iniciar y permite la cámara.',
    failed: 'El seguimiento de la mano no arranca.', camera: 'La cámara no está disponible.' },
  fr: { start: 'Démarrer', stop: 'Arrêter', rotate: 'Main ouverte tourne', pan: 'Poing déplace', zoom: 'Pince zoome', mirror: 'Miroir',
    loading: 'Chargement du modèle de la main…', ready: 'Levez la main devant la caméra.', noHand: 'Pas de main',
    Turn: 'Tourner', Pan: 'Déplacer', Zoom: 'Zoom', seen: 'Main vue', off: 'Appuyez sur Démarrer et autorisez la caméra.',
    failed: 'Le suivi de la main ne démarre pas.', camera: "La caméra n'est pas disponible." },
  de: { start: 'Starten', stop: 'Stoppen', rotate: 'Offene Hand dreht', pan: 'Faust verschiebt', zoom: 'Pinch zoomt', mirror: 'Spiegeln',
    loading: 'Handmodell wird geladen…', ready: 'Heb die Hand vor die Kamera.', noHand: 'Keine Hand',
    Turn: 'Drehen', Pan: 'Verschieben', Zoom: 'Zoom', seen: 'Hand erkannt', off: 'Drück Starten und erlaube die Kamera.',
    failed: 'Die Handerkennung startet nicht.', camera: 'Die Kamera ist nicht verfügbar.' },
};
let t = TEXT.en;
const LABELS = { [Mode.ROTATE]: 'Turn', [Mode.PAN]: 'Pan', [Mode.ZOOM]: 'Zoom' };

const engine = new GestureEngine();
const gloves = new Gloves();
const settings = { mirror: true };
let landmarker = null;
let loading = null;
let running = false;
let latest = null;       // newest picture, waiting for the hand tracking
let scheduled = false;
let lastTs = 0;

function status(text, error = false) {
  $('status').textContent = text;
  $('status').classList.toggle('error', error);
}

function translate() {
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = t[el.dataset.t];
  $('start').textContent = running ? t.stop : t.start;
}

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

const clamp = (v) => Math.max(-LIMIT, Math.min(LIMIT, v));

function apply({ mode, dx, dy, zoom }) {
  if (mode === Mode.ROTATE && (dx || dy)) {
    Viewer.view.move({ rotate: { x: clamp(dy * TURN), y: clamp(dx * TURN), z: 0 } });
  } else if (mode === Mode.PAN && (dx || dy)) {
    Viewer.view.move({ pan: { x: clamp(dx * PAN), y: clamp(-dy * PAN) } });
  } else if (mode === Mode.ZOOM && zoom !== 1) {
    Viewer.view.move({ zoom: clamp(zoom - 1) });
  }
}

function draw(image, lm, mode) {
  const canvas = $('view');
  const ctx = canvas.getContext('2d');
  if (canvas.width !== image.width || canvas.height !== image.height) {
    canvas.width = image.width;
    canvas.height = image.height;
  }
  ctx.save();
  if (settings.mirror) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
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

// Only the newest picture is tracked: when the hand tracking is slower than the camera,
// the pictures in between are dropped instead of piling up.
function onFrame(image) {
  if (!running) { image.close?.(); return; }
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
  if (!image || !running || !landmarker) { image?.close?.(); return; }
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
  const cmd = engine.update(lm, { mirror: settings.mirror });
  apply(cmd);
  draw(image, lm, cmd.mode);
  image.close?.();
  const badge = $('badge');
  badge.hidden = false;
  badge.textContent = !lm ? t.noHand : t[LABELS[cmd.mode]] || t.seen;
  badge.style.color = (lm && COLORS[cmd.mode]) || '#7d90a0';
}

async function start() {
  running = true;
  translate();
  $('start').classList.add('on');
  status(t.loading);
  try {
    landmarker = await loadLandmarker();
  } catch (err) {
    console.error(err);
    stop();
    loading = null;
    status(`${t.failed} ${err?.message || ''}`, true);
    return;
  }
  if (!running) return;
  engine.reset();
  Viewer.camera.start({ fps: FPS, width: 640 });
  status(t.ready);
}

function stop() {
  running = false;
  Viewer.camera.stop();
  latest?.close?.();
  latest = null;
  engine.reset();
  $('badge').hidden = true;
  $('start').classList.remove('on');
  translate();
  status(t.off);
}

async function setup() {
  $('version').textContent = VERSION;
  const info = await Viewer.ready();
  t = TEXT[String(info?.language || 'en').slice(0, 2)] || TEXT.en;
  translate();
  status(t.off);
  Viewer.panel.height(220);
  const saved = await Viewer.storage.get().catch(() => null);
  if (saved && typeof saved.mirror === 'boolean') settings.mirror = saved.mirror;
  $('mirror').checked = settings.mirror;
  $('mirror').onchange = (e) => {
    settings.mirror = e.target.checked;
    Viewer.storage.set({ ...settings });
  };
  $('start').onclick = () => (running ? stop() : start());
  Viewer.camera.onFrame(onFrame);
  Viewer.camera.onStatus?.((s) => {
    // The Viewer tells whether the camera is on, or why not: a refusal stops Leviate.
    const why = typeof s === 'string' ? s : s?.error || s?.reason || s?.message || '';
    if (running && (s?.error || /denied|blocked|error|not allowed|unavailable|refus/i.test(why))) {
      stop();
      status(`${t.camera} ${why}`.trim(), true);
    }
  });
  // The hand model loads while the dentist looks around, so Start answers at once.
  loadLandmarker().catch(() => { loading = null; });
}

setup();
