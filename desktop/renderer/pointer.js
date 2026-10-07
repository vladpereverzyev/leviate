// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// Turns the hand points into mouse moves and clicks. Desktop app only.
//
//   open hand                    -> the cursor follows the palm
//   index finger, held still     -> left click
//   ... still held after it      -> a second ring, then a double click
//   index + middle, held still   -> right click
//
// The web app keeps its own gestures in js/gestures.js; the finger test here is the
// same one it uses. The palm is mapped onto the screens through a box in the middle of
// the camera picture, so the hand reaches every corner without leaving the picture. The
// cursor stops as soon as the hand leaves the open pose: the click lands where the palm
// left it.

export const Pose = { NONE: 'none', IDLE: 'idle', MOVE: 'move', LEFT: 'left', RIGHT: 'right' };

const WRIST = 0;
const THUMB_IP = 3;
const THUMB_TIP = 4;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;
const PINKY_MCP = 17;
// [mcp, pip, tip] for index, middle, ring, pinky
const FINGERS = [[5, 6, 8], [9, 10, 12], [13, 14, 16], [17, 18, 20]];

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function fingerExtended(lm, [mcp, pip, tip]) {
  const px = lm[mcp].x - lm[WRIST].x;
  const py = lm[mcp].y - lm[WRIST].y;
  const fx = lm[tip].x - lm[pip].x;
  const fy = lm[tip].y - lm[pip].y;
  return px * fx + py * fy > 0;
}

const thumbExtended = (lm) => dist(lm[THUMB_TIP], lm[PINKY_MCP]) > dist(lm[THUMB_IP], lm[PINKY_MCP]);
const palmSize = (lm) => dist(lm[WRIST], lm[MIDDLE_MCP]) || 1e-6;

function palmCenter(lm) {
  const ids = [WRIST, 5, MIDDLE_MCP, PINKY_MCP];
  return {
    x: ids.reduce((s, i) => s + lm[i].x, 0) / 4,
    y: ids.reduce((s, i) => s + lm[i].y, 0) / 4,
  };
}

// Pose of one frame. The thumb does not matter for the click poses.
export function classify(lm) {
  const [index, middle, ring, pinky] = FINGERS.map((f) => fingerExtended(lm, f));
  const total = index + middle + ring + pinky;
  if (total === 4 || (total === 3 && thumbExtended(lm))) return Pose.MOVE;
  if (index && !ring && !pinky) return middle ? Pose.RIGHT : Pose.LEFT;
  return Pose.IDLE;
}

// One Euro filter (Casiez et al. 2012): steady when the hand rests, quick when it moves.
class OneEuro {
  constructor(minCutoff = 1.2, beta = 12, dCutoff = 1) {
    Object.assign(this, { minCutoff, beta, dCutoff });
    this.reset();
  }

  reset() {
    this.x = null;
    this.dx = 0;
    this.t = 0;
  }

  static alpha(cutoff, dt) {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  filter(x, t) {
    if (this.x === null) {
      this.x = x;
      this.t = t;
      return x;
    }
    const dt = Math.max(t - this.t, 1e-3);
    this.t = t;
    this.dx += OneEuro.alpha(this.dCutoff, dt) * ((x - this.x) / dt - this.dx);
    this.x += OneEuro.alpha(this.minCutoff + this.beta * Math.abs(this.dx), dt) * (x - this.x);
    return this.x;
  }
}

export class Pointer {
  // out.move(u, v) with u, v from 0 to 1 across the screens,
  // out.click('left' | 'right' | 'double').
  constructor(out, { dwell = 1, reach = 0.6, smoothing = 0.5, debounce = 3, still = 0.3,
    gap = 0.5, clock = () => performance.now() / 1000 } = {}) {
    Object.assign(this, { out, dwell, reach, debounce, still, gap, clock });
    this.enabled = true;
    this.fx = new OneEuro();
    this.fy = new OneEuro();
    this.smoothing = smoothing;
    this.clicks = 0;
    this.lastClick = Pose.NONE;
    this.reset();
  }

  get smoothing() { return this._smoothing; }

  // 0 follows every shake of the hand, 1 is calm but a little slower.
  set smoothing(value) {
    this._smoothing = Math.min(1, Math.max(0, value));
    this.fx.minCutoff = this.fy.minCutoff = 3 - 2.6 * this._smoothing;
  }

  reset() {
    this.mode = Pose.NONE;
    this.candidate = Pose.NONE;
    this.candidateFrames = 0;
    this.progress = 0;
    this.dwellStart = null;
    this.dwellTip = null;
    this.fired = false;
    this.second = false;
    this.fx.reset();
    this.fy.reset();
  }

  // Where the palm points, from 0 to 1 across the screens.
  target(lm, mirror) {
    let { x, y } = palmCenter(lm);
    if (mirror) x = 1 - x;
    const half = this.reach / 2;
    const clamp = (v) => Math.min(1, Math.max(0, v));
    return { u: clamp((x - (0.5 - half)) / this.reach), v: clamp((y - (0.5 - half)) / this.reach) };
  }

  update(lm, mirror = false) {
    if (!lm) {
      this.reset();
      return this.mode;
    }
    const raw = classify(lm);
    if (raw === this.candidate) this.candidateFrames++;
    else {
      this.candidate = raw;
      this.candidateFrames = 1;
    }
    if (this.candidate !== this.mode && this.candidateFrames >= this.debounce) {
      this.mode = this.candidate;
      this.progress = 0;
      this.dwellStart = null;
      this.fired = false;
      this.second = false;
    }

    const now = this.clock();
    if (!this.enabled) {
      this.progress = 0;
      return this.mode;
    }
    if (this.mode === Pose.MOVE && raw === Pose.MOVE) {
      const { u, v } = this.target(lm, mirror);
      this.out.move(this.fx.filter(u, now), this.fy.filter(v, now));
    } else if (this.mode === Pose.LEFT || this.mode === Pose.RIGHT) {
      this.hold(lm, now);
    }
    return this.mode;
  }

  // What the ring around the cursor shows: 'left', 'right' or 'double'.
  get stage() { return this.second ? 'double' : this.mode; }

  hold(lm, now) {
    const tip = lm[INDEX_TIP];
    const moved = this.dwellStart !== null && dist(tip, this.dwellTip) > this.still * palmSize(lm);
    if (this.second) {
      // After a left click the finger may stay still: a short pause, then a second ring
      // that ends in a double click. Moving the finger gives it up.
      if (moved) {
        this.second = false;
        this.progress = 0;
        return;
      }
      this.progress = Math.min(1, Math.max(0, now - this.dwellStart - this.gap) / Math.max(this.dwell, 0.1));
      if (this.progress >= 1) {
        this.second = false;
        this.progress = 0;
        this.lastClick = 'double';
        this.clicks++;
        this.out.click('double');
      }
      return;
    }
    if (this.fired) return;
    if (this.dwellStart === null || moved) {
      // The finger moved: count again from here.
      this.dwellStart = now;
      this.dwellTip = { x: tip.x, y: tip.y };
    }
    this.progress = Math.min(1, (now - this.dwellStart) / Math.max(this.dwell, 0.1));
    if (this.progress >= 1) {
      this.fired = true;
      this.progress = 0;
      this.lastClick = this.mode;
      this.clicks++;
      this.out.click(this.mode);
      if (this.mode === Pose.LEFT) {
        this.second = true;
        this.dwellStart = now;
      }
    }
  }
}
