// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// Turns MediaPipe hand landmarks into view commands.
//
//   open hand      -> rotate (move it), turn the palm left or right to turn the model
//   fist           -> pan (move it), turn the fist left, right, up or down to turn the model
//   thumb + index  -> zoom (spread to zoom in, close to zoom out)
//
// Landmarks are the 21 normalized points of the MediaPipe hand model.
// The finger test (fingertip direction against the palm direction) is
// adapted from kelyonn/vertex, MIT License. See THIRD-PARTY-NOTICES.md.

export const Mode = Object.freeze({
  NONE: 'none',
  ROTATE: 'rotate',
  PAN: 'pan',
  ZOOM: 'zoom',
});

const WRIST = 0;
const THUMB_IP = 3;
const THUMB_TIP = 4;
const INDEX_MCP = 5;
const INDEX_PIP = 6;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;
const PINKY_MCP = 17;

// [mcp, pip, tip] for index, middle, ring, pinky
const FINGERS = [[5, 6, 8], [9, 10, 12], [13, 14, 16], [17, 18, 20]];

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const sub3 = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const norm3 = (v) => { const l = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / l, y: v.y / l, z: v.z / l }; };
const cross3 = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });

function fingerExtended(lm, [mcp, pip, tip]) {
  const px = lm[mcp].x - lm[WRIST].x;
  const py = lm[mcp].y - lm[WRIST].y;
  const fx = lm[tip].x - lm[pip].x;
  const fy = lm[tip].y - lm[pip].y;
  return px * fx + py * fy > 0;
}

function thumbExtended(lm) {
  return dist(lm[THUMB_TIP], lm[PINKY_MCP]) > dist(lm[THUMB_IP], lm[PINKY_MCP]);
}

export function palmSize(lm) {
  return dist(lm[WRIST], lm[MIDDLE_MCP]) || 1e-6;
}

export function palmCenter(lm) {
  const ids = [WRIST, INDEX_MCP, MIDDLE_MCP, PINKY_MCP];
  let x = 0, y = 0;
  for (const i of ids) { x += lm[i].x; y += lm[i].y; }
  return { x: x / ids.length, y: y / ids.length };
}

// Orientation of the hand as three unit axes in view space (x right, y up,
// z toward the viewer): x across the knuckles, y from wrist to knuckles, z out
// of the palm. Built only from wrist and knuckles, so it works for a fist too.
// p are the 3D world points of MediaPipe (y down, z away from the camera).
export function handFrame(p, mirror = false) {
  const v = (i) => ({ x: mirror ? -p[i].x : p[i].x, y: -p[i].y, z: -p[i].z });
  const up = norm3(sub3(v(MIDDLE_MCP), v(WRIST)));
  const across = norm3(sub3(v(INDEX_MCP), v(PINKY_MCP)));
  const out = norm3(cross3(across, up));
  return { x: norm3(cross3(up, out)), y: up, z: out };
}

// Small rotation that takes frame a to frame b, as a rotation vector in view space.
function frameTurn(a, b) {
  const t = { x: 0, y: 0, z: 0 };
  for (const k of ['x', 'y', 'z']) {
    const c = cross3(a[k], b[k]);
    t.x += c.x / 2; t.y += c.y / 2; t.z += c.z / 2;
  }
  return t;
}

// Raw pose of a single frame. `current` adds hysteresis so the zoom pose
// survives the moment thumb and index touch.
export function classify(lm, current = Mode.NONE) {
  const [index, middle, ring, pinky] = FINGERS.map((f) => fingerExtended(lm, f));
  const thumb = thumbExtended(lm);
  const others = [middle, ring, pinky].filter(Boolean).length;
  const all = others + (index ? 1 : 0);

  if (all >= 4 || (all === 3 && thumb)) return Mode.ROTATE;

  if (others === 0) {
    const tipOut = dist(lm[INDEX_TIP], lm[WRIST]);
    const enter = tipOut > dist(lm[INDEX_PIP], lm[WRIST]);
    const stay = tipOut > dist(lm[INDEX_MCP], lm[WRIST]) * 1.05;
    if (enter || (current === Mode.ZOOM && stay)) return Mode.ZOOM;
    if (!index) return Mode.PAN;
  }
  return Mode.NONE;
}

export class GestureEngine {
  constructor({ debounce = 3, smoothing = 0.5, deadzone = 0.0015, turnDeadzone = 0.006 } = {}) {
    this.debounce = debounce;
    this.turnDeadzone = turnDeadzone;
    this.smoothing = smoothing;
    this.deadzone = deadzone;
    this.reset();
  }

  reset() {
    this.mode = Mode.NONE;
    this.candidate = Mode.NONE;
    this.candidateFrames = 0;
    this.anchor = null;
    this.spread = null;
    this.frame = null;
  }

  // lm: the 21 normalized image points. world: the same points in meters, if known.
  // Returns { mode, dx, dy, zoom, turn }. dx and dy are in screen-oriented,
  // normalized image units (1 = full frame width or height). turn is the turn of
  // the hand since the last frame, in radians around the view axes.
  update(lm, world = null, { mirror = false } = {}) {
    const still = { x: 0, y: 0, z: 0 };
    const idle = { mode: Mode.NONE, dx: 0, dy: 0, zoom: 1, turn: still };
    if (!lm) {
      this.reset();
      return idle;
    }

    const raw = classify(lm, this.mode);
    if (raw === this.candidate) this.candidateFrames++;
    else { this.candidate = raw; this.candidateFrames = 1; }

    if (this.candidate !== this.mode && this.candidateFrames >= this.debounce) {
      this.mode = this.candidate;
      this.anchor = null;
      this.spread = null;
      this.frame = null;
    }

    const a = this.smoothing;
    const c = palmCenter(lm);
    let dx = 0, dy = 0, zoom = 1;

    if (this.anchor) {
      const nx = this.anchor.x + (c.x - this.anchor.x) * a;
      const ny = this.anchor.y + (c.y - this.anchor.y) * a;
      dx = nx - this.anchor.x;
      dy = ny - this.anchor.y;
      this.anchor = { x: nx, y: ny };
    } else {
      this.anchor = c;
    }
    if (Math.hypot(dx, dy) < this.deadzone) { dx = 0; dy = 0; }
    if (mirror) dx = -dx;

    if (this.mode === Mode.ZOOM) {
      const s = dist(lm[THUMB_TIP], lm[INDEX_TIP]) / palmSize(lm);
      if (this.spread !== null) {
        const next = this.spread + (s - this.spread) * a;
        const ratio = (next + 0.05) / (this.spread + 0.05);
        if (Math.abs(ratio - 1) > 0.004) zoom = Math.min(1.15, Math.max(0.87, ratio));
        this.spread = next;
      } else {
        this.spread = s;
      }
      return { mode: this.mode, dx: 0, dy: 0, zoom, turn: still };
    }

    if (this.mode === Mode.NONE) return idle;
    return { mode: this.mode, dx, dy, zoom, turn: this.turn(world, mirror) };
  }

  // Open hand: only the left and right turn of the palm. Fist: left, right, up and down.
  // The roll of the hand is left out, it would fight with the move to rotate.
  turn(world, mirror) {
    const t = { x: 0, y: 0, z: 0 };
    if (!world) { this.frame = null; return t; }
    const f = handFrame(world, mirror);
    if (!this.frame) { this.frame = f; return t; }

    const d = frameTurn(this.frame, f);
    const a = this.smoothing;
    t.y = d.y * a;
    if (this.mode === Mode.PAN) t.x = d.x * a;
    // Below the deadzone the reference stays, so a slow turn adds up instead of getting lost.
    if (Math.hypot(t.x, t.y) < this.turnDeadzone) { t.x = 0; t.y = 0; return t; }

    // Smoothing: the reference moves only part of the way, the rest comes in the next frames.
    const mix = (k) => {
      const q = this.frame[k];
      return { x: q.x + (f[k].x - q.x) * a, y: q.y + (f[k].y - q.y) * a, z: q.z + (f[k].z - q.z) * a };
    };
    const y = norm3(mix('y'));
    const out = norm3(cross3(mix('x'), y));
    this.frame = { x: norm3(cross3(y, out)), y, z: out };

    // A tracking jump is not a turn.
    const max = 0.2;
    t.x = Math.max(-max, Math.min(max, t.x));
    t.y = Math.max(-max, Math.min(max, t.y));
    return t;
  }
}
