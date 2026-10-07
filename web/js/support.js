// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// A word for Ko-fi after 15 minutes with the camera on, and again after 2 more hours of use
// with Remind me later; never again after Support or Don't ask again. Only while the camera
// is off, so it never comes up in the middle of work. Same as in Leviate for Desktop.
//
// The minutes are counted and kept only with the Statistics consent: without it nothing is
// stored and the note never shows. Taking the consent back removes what was kept.

import { granted } from './consent.js';

const KEY = 'leviate.support';
const FIRST = 15 * 60;
const AGAIN = 2 * 60 * 60;

export function setupSupport(cameraOn) {
  const box = document.getElementById('support');
  const fresh = () => ({ useSeconds: 0, supportAt: FIRST, supportDone: false });
  let state = fresh();
  const allowed = () => granted('statistics');
  const load = () => {
    state = fresh();
    try { Object.assign(state, JSON.parse(localStorage.getItem(KEY)) || {}); } catch {}
  };
  const save = () => {
    if (!allowed()) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  };
  const forget = () => {
    box.hidden = true;
    state = fresh();
    try { localStorage.removeItem(KEY); } catch {}
  };

  const ask = () => {
    if (!allowed() || state.supportDone || cameraOn() || state.useSeconds < state.supportAt) return;
    box.hidden = false;
  };
  const never = () => {
    state.supportDone = true;
    box.hidden = true;
    save();
  };
  document.getElementById('support-kofi').addEventListener('click', never);
  document.getElementById('support-never').onclick = never;
  document.getElementById('support-later').onclick = () => {
    state.supportAt = state.useSeconds + AGAIN;
    box.hidden = true;
    save();
  };

  let was = allowed();
  if (was) load();
  else forget();
  setInterval(() => {
    const now = allowed();
    if (now && !was) load();
    if (!now) {
      if (was) forget();
      was = now;
      return;
    }
    was = now;
    if (cameraOn()) {
      state.useSeconds += 60;
      save();
    }
    ask();
  }, 60 * 1000);
  ask();
}
