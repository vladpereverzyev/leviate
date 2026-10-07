// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// Plays the 3D gestures of the web app in another program. js/gestures.js reads the
// hand (open hand turns, fist pans, pinch zooms); here each move becomes what a mouse
// would do in that program: a drag with the button (and keys) it uses to turn or to pan,
// and wheel steps for the zoom. The drag happens where the cursor is, so the cursor goes
// over the 3D view of the program first.

import { Mode } from '../js/gestures.js';

// Mouse schemes of common 3D programs. Named by their buttons, so any program that uses
// the same buttons works; Custom covers the others. 'left+right' holds both buttons.
// speed scales DRAG and STEPS for programs that turn, pan or zoom much faster or slower
// than most, so the hand feels the same as in Blender.
export const PROFILES = [
  { id: 'right-chord', name: 'Right turns · Left+right pans', hint: 'Dental CAD programs',
    rotate: { button: 'right', keys: [] }, pan: { button: 'left+right', keys: [] },
    speed: { rotate: 2.4, pan: 1.2, zoom: 1.12 } },
  { id: 'middle-shift', name: 'Middle turns · Shift+middle pans', hint: 'Blender, SketchUp',
    rotate: { button: 'middle', keys: [] }, pan: { button: 'middle', keys: ['shift'] } },
  { id: 'middle-ctrl', name: 'Middle turns · Ctrl+middle pans', hint: 'SOLIDWORKS',
    rotate: { button: 'middle', keys: [] }, pan: { button: 'middle', keys: ['ctrl'] } },
  { id: 'shift-middle', name: 'Shift+middle turns · Middle pans', hint: 'Fusion',
    rotate: { button: 'middle', keys: ['shift'] }, pan: { button: 'middle', keys: [] } },
  { id: 'right-middle', name: 'Right turns · Middle pans', hint: 'Many CAD programs',
    rotate: { button: 'right', keys: [] }, pan: { button: 'middle', keys: [] } },
  { id: 'right-shift', name: 'Right turns · Shift+right pans', hint: 'Rhino',
    rotate: { button: 'right', keys: [] }, pan: { button: 'right', keys: ['shift'] } },
  { id: 'left-right', name: 'Left turns · Right pans', hint: 'Leviate on the web, many viewers',
    rotate: { button: 'left', keys: [] }, pan: { button: 'right', keys: [] } },
  { id: 'custom', name: 'Custom', hint: 'Choose the buttons below' },
];

// Pixels of drag for a move of the hand across the whole camera picture.
const DRAG = 1000;
// Wheel steps for a pinch that doubles the gap between thumb and index.
const STEPS = 8;
// Time a new gesture must last before the mouse follows it (ms, and at least two frames):
// a hand that changes pose for an instant never presses, lets go or moves the cursor.
const HOLD = 200;
// Moves of the hand smaller than this (part of the picture) in one frame are the shake of
// the tracking, not the hand: they fade out instead of stopping the view at once, so a
// slow hand does not go and stop. Larger moves than JUMP are cut, so a tracking jump
// never spins the view.
const STILL = 0.002;
const JUMP = 0.04;
// Share of each new frame in the speed of the hand: the rest is the speed so far, so the
// view does not jerk with the steps of the tracking.
const EASE = 0.5;

export class Control3D {
  // out: { dragStart(button, keys), dragMove(dx, dy), dragEnd(), wheel(steps) }
  constructor(out, settings) {
    this.out = out;
    this.settings = settings;
    this.mode = Mode.NONE;
    this.next = Mode.NONE;
    this.frames = 0;
    this.since = 0;
    this.vx = 0;
    this.vy = 0;
  }

  profile() {
    return PROFILES.find((p) => p.id === this.settings.profile) || PROFILES[0];
  }

  binding(mode) {
    const s = this.settings;
    if (s.profile === 'custom') return mode === Mode.ROTATE ? s.customRotate : s.customPan;
    return mode === Mode.ROTATE ? this.profile().rotate : this.profile().pan;
  }

  speed(key) {
    return this.profile().speed?.[key] ?? 1;
  }

  update({ mode, dx, dy, zoom }) {
    const s = this.settings;
    if (mode !== this.next) {
      this.next = mode;
      this.frames = 0;
      this.since = performance.now();
    }
    if (mode !== this.mode && (++this.frames < 2 || performance.now() - this.since < HOLD)) return;
    if (mode !== this.mode) {
      if (this.mode === Mode.ROTATE || this.mode === Mode.PAN) this.out.dragEnd();
      this.mode = mode;
      this.vx = 0;
      this.vy = 0;
        if (mode === Mode.ROTATE || mode === Mode.PAN) {
        const { button, keys } = this.binding(mode);
        this.out.dragStart(button, keys);
      }
    }
    this.vx += (dx - this.vx) * EASE;
    this.vy += (dy - this.vy) * EASE;
    const move = Math.hypot(this.vx, this.vy);
    const keep = move > STILL ? (Math.min(move, JUMP) - STILL) / move : 0;
    dx = this.vx * keep;
    dy = this.vy * keep;
    if ((mode === Mode.ROTATE || mode === Mode.PAN) && (dx || dy)) {
      const gain = DRAG * (mode === Mode.ROTATE ? s.rotate * this.speed('rotate') : s.pan * this.speed('pan'));
      this.out.dragMove(dx * gain, dy * gain);
    } else if (mode === Mode.ZOOM && zoom !== 1) {
      // Parts of a step too: the app sends them as they are where the system takes them.
      this.out.wheel(Math.log2(zoom) * STEPS * s.zoom * this.speed('zoom') * (s.invertZoom ? -1 : 1));
    }
  }

  stop() {
    if (this.mode === Mode.ROTATE || this.mode === Mode.PAN) this.out.dragEnd();
    this.mode = Mode.NONE;
    this.next = Mode.NONE;
    this.frames = 0;
  }
}
