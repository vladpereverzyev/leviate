// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// Turns MediaPipe hand landmarks into view commands.
//
//   open hand      -> rotate (turn the hand or move it)
//   fist           -> pan
//   thumb + index  -> zoom (spread to zoom in, close to zoom out)
//
// Poses are read from the 3D hand points, so they work whatever side of the
// hand faces the camera: palm, back, edge or fingertips.

export const Mode = Object.freeze({
  NONE: 'none',
  ROTATE: 'rotate',
  PAN: 'pan',
  ZOOM: 'zoom',
});

const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_MCP = 5;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;
const PINKY_MCP = 17;

// Joint chains, base to tip, for index, middle, ring and pinky.
const FINGERS = [[5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]];

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const len = (v) => Math.hypot(v.x, v.y, v.z);
const dist3 = (a, b) => len(sub(a, b));
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const norm = (v) => { const l = len(v) || 1; return { x: v.x / l, y: v.y / l, z: v.z / l }; };
const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });

// How straight a finger is: 1 when fully stretched, about 0.4 when curled into a fist.
// Measured in 3D, so it does not depend on the direction the camera sees it from.
export function straightness(p, chain) {
  let path = 0;
  for (let i = 1; i < chain.length; i++) path += dist3(p[chain[i]], p[chain[i - 1]]);
  return path ? dist3(p[chain[chain.length - 1]], p[chain[0]]) / path : 0;
}

export function palmCenter(lm) {
  const ids = [WRIST, INDEX_MCP, MIDDLE_MCP, PINKY_MCP];
  let x = 0, y = 0;
  for (const i of ids) { x += lm[i].x; y += lm[i].y; }
  return { x: x / ids.length, y: y / ids.length };
}

// Pose of a single frame from the 3D points. `current` adds hysteresis so a pose
// does not flicker at its edges, for example when thumb and index touch.
export function classify(p, current = Mode.NONE) {
  const [index, middle, ring, pinky] = FINGERS.map((f) => straightness(p, f));
  const out = [index, middle, ring, pinky].filter((s) => s > 0.78).length;
  const keep = current === Mode.ROTATE ? 0.7 : 0.78;

  if (out >= 3 || (current === Mode.ROTATE && [index, middle, ring, pinky].filter((s) => s > keep).length >= 3)) {
    return Mode.ROTATE;
  }

  const othersCurled = middle < 0.7 && ring < 0.7 && pinky < 0.72;
  if (othersCurled) {
    if (index > 0.78 || (current === Mode.ZOOM && index > 0.55)) return Mode.ZOOM;
    if (index < 0.7) return Mode.PAN;
  }
  return Mode.NONE;
}

// Orientation of the hand as three unit axes in view space (x right, y up,
// z toward the viewer): x across the knuckles, y from wrist to fingers, z out of the palm.
export function handFrame(p, mirror = false) {
  const v = (i) => ({ x: mirror ? -p[i].x : p[i].x, y: -p[i].y, z: -p[i].z });
  const up = norm(sub(v(MIDDLE_MCP), v(WRIST)));
  const across = norm(sub(v(INDEX_MCP), v(PINKY_MCP)));
  const out = norm(cross(across, up));
  const x = norm(cross(up, out));
  return { x, y: up, z: out };
}

export class GestureEngine {
  constructor({ debounce = 3, smoothing = 0.5, deadzone = 0.0015 } = {}) {
    this.debounce = debounce;
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
    this.session = 0;
  }

  // lm: the 21 normalized image points. world: the same points in meters (3D).
  // Returns { mode, session, dx, dy, zoom, frame }. dx and dy are screen-oriented,
  // in normalized image units. frame is the hand orientation while rotating.
  // session changes every time a pose starts, so callers can drop old references.
  update(lm, world, { mirror = false } = {}) {
    const idle = { mode: Mode.NONE, session: this.session, dx: 0, dy: 0, zoom: 1, frame: null };
    if (!lm) {
      this.reset();
      return idle;
    }
    const p = world || lm;

    const raw = classify(p, this.mode);
    if (raw === this.candidate) this.candidateFrames++;
    else { this.candidate = raw; this.candidateFrames = 1; }

    if (this.candidate !== this.mode && this.candidateFrames >= this.debounce) {
      this.mode = this.candidate;
      this.anchor = null;
      this.spread = null;
      this.session++;
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

    const result = { mode: this.mode, session: this.session, dx, dy, zoom, frame: null };

    if (this.mode === Mode.ZOOM) {
      // Gap between thumb and index relative to the palm, in 3D when available.
      const d = world ? dist3 : dist2;
      const s = d(p[THUMB_TIP], p[INDEX_TIP]) / (d(p[WRIST], p[MIDDLE_MCP]) || 1e-6);
      if (this.spread !== null) {
        const next = this.spread + (s - this.spread) * a;
        const ratio = (next + 0.05) / (this.spread + 0.05);
        if (Math.abs(ratio - 1) > 0.004) zoom = Math.min(1.15, Math.max(0.87, ratio));
        this.spread = next;
      } else {
        this.spread = s;
      }
      return { ...result, dx: 0, dy: 0, zoom };
    }

    if (this.mode === Mode.ROTATE) result.frame = handFrame(p, mirror);
    if (this.mode === Mode.NONE) return idle;
    return result;
  }
}
