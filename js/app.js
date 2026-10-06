// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { ThreeMFLoader } from 'three/addons/loaders/3MFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js';
import { TDSLoader } from 'three/addons/loaders/TDSLoader.js';
import { AMFLoader } from 'three/addons/loaders/AMFLoader.js';
import { VTKLoader } from 'three/addons/loaders/VTKLoader.js';
import { PCDLoader } from 'three/addons/loaders/PCDLoader.js';
import { XYZLoader } from 'three/addons/loaders/XYZLoader.js';
import { FilesetResolver, HandLandmarker } from '../vendor/mediapipe/vision_bundle.mjs';
import { GestureEngine, Mode } from './gestures.js';
import { setupWindows } from './windows.js';
import { VERSION } from './version.js';
import { hostPhone, qrSvg, runPhoneCamera } from './phone.js';

const $ = (id) => document.getElementById(id);

$('version').textContent = 'v' + VERSION;

// Opened from the QR code: this device becomes the camera of a computer.
const pairId = new URLSearchParams(location.search).get('pair');
if (pairId) runPhoneCamera(pairId);

const MODE_LABEL = {
  [Mode.NONE]: 'Hand seen',
  [Mode.ROTATE]: 'Rotate',
  [Mode.PAN]: 'Pan',
  [Mode.ZOOM]: 'Zoom',
};
const MODE_COLOR = {
  [Mode.NONE]: '#8b949e',
  [Mode.ROTATE]: '#3fb950',
  [Mode.PAN]: '#d29922',
  [Mode.ZOOM]: '#a371f7',
};
const PALETTE = ['#e9e1d3', '#8ecae6', '#f4a6a6', '#b5e48c', '#cdb4db', '#ffd166'];
const RESOLUTIONS = { 480: [640, 480], 720: [1280, 720], 1080: [1920, 1080] };
const MIN_SCALE = 0.1;
const MAX_SCALE = 20;

// ------------------------------------------------------------- settings

const STORE_KEY = 'leviate.settings';
const settings = {
  device: '', res: '480', fps: '30', facing: 'user', mirror: true,
  gestures: true, rotate: 5, pan: 1, zoom: 1, smooth: 0.5,
};
try { Object.assign(settings, JSON.parse(localStorage.getItem(STORE_KEY)) || {}); } catch {}
function saveSettings() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch {}
}

// ---------------------------------------------------------------- scene

const stage = $('stage');
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
// 1.5 keeps edges sharp on dense screens at a much lower cost than 2 or 3.
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
camera.position.set(0, 0, 3.4);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.saveState();

scene.add(new THREE.HemisphereLight(0xffffff, 0x30363d, 1.6));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
keyLight.position.set(2, 3, 4);
camera.add(keyLight);
scene.add(camera);

// pivot: what gestures and view presets move
// content: centers and fits everything loaded, as one block
// objects keep their file coordinates, so scans stay aligned to each other
const pivot = new THREE.Group();
const content = new THREE.Group();
pivot.add(content);
scene.add(pivot);

function resize() {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // Keep at least 40 degrees horizontally so the model fits on portrait screens.
  const half = THREE.MathUtils.degToRad(20);
  camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(half) / Math.min(1, camera.aspect)));
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);
resize();

function resetView() {
  pivot.position.set(0, 0, 0);
  pivot.quaternion.identity();
  pivot.scale.setScalar(1);
  controls.reset();
  clearFocus();
}

// ----------------------------------------------------- rotation center

// Middle click (or double click / double tap) on the model picks the point every
// rotation turns around. The point is kept in model space, so it stays on the
// model when gestures move or zoom it.
const focusLocal = new THREE.Vector3();
let hasFocus = false;
const raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = 0.01;

const marker = new THREE.Mesh(
  new THREE.SphereGeometry(1, 20, 12),
  new THREE.MeshBasicMaterial({ color: 0x10b279, transparent: true, depthTest: false }),
);
marker.renderOrder = 10;
marker.visible = false;
scene.add(marker);
let markerTime = 0;

function focusWorld(target = new THREE.Vector3()) {
  return hasFocus ? pivot.localToWorld(target.copy(focusLocal)) : target.copy(pivot.position);
}

function clearFocus() {
  hasFocus = false;
  marker.visible = false;
  focusAnim = null;
}

let focusAnim = null;   // { from, to, start } moving the orbit target to the picked point

function pickFocus(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1,
  );
  raycaster.setFromCamera(ndc, camera);
  const visible = content.children.filter((o) => o.visible);
  const hit = raycaster.intersectObjects(visible, true)[0];
  if (!hit) return false;

  pivot.updateMatrixWorld(true);
  focusLocal.copy(pivot.worldToLocal(hit.point.clone()));
  hasFocus = true;
  marker.position.copy(hit.point);
  marker.visible = true;
  markerTime = performance.now();
  // Center the point on screen: move target and camera together.
  focusAnim = { from: controls.target.clone(), to: hit.point.clone(), start: performance.now() };
  return true;
}

function updateFocus(now) {
  if (focusAnim) {
    const t = Math.min(1, (now - focusAnim.start) / 350);
    const k = t * t * (3 - 2 * t);
    const next = focusAnim.from.clone().lerp(focusAnim.to, k);
    camera.position.add(next.clone().sub(controls.target));
    controls.target.copy(next);
    if (t === 1) focusAnim = null;
  }
  if (marker.visible) {
    const age = (now - markerTime) / 1000;
    marker.position.copy(focusWorld());
    marker.scale.setScalar(camera.position.distanceTo(marker.position) * 0.008);
    marker.material.opacity = age < 1.2 ? 1 : Math.max(0.35, 1 - (age - 1.2));
  }
}

// Rotate the model around the picked point (or its own center).
const turnCenter = new THREE.Vector3();
function rotatePivot(q) {
  if (hasFocus) {
    focusWorld(turnCenter);
    pivot.position.sub(turnCenter).applyQuaternion(q).add(turnCenter);
  }
  pivot.quaternion.premultiply(q);
}

let middleDown = null;
canvas.addEventListener('pointerdown', (e) => {
  if (e.button === 1) { middleDown = { x: e.clientX, y: e.clientY }; e.preventDefault(); }
});
canvas.addEventListener('pointerup', (e) => {
  if (e.button !== 1 || !middleDown) return;
  const moved = Math.hypot(e.clientX - middleDown.x, e.clientY - middleDown.y);
  middleDown = null;
  if (moved < 5 && !pickFocus(e.clientX, e.clientY)) clearFocus();
});
canvas.addEventListener('dblclick', (e) => { if (!pickFocus(e.clientX, e.clientY)) clearFocus(); });
// Middle click must not open the browser's autoscroll.
canvas.addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); });

const VIEWS = {
  front: [0, 0, 0],
  top: [Math.PI / 2, 0, 0],
  left: [0, Math.PI / 2, 0],
  right: [0, -Math.PI / 2, 0],
};
function setView(name) {
  resetView();
  pivot.quaternion.setFromEuler(new THREE.Euler(...VIEWS[name]));
}

// -------------------------------------------------------------- objects

const items = [];
let nextId = 1;

function refit() {
  clearFocus();
  content.position.set(0, 0, 0);
  content.scale.setScalar(1);
  content.updateMatrixWorld(true);
  const box = new THREE.Box3();
  for (const it of items) box.expandByObject(it.object);
  if (box.isEmpty()) return;
  const center = box.getCenter(new THREE.Vector3());
  const radius = box.getBoundingSphere(new THREE.Sphere()).radius || 1;
  content.scale.setScalar(1 / radius);
  content.position.copy(center).multiplyScalar(-1 / radius);
}

function surfaceMaterial(color, colored) {
  return new THREE.MeshStandardMaterial({
    color: colored ? 0xffffff : color,
    vertexColors: colored,
    roughness: 0.55,
    metalness: 0.0,
    side: THREE.DoubleSide,
    wireframe: $('v-wire').checked,
  });
}

function buildObject(geometry, color, asPoints = false) {
  const colored = !!geometry.getAttribute('color');
  if (asPoints) {
    const points = new THREE.Points(geometry, new THREE.PointsMaterial({
      size: 1.5, sizeAttenuation: false, vertexColors: colored, color: colored ? 0xffffff : color,
    }));
    return { object: points, colored };
  }
  if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
  return { object: new THREE.Mesh(geometry, surfaceMaterial(color, colored)), colored };
}

const MODEL_EXT = ['stl', 'ply', 'obj', 'glb', 'gltf', '3mf', 'fbx', 'dae', '3ds', 'amf', 'vtk', 'vtp', 'pcd', 'xyz'];
const SIDE_EXT = ['mtl', 'bin', 'png', 'jpg', 'jpeg', 'webp', 'tga', 'bmp'];
const ACCEPT = [...MODEL_EXT, ...SIDE_EXT].map((e) => '.' + e).join(',');
const TOUCH_PICKER = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const extOf = (name) => name.split('.').pop().toLowerCase();
const baseName = (path) => path.split(/[\\/]/).pop().toLowerCase();

// Companion files (.mtl, textures) dropped together with a model are served
// to the loaders as blob URLs, matched by file name.
function sideFiles(files) {
  const byName = new Map(files.map((f) => [f.name.toLowerCase(), f]));
  const urls = [];
  const missing = new Set();
  return {
    get: (path) => byName.get(baseName(path)),
    url(path) {
      if (/^(data|blob):/.test(path)) return path;
      const file = byName.get(baseName(decodeURI(path)));
      if (!file) { missing.add(baseName(path)); return null; }
      const url = URL.createObjectURL(file);
      urls.push(url);
      return url;
    },
    urls,
    missing,
  };
}

function useOwnColors(object) {
  object.traverse((o) => {
    if (!o.isMesh) return;
    if (!o.geometry.getAttribute('normal')) o.geometry.computeVertexNormals();
    for (const m of [].concat(o.material)) {
      m.side = THREE.DoubleSide;
      m.wireframe = $('v-wire').checked;
    }
  });
}

async function parseFile(file, color, side) {
  const ext = extOf(file.name);

  if (ext === 'stl') {
    const geometry = new STLLoader().parse(await file.arrayBuffer());
    // Many STL exporters write zero normals, so always rebuild them.
    geometry.deleteAttribute('normal');
    return buildObject(geometry, color);
  }

  if (ext === 'ply') {
    const buffer = await file.arrayBuffer();
    const geometry = new PLYLoader().parse(buffer);
    // PLYLoader only builds an index when the file has faces, so no index means a point cloud.
    if (!geometry.index) return buildObject(geometry, color, true);

    const header = new TextDecoder().decode(buffer.slice(0, 4096));
    const textureName = header.match(/^comment\s+TextureFile\s+(.+?)\s*$/mi)?.[1];
    const textureUrl = textureName && geometry.getAttribute('uv') ? side.url(textureName) : null;
    if (!textureUrl) return buildObject(geometry, color);

    const map = await new THREE.TextureLoader().loadAsync(textureUrl);
    map.colorSpace = THREE.SRGBColorSpace;
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({ map, roughness: 0.6, side: THREE.DoubleSide });
    return { object: new THREE.Mesh(geometry, material), colored: true };
  }

  if (ext === 'obj') {
    const text = await file.text();
    const loader = new OBJLoader();
    const mtlName = text.match(/^mtllib\s+(.+?)\s*$/m)?.[1];
    const mtlFile = mtlName && side.get(mtlName);
    if (mtlFile) {
      const manager = new THREE.LoadingManager();
      manager.setURLModifier((url) => side.url(url) || url);
      const materials = new MTLLoader(manager).parse(await mtlFile.text(), '');
      materials.preload();
      loader.setMaterials(materials);
      const group = loader.parse(text);
      useOwnColors(group);
      return { object: group, colored: true };
    }
    if (mtlName) side.missing.add(baseName(mtlName));

    const group = loader.parse(text);
    let colored = false;
    group.traverse((o) => {
      if (!o.isMesh) return;
      if (!o.geometry.getAttribute('normal')) o.geometry.computeVertexNormals();
      const c = !!o.geometry.getAttribute('color');
      colored ||= c;
      o.material = surfaceMaterial(color, c);
    });
    return { object: group, colored };
  }

  // Formats whose loaders build a full scene with their own materials.
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => side.url(url) || url);
  const own = (object) => {
    useOwnColors(object);
    return { object, colored: true };
  };

  if (ext === 'glb' || ext === 'gltf') {
    const loader = new GLTFLoader(manager)
      .setDRACOLoader(dracoLoader())
      .setMeshoptDecoder(MeshoptDecoder);
    const data = ext === 'glb' ? await file.arrayBuffer() : await file.text();
    const gltf = await loader.parseAsync(data, '');
    return own(gltf.scene);
  }
  if (ext === '3mf') return own(new ThreeMFLoader(manager).parse(await file.arrayBuffer()));
  if (ext === 'fbx') return own(new FBXLoader(manager).parse(await file.arrayBuffer(), ''));
  if (ext === 'dae') return own(new ColladaLoader(manager).parse(await file.text(), '').scene);
  if (ext === '3ds') return own(new TDSLoader(manager).parse(await file.arrayBuffer(), ''));
  if (ext === 'amf') return own(new AMFLoader(manager).parse(await file.arrayBuffer()));

  if (ext === 'vtk' || ext === 'vtp') {
    const geometry = new VTKLoader().parse(await file.arrayBuffer());
    return buildObject(geometry, color, !geometry.index && geometry.getAttribute('position').count % 3 !== 0);
  }
  if (ext === 'pcd') {
    const points = new PCDLoader().parse(await file.arrayBuffer());
    return buildObject(points.geometry, color, true);
  }
  if (ext === 'xyz') {
    const geometry = new XYZLoader().parse(await file.text());
    return buildObject(geometry, color, true);
  }

  throw new Error('unsupported format .' + ext);
}

let draco = null;
function dracoLoader() {
  draco ||= new DRACOLoader().setDecoderPath('./vendor/three/addons/libs/draco/gltf/');
  return draco;
}

function triangleCount(object) {
  let n = 0;
  object.traverse((o) => {
    if (!o.geometry) return;
    if (o.isPoints) n += o.geometry.getAttribute('position').count;
    else n += (o.geometry.index ? o.geometry.index.count : o.geometry.getAttribute('position').count) / 3;
  });
  return n;
}

function formatCount(object) {
  const n = triangleCount(object);
  const isPoints = object.isPoints;
  const v = n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : String(n);
  return v + (isPoints ? ' points' : ' triangles');
}

async function loadFiles(files) {
  const all = [...files];
  const models = all.filter((f) => MODEL_EXT.includes(extOf(f.name)));
  if (!models.length) {
    if (all.length) toast('No 3D file found. Use ' + MODEL_EXT.map((e) => e.toUpperCase()).join(', '), 6000);
    return;
  }
  const side = sideFiles(all);
  const wasEmpty = items.length === 0;
  toast(models.length > 1 ? `Loading ${models.length} files…` : `Loading ${models[0].name}…`, 0);

  let failed = 0;
  for (const file of models) {
    const color = PALETTE[items.length % PALETTE.length];
    const firstUrl = side.urls.length;
    try {
      const { object, colored } = await parseFile(file, color, side);
      object.userData.urls = side.urls.slice(firstUrl);
      content.add(object);
      items.push({ id: nextId++, name: file.name, object, color, colored, visible: true });
    } catch (err) {
      console.error(file.name, err);
      failed++;
    }
  }
  refit();
  if (wasEmpty) resetView();
  renderList();

  const notes = [];
  if (failed) notes.push(`${failed} file(s) could not be read`);
  if (side.missing.size) notes.push('Missing: ' + [...side.missing].join(', '));
  toast(notes.join('. '), notes.length ? 6000 : 0);
}

function loadDemo() {
  const geometry = new THREE.TorusKnotGeometry(0.7, 0.24, 220, 32);
  const { object } = buildObject(geometry, PALETTE[0]);
  content.add(object);
  items.push({ id: nextId++, name: 'Demo shape', object, color: PALETTE[0], colored: false, visible: true });
  refit();
  resetView();
  renderList();
}

function disposeObject(object) {
  object.traverse((o) => {
    o.geometry?.dispose();
    for (const m of [].concat(o.material || [])) {
      m.map?.dispose();
      m.dispose();
    }
  });
  object.userData.urls?.forEach((u) => URL.revokeObjectURL(u));
}

function removeItem(id) {
  const i = items.findIndex((it) => it.id === id);
  if (i < 0) return;
  const [it] = items.splice(i, 1);
  content.remove(it.object);
  disposeObject(it.object);
  refit();
  renderList();
}

function setItemColor(it, color) {
  it.color = color;
  it.object.traverse((o) => {
    if (o.material && !o.material.vertexColors) o.material.color.set(color);
  });
}

function renderList() {
  const ul = $('obj-list');
  ul.replaceChildren(...items.map((it) => {
    const li = document.createElement('li');
    li.className = 'obj' + (it.visible ? '' : ' off');

    let color;
    if (it.colored) {
      color = document.createElement('span');
      color.className = 'swatch-own';
      color.title = 'Uses the colors stored in the scan';
    } else {
      color = document.createElement('input');
      color.type = 'color';
      color.value = it.color;
      color.title = 'Color';
      color.addEventListener('input', () => setItemColor(it, color.value));
    }

    const name = document.createElement('div');
    name.className = 'name';
    name.title = `${it.name} · ${formatCount(it.object)}`;
    name.textContent = it.name;

    const eye = document.createElement('button');
    eye.textContent = it.visible ? '◉' : '○';
    eye.title = it.visible ? 'Hide' : 'Show';
    eye.addEventListener('click', () => {
      it.visible = !it.visible;
      it.object.visible = it.visible;
      renderList();
    });

    const del = document.createElement('button');
    del.textContent = '✕';
    del.title = 'Remove';
    del.addEventListener('click', () => removeItem(it.id));

    li.append(color, name, eye, del);
    return li;
  }));
  $('obj-count').textContent = items.length;
  $('empty').hidden = items.length > 0;
}

let toastTimer = 0;
function toast(text, ms = 3000) {
  const el = $('toast');
  clearTimeout(toastTimer);
  el.textContent = text;
  el.hidden = !text;
  if (text && ms) toastTimer = setTimeout(() => { el.hidden = true; }, ms);
}

for (const id of ['file', 'file-empty']) {
  // iOS and some Android pickers grey out extensions they do not know (.stl, .ply,
  // .obj...), so phones get no filter and loadFiles checks the extension instead.
  if (!TOUCH_PICKER) $(id).accept = ACCEPT;
  $(id).addEventListener('change', (e) => {
    loadFiles(e.target.files);
    e.target.value = '';
  });
}
$('demo').addEventListener('click', loadDemo);
$('clear').addEventListener('click', () => {
  for (const it of items.splice(0)) {
    content.remove(it.object);
    disposeObject(it.object);
  }
  renderList();
});

let dragDepth = 0;
window.addEventListener('dragenter', (e) => { e.preventDefault(); dragDepth++; $('drop').hidden = false; });
window.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; $('drop').hidden = true; } });
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
  e.preventDefault();
  dragDepth = 0;
  $('drop').hidden = true;
  loadFiles(e.dataTransfer.files);
});

// ----------------------------------------------------------------- view

document.querySelectorAll('[data-view]').forEach((b) => {
  b.addEventListener('click', () => setView(b.dataset.view));
});
$('reset').addEventListener('click', resetView);
$('v-wire').addEventListener('change', (e) => {
  content.traverse((o) => { if (o.isMesh) o.material.wireframe = e.target.checked; });
});

function screenshot() {
  renderer.render(scene, camera);
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'leviate-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
}
$('shot').addEventListener('click', screenshot);

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else stage.requestFullscreen?.();
}
$('fullscreen').addEventListener('click', toggleFullscreen);

window.addEventListener('keydown', (e) => {
  if (e.target.closest('input, select, textarea')) return;
  const k = e.key.toLowerCase();
  if (k === 'r') resetView();
  else if (k === 's') screenshot();
  else if (k === 'f') toggleFullscreen();
});

setupWindows();

// --------------------------------------------------------------- webcam

const video = $('video');
const engine = new GestureEngine();
let stream = null;
let landmarker = null;
let landmarkerLoading = null;
let lastVideoTime = -1;
let detectMs = 0;
let phone = null;        // pairing session while waiting for or using a phone

// Hand tracking runs in a worker when the browser allows it, so the 3D view keeps
// its frame rate. Otherwise it falls back to the main thread.
function startWorker() {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./hand-worker.js', import.meta.url), { type: 'module' });
    const timer = setTimeout(() => fail(new Error('Hand worker timed out')), 30000);
    const fail = (err) => { clearTimeout(timer); worker.terminate(); reject(err); };
    worker.onerror = (e) => fail(new Error(e.message || 'Hand worker failed'));
    worker.onmessage = ({ data }) => {
      if (data.type === 'loaded') worker.postMessage({ type: 'init' });
      else if (data.type === 'error') fail(new Error(data.message));
      else if (data.type === 'ready') {
        clearTimeout(timer);
        const tracker = { worker, busy: false };
        worker.onmessage = ({ data: msg }) => {
          if (msg.type !== 'result') return;
          tracker.busy = false;
          detectMs = detectMs * 0.9 + msg.ms * 0.1;
          if (stream) handleHand(msg.lm);
        };
        resolve(tracker);
      }
    };
  });
}

async function startMainThread() {
  const fileset = await FilesetResolver.forVisionTasks('./vendor/mediapipe/wasm');
  const task = await HandLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: './models/hand_landmarker.task', delegate: 'CPU' },
    runningMode: 'VIDEO',
    numHands: 1,
    minHandDetectionConfidence: 0.6,
    minHandPresenceConfidence: 0.6,
    minTrackingConfidence: 0.5,
  });
  return { task };
}

function getLandmarker() {
  landmarkerLoading ||= (async () => {
    try {
      landmarker = await startWorker();
      console.info('Hand tracking runs in a worker');
    } catch (err) {
      console.warn('Hand tracking on the main thread:', err.message);
      landmarker = await startMainThread();
    }
    return landmarker;
  })();
  return landmarkerLoading;
}

function cameraConstraints() {
  const [width, height] = RESOLUTIONS[settings.res] || RESOLUTIONS[480];
  const video = {
    width: { ideal: width },
    height: { ideal: height },
    frameRate: { ideal: Number(settings.fps) },
  };
  if (settings.device) video.deviceId = { exact: settings.device };
  else video.facingMode = settings.facing;
  return { audio: false, video };
}

function setCamUi(running) {
  $('cam-toggle').textContent = running ? 'Stop' : 'Start';
  $('cam-toggle').classList.toggle('on', running);
  $('badge').hidden = !running;
  if (!running) {
    $('cam-info').textContent = '';
    $('perf').textContent = '';
    clearOverlay();
  }
}

function stopCamera() {
  closePhone();
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  video.srcObject = null;
  engine.reset();
  setCamUi(false);
}

async function startCamera() {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    toast('The camera needs HTTPS or localhost', 5000);
    return;
  }
  closePhone();
  stream?.getTracks().forEach((t) => t.stop());
  $('cam-toggle').textContent = '…';

  try {
    stream = await navigator.mediaDevices.getUserMedia(cameraConstraints());
  } catch (err) {
    if (settings.device && (err.name === 'OverconstrainedError' || err.name === 'NotFoundError')) {
      // The remembered camera is gone. Fall back to the default one.
      settings.device = '';
      saveSettings();
      return startCamera();
    }
    console.error(err);
    stream = null;
    setCamUi(false);
    toast('Camera not available. ' + err.message, 5000);
    return;
  }

  await listCameras();
  await attach(stream);
}

// Shows a stream in the preview and starts hand tracking on it.
async function attach(s) {
  video.srcObject = s;
  await video.play().catch(() => {});
  engine.reset();
  setCamUi(true);
  showCameraInfo();

  if (!landmarker) {
    $('badge').textContent = 'Loading…';
    try {
      await getLandmarker();
    } catch (err) {
      console.error(err);
      $('badge').textContent = 'Hand model failed';
      return;
    }
  }
  $('badge').textContent = 'No hand';
}

function showCameraInfo() {
  if (!stream) return;
  const track = stream.getVideoTracks()[0];
  const s = track.getSettings();
  const fps = s.frameRate ? Math.round(s.frameRate) + ' fps' : '';
  $('cam-info').textContent = [
    `${s.width || video.videoWidth} × ${s.height || video.videoHeight}`,
    fps,
    phone ? 'Phone' : track.label,
  ].filter(Boolean).join(' · ');
}
video.addEventListener('resize', showCameraInfo);

// ---------------------------------------------------------- phone camera

function closePhone() {
  if (!phone) return;
  const p = phone;
  phone = null;
  p.close?.();
  $('qr').hidden = true;
  $('phone-link').textContent = 'Use phone';
  $('phone-link').classList.remove('on');
  applyMirror();
}

async function usePhone() {
  if (phone) {
    const wasStreaming = !!stream;
    closePhone();
    if (wasStreaming) stopCamera();
    return;
  }
  stopCamera();
  $('qr-code').replaceChildren();
  $('qr-text').textContent = 'Connecting…';
  $('qr').hidden = false;
  $('phone-link').textContent = 'Cancel';
  $('phone-link').classList.add('on');
  const session = phone = {};

  try {
    const host = await hostPhone({
      onStream: (s, facing) => {
        if (phone !== session) return;
        $('qr').hidden = true;
        $('phone-link').textContent = 'Disconnect phone';
        stream = s;
        setPhoneMirror(facing);
        attach(s);
      },
      onFacing: setPhoneMirror,
      onEnd: () => {
        if (phone !== session) return;
        stopCamera();
        toast('Phone disconnected', 3000);
      },
    });
    if (phone !== session) { host.close(); return; }
    session.close = host.close;
    $('qr-code').innerHTML = qrSvg(host.url);
    $('qr').dataset.url = host.url;
    $('qr-text').textContent = 'Scan with your phone camera';
  } catch (err) {
    console.error(err);
    closePhone();
    toast('Phone pairing is not available. ' + err.message, 5000);
  }
}

// Mirror the preview only for the phone's front camera; the saved webcam setting stays as it is.
function setPhoneMirror(facing) {
  const mirror = facing === 'user';
  $('preview').classList.toggle('mirror', mirror);
  phoneMirror = mirror;
}
let phoneMirror = false;

$('phone-link').addEventListener('click', usePhone);
// No camera app at hand: a click on the code copies the pairing link.
$('qr-code').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('qr').dataset.url);
    toast('Link copied', 2000);
  } catch {}
});

async function listCameras() {
  const cams = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
  const active = stream?.getVideoTracks()[0]?.getSettings().deviceId || settings.device;
  const select = $('cam-select');
  const def = new Option('Default camera', '');
  select.replaceChildren(def, ...cams.map((d, i) => new Option(d.label || `Camera ${i + 1}`, d.deviceId)));
  select.value = settings.device ? active : '';
}

function restartIfRunning() {
  saveSettings();
  if (stream) startCamera();
}

$('cam-toggle').addEventListener('click', () => (stream ? stopCamera() : startCamera()));
$('cam-select').addEventListener('change', (e) => { settings.device = e.target.value; restartIfRunning(); });
$('cam-res').addEventListener('change', (e) => { settings.res = e.target.value; restartIfRunning(); });
$('cam-fps').addEventListener('change', (e) => { settings.fps = e.target.value; restartIfRunning(); });
$('cam-facing').addEventListener('change', (e) => {
  settings.facing = e.target.value;
  settings.device = '';
  settings.mirror = settings.facing === 'user';
  $('cam-mirror').checked = settings.mirror;
  applyMirror();
  restartIfRunning();
});
$('cam-mirror').addEventListener('change', (e) => {
  settings.mirror = e.target.checked;
  applyMirror();
  saveSettings();
});

function applyMirror() {
  if (!phone) $('preview').classList.toggle('mirror', settings.mirror);
}

// ------------------------------------------------------------- gestures

const sliders = { 'g-rotate': 'rotate', 'g-pan': 'pan', 'g-zoom': 'zoom', 'g-smooth': 'smooth' };
for (const [id, key] of Object.entries(sliders)) {
  const input = $(id);
  const out = input.nextElementSibling;
  input.value = settings[key];
  out.textContent = input.value;
  input.addEventListener('input', () => {
    settings[key] = Number(input.value);
    out.textContent = input.value;
    engine.smoothing = 1 - settings.smooth;
    saveSettings();
  });
}
engine.smoothing = 1 - settings.smooth;

$('g-enabled').checked = settings.gestures;
$('g-enabled').addEventListener('change', (e) => { settings.gestures = e.target.checked; saveSettings(); });

$('cam-res').value = settings.res;
$('cam-fps').value = settings.fps;
$('cam-facing').value = settings.facing;
$('cam-mirror').checked = settings.mirror;
applyMirror();

const HAND_LINKS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

function clearOverlay() {
  const cv = $('overlay');
  cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
}

function drawHand(lm, mode) {
  const cv = $('overlay');
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  if (!lm) return;

  ctx.strokeStyle = MODE_COLOR[mode];
  ctx.fillStyle = MODE_COLOR[mode];
  ctx.lineWidth = Math.max(2, w / 220);
  ctx.beginPath();
  for (const [a, b] of HAND_LINKS) {
    ctx.moveTo(lm[a].x * w, lm[a].y * h);
    ctx.lineTo(lm[b].x * w, lm[b].y * h);
  }
  ctx.stroke();
  for (const p of lm) {
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, ctx.lineWidth * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

const axisX = new THREE.Vector3();
const axisY = new THREE.Vector3();
const turn = new THREE.Quaternion();

function applyGesture({ mode, dx, dy, zoom }) {
  if (mode === Mode.ROTATE && (dx || dy)) {
    // Rotate around the camera's own axes so the motion matches the screen.
    axisX.setFromMatrixColumn(camera.matrixWorld, 0);
    axisY.setFromMatrixColumn(camera.matrixWorld, 1);
    rotatePivot(turn.setFromAxisAngle(axisY, dx * settings.rotate));
    rotatePivot(turn.setFromAxisAngle(axisX, dy * settings.rotate));
  } else if (mode === Mode.PAN && (dx || dy)) {
    const distance = camera.position.distanceTo(pivot.position);
    const height = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const k = settings.pan * height;
    axisX.setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(dx * k * camera.aspect);
    axisY.setFromMatrixColumn(camera.matrixWorld, 1).multiplyScalar(-dy * k);
    pivot.position.add(axisX).add(axisY);
  } else if (mode === Mode.ZOOM && zoom !== 1) {
    const s = pivot.scale.x * Math.pow(zoom, settings.zoom);
    const next = THREE.MathUtils.clamp(s, MIN_SCALE, MAX_SCALE);
    // Zoom around the picked point too, so it stays where it is.
    if (hasFocus) {
      focusWorld(turnCenter);
      pivot.position.sub(turnCenter).multiplyScalar(next / pivot.scale.x).add(turnCenter);
    }
    pivot.scale.setScalar(next);
  }
}

function track() {
  if (!landmarker || !stream || video.readyState < 2 || video.currentTime === lastVideoTime) return;

  if (landmarker.worker) {
    // One frame in flight at a time; newer frames wait for the next free slot.
    if (landmarker.busy) return;
    lastVideoTime = video.currentTime;
    landmarker.busy = true;
    createImageBitmap(video)
      .then((bitmap) => landmarker.worker.postMessage({ type: 'frame', bitmap, ts: performance.now() }, [bitmap]))
      .catch(() => { landmarker.busy = false; });
    return;
  }

  lastVideoTime = video.currentTime;
  const t0 = performance.now();
  const result = landmarker.task.detectForVideo(video, t0);
  detectMs = detectMs * 0.9 + (performance.now() - t0) * 0.1;
  handleHand(result.landmarks?.[0] || null);
}

function handleHand(lm) {
  const cmd = engine.update(lm, { mirror: phone ? phoneMirror : settings.mirror });
  if (settings.gestures) applyGesture(cmd);
  drawHand(lm, cmd.mode);

  const badge = $('badge');
  badge.textContent = lm ? MODE_LABEL[cmd.mode] : 'No hand';
  badge.className = 'badge ' + (lm ? cmd.mode : '');
}

// ----------------------------------------------------------------- loop

let frames = 0;
let lastPerf = performance.now();
const clock = new THREE.Clock();
const spinQ = new THREE.Quaternion();

renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  track();
  if ($('v-spin').checked) rotatePivot(spinQ.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, dt * 0.6));
  updateFocus(performance.now());
  controls.update();
  renderer.render(scene, camera);

  frames++;
  const now = performance.now();
  if (now - lastPerf > 1000) {
    if (stream) $('perf').textContent = `${Math.round(frames * 1000 / (now - lastPerf))} fps · hand ${detectMs.toFixed(0)} ms`;
    frames = 0;
    lastPerf = now;
  }
});

renderList();
