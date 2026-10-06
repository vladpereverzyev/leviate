// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// Plays the 3D gestures of the web app in another program. js/gestures.js reads the
// hand (open hand turns, fist pans, pinch zooms); here each move becomes what a mouse
// would do in that program: a drag with the button (and keys) it uses to turn or to pan,
// and wheel steps for the zoom. The drag happens where the cursor is, so the cursor goes
// over the 3D view of the program first.

import { Mode } from '../js/gestures.js';

// Mouse schemes of common 3D programs. Named by their buttons, so any program that uses
// the same buttons works; Custom covers the others.
export const PROFILES = [
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

export class Control3D {
  // out: { dragStart(button, keys), dragMove(dx, dy), dragEnd(), wheel(steps) }
  constructor(out, settings) {
    this.out = out;
    this.settings = settings;
    this.mode = Mode.NONE;
    this.wheelRest = 0;
  }

  binding(mode) {
    const s = this.settings;
    if (s.profile === 'custom') return mode === Mode.ROTATE ? s.customRotate : s.customPan;
    const profile = PROFILES.find((p) => p.id === s.profile) || PROFILES[0];
    return mode === Mode.ROTATE ? profile.rotate : profile.pan;
  }

  update({ mode, dx, dy, zoom }) {
    const s = this.settings;
    if (mode !== this.mode) {
      if (this.mode === Mode.ROTATE || this.mode === Mode.PAN) this.out.dragEnd();
      this.mode = mode;
      this.wheelRest = 0;
      if (mode === Mode.ROTATE || mode === Mode.PAN) {
        const { button, keys } = this.binding(mode);
        this.out.dragStart(button, keys);
      }
    }
    if ((mode === Mode.ROTATE || mode === Mode.PAN) && (dx || dy)) {
      const gain = DRAG * (mode === Mode.ROTATE ? s.rotate : s.pan);
      this.out.dragMove(dx * gain, dy * gain);
    } else if (mode === Mode.ZOOM && zoom !== 1) {
      this.wheelRest += Math.log2(zoom) * STEPS * s.zoom * (s.invertZoom ? -1 : 1);
      const steps = Math.trunc(this.wheelRest);
      if (steps) {
        this.wheelRest -= steps;
        this.out.wheel(steps);
      }
    }
  }

  stop() {
    if (this.mode === Mode.ROTATE || this.mode === Mode.PAN) this.out.dragEnd();
    this.mode = Mode.NONE;
    this.wheelRest = 0;
  }
}
