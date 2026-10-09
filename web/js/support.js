// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// A word for Ko-fi 2 minutes after the web app opens, on every visit, also while the camera
// is on. Remind me later hides it until the next visit, Support or Don't ask again for good:
// only that answer is kept, so the note is not shown again to someone who said no.
// Ko-fi opens in a small window of its own: in a new tab the browser would put the web app
// to sleep and the camera, the hand and the model would stop until the tab comes back.

const KEY = 'leviate.support';
const AFTER = 2 * 60 * 1000;

// Another note on screen (the Wi-Fi one of Use phone) comes first: the Ko-fi note waits for
// it and comes back once it is closed.
let held = false;
let due = false;
let show = () => {};

export function holdSupport(on) {
  held = on;
  const box = document.getElementById('support');
  if (on) {
    if (!box.hidden) { box.hidden = true; due = true; }
  } else if (due) {
    show();
  }
}

export function setupSupport() {
  const box = document.getElementById('support');
  show = () => {
    due = held;
    box.hidden = held;
  };
  let done = false;
  try { done = !!JSON.parse(localStorage.getItem(KEY))?.supportDone; } catch {}
  const never = () => {
    box.hidden = true;
    try { localStorage.setItem(KEY, JSON.stringify({ supportDone: true })); } catch {}
  };
  document.getElementById('support-kofi').addEventListener('click', (e) => {
    const w = 480, h = Math.min(760, screen.availHeight - 40);
    const left = (screen.availLeft || 0) + screen.availWidth - w - 20;
    const top = (screen.availTop || 0) + 20;
    const opened = window.open(e.currentTarget.href, 'kofi', `popup,width=${w},height=${h},left=${left},top=${top}`);
    if (opened) { opened.opener = null; e.preventDefault(); }
    never();
  });
  document.getElementById('support-never').onclick = never;
  document.getElementById('support-later').onclick = () => { box.hidden = true; };
  if (!done) setTimeout(() => show(), AFTER);
}
