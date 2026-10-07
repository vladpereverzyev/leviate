// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// A word for Ko-fi after 15 minutes with the camera on, and again after 2 more hours of use
// with Remind me later; never again after Support or Don't ask again. Only while the camera
// is off, so it never comes up in the middle of work. Same as in Leviate for Desktop.

const KEY = 'leviate.support';
const FIRST = 15 * 60;
const AGAIN = 2 * 60 * 60;

export function setupSupport(cameraOn) {
  const box = document.getElementById('support');
  const state = { useSeconds: 0, supportAt: FIRST, supportDone: false };
  try { Object.assign(state, JSON.parse(localStorage.getItem(KEY)) || {}); } catch {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };

  const ask = () => {
    if (state.supportDone || cameraOn() || state.useSeconds < state.supportAt) return;
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
  setInterval(() => {
    if (cameraOn()) {
      state.useSeconds += 60;
      save();
    }
    ask();
  }, 60 * 1000);
  ask();
}
