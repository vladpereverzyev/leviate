// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// Floating windows.
// Desktop: drag by the title bar, collapse with its button, positions are remembered.
// Phone: the windows stack under the header like an accordion, one open at a time.

const STORE_KEY = 'leviate.windows';
const MARGIN = 8;
const PHONE_TOP = 76;
const PHONE_GAP = 8;

function load() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
}
function save(state) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {}
}

export function setupWindows(root = document) {
  const state = load();
  const wins = [...root.querySelectorAll('.win')];
  const phone = () => matchMedia('(max-width: 700px)').matches;
  let top = 10;

  const place = (win, x, y) => {
    win.style.left = x + 'px';
    win.style.top = y + 'px';
    win.style.right = 'auto';
    win.style.bottom = 'auto';
  };

  const clamp = (win) => {
    const r = win.getBoundingClientRect();
    const x = Math.min(Math.max(r.left, MARGIN), window.innerWidth - Math.min(r.width, 120) - MARGIN);
    const y = Math.min(Math.max(r.top, MARGIN), window.innerHeight - 44 - MARGIN);
    place(win, x, y);
  };

  const remember = (win) => {
    const saved = state[win.id] || {};
    saved.collapsed = win.classList.contains('collapsed');
    if (!phone()) {
      const r = win.getBoundingClientRect();
      saved.x = r.left;
      saved.y = r.top;
    }
    state[win.id] = saved;
    save(state);
  };

  // Phone layout: one column under the header.
  const stack = () => {
    let y = PHONE_TOP;
    for (const win of wins) {
      win.style.left = '12px';
      win.style.right = 'auto';
      win.style.bottom = 'auto';
      win.style.top = y + 'px';
      y += win.offsetHeight + PHONE_GAP;
    }
  };

  // Desktop layout: saved positions or the CSS defaults.
  const spread = () => {
    for (const win of wins) {
      const saved = state[win.id];
      if (saved && saved.x !== undefined) {
        place(win, saved.x, saved.y);
        clamp(win);
      } else {
        win.style.left = win.style.top = win.style.right = win.style.bottom = '';
      }
    }
  };

  const layout = () => (phone() ? stack() : spread());

  const toggle = (win) => {
    const open = win.classList.toggle('collapsed') === false;
    if (open && phone()) {
      for (const other of wins) {
        if (other !== win && !other.classList.contains('collapsed')) {
          other.classList.add('collapsed');
          remember(other);
        }
      }
    }
    remember(win);
    if (phone()) stack();
  };

  const raise = (win) => { win.style.zIndex = ++top; };

  for (const win of wins) {
    const saved = state[win.id];
    if (saved) win.classList.toggle('collapsed', !!saved.collapsed);
    else if (phone()) win.classList.add('collapsed');

    const head = win.querySelector('.win-head');
    const fold = win.querySelector('.win-fold');

    fold?.addEventListener('click', () => toggle(win));
    win.addEventListener('pointerdown', () => raise(win));

    head.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button, input, select, label')) return;
      e.preventDefault();
      const r = win.getBoundingClientRect();
      const dx = e.clientX - r.left;
      const dy = e.clientY - r.top;
      const canDrag = !phone();
      head.setPointerCapture(e.pointerId);

      let moved = false;
      const move = (ev) => {
        if (!canDrag) return;
        if (!moved && Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < 5) return;
        moved = true;
        win.classList.add('dragging');
        place(win, ev.clientX - dx, ev.clientY - dy);
        clamp(win);
      };
      const end = () => {
        head.removeEventListener('pointermove', move);
        win.classList.remove('dragging');
        // A tap on the title bar opens or closes the window on touch screens.
        if (!moved && (e.pointerType !== 'mouse' || phone())) toggle(win);
        else if (moved) remember(win);
      };
      head.addEventListener('pointermove', move);
      head.addEventListener('pointerup', end, { once: true });
      head.addEventListener('pointercancel', end, { once: true });
    });

    head.addEventListener('dblclick', (e) => {
      if (!e.target.closest('button') && !phone()) toggle(win);
    });
  }

  // Content can change size (files added, settings opened), so restack on phones.
  const observer = new ResizeObserver(() => { if (phone()) stack(); });
  wins.forEach((win) => observer.observe(win));
  window.addEventListener('resize', layout);
  layout();
}
