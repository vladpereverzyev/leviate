// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// A word for Ko-fi 2 minutes after the web app opens, on every visit, also while the camera
// is on. Remind me later hides it until the next visit, Support or Don't ask again for good:
// only that answer is kept, so the note is not shown again to someone who said no.

const KEY = 'leviate.support';
const AFTER = 2 * 60 * 1000;

export function setupSupport() {
  const box = document.getElementById('support');
  let done = false;
  try { done = !!JSON.parse(localStorage.getItem(KEY))?.supportDone; } catch {}
  const never = () => {
    box.hidden = true;
    try { localStorage.setItem(KEY, JSON.stringify({ supportDone: true })); } catch {}
  };
  document.getElementById('support-kofi').addEventListener('click', never);
  document.getElementById('support-never').onclick = never;
  document.getElementById('support-later').onclick = () => { box.hidden = true; };
  if (!done) setTimeout(() => { box.hidden = false; }, AFTER);
}
