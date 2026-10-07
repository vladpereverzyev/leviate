// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// Floating windows.
// Desktop: drag by the title bar, collapse with its button, positions are remembered.
// Phone: the windows stack under the header like an accordion, one open at a time.

const STORE_KEY = 'leviate.windows';
const MARGIN = 8;
const PHONE_TOP = 76;
const PHONE_GAP = 8;
// Room left free at the bottom for the view tools and the footer.
const TOOLS = 104;

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

  // The whole window stays on the screen; the top keeps room for the title bar.
  const clamp = (win) => {
    const r = win.getBoundingClientRect();
    const x = Math.min(Math.max(r.left, MARGIN), Math.max(MARGIN, window.innerWidth - r.width - MARGIN));
    const y = Math.min(Math.max(r.top, MARGIN), window.innerHeight - 44 - MARGIN);
    place(win, x, y);
  };

  // The window ends above the view tools wherever it is; a low screen scrolls its inside.
  const fitHeight = (win) => {
    if (phone()) { win.style.maxHeight = ''; return; }
    const top = win.getBoundingClientRect().top;
    win.style.maxHeight = Math.max(120, window.innerHeight - top - TOOLS) + 'px';
  };

  // A window keeps its distance from the side it is closer to, so when the page gets
  // narrower or wider the Webcam window stays on the right and Files on the left.
  const anchor = (win, saved) => {
    const r = win.getBoundingClientRect();
    const right = saved.side === 'right';
    let x = Math.max(MARGIN, saved.x);
    if (x + r.width + MARGIN > window.innerWidth) x = Math.max(MARGIN, window.innerWidth - r.width - MARGIN);
    const y = Math.min(Math.max(saved.y, MARGIN), window.innerHeight - 44 - MARGIN);
    win.style.top = y + 'px';
    win.style.bottom = 'auto';
    win.style.left = right ? 'auto' : x + 'px';
    win.style.right = right ? x + 'px' : 'auto';
    fitHeight(win);
  };

  const remember = (win) => {
    const saved = state[win.id] || {};
    saved.collapsed = win.classList.contains('collapsed');
    if (!phone()) {
      const r = win.getBoundingClientRect();
      saved.side = r.left + r.width / 2 > window.innerWidth / 2 ? 'right' : 'left';
      saved.x = saved.side === 'right' ? window.innerWidth - r.right : r.left;
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
      win.style.maxHeight = '';
      y += win.offsetHeight + PHONE_GAP;
    }
  };

  // Desktop layout: saved positions or the CSS defaults.
  const spread = () => {
    for (const win of wins) {
      const saved = state[win.id];
      if (saved && saved.x !== undefined) {
        // Positions saved before the side was remembered were taken from the left.
        if (!saved.side) {
          saved.side = 'left';
          if (saved.x > window.innerWidth / 2) {
            saved.side = 'right';
            saved.x = Math.max(MARGIN, window.innerWidth - saved.x - win.offsetWidth);
          }
        }
        anchor(win, saved);
      } else {
        win.style.left = win.style.top = win.style.right = win.style.bottom = '';
        fitHeight(win);
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
        fitHeight(win);
      };
      const end = () => {
        head.removeEventListener('pointermove', move);
        win.classList.remove('dragging');
        // A tap on the title bar opens or closes the window on touch screens.
        if (!moved && (e.pointerType !== 'mouse' || phone())) toggle(win);
        else if (moved) { remember(win); anchor(win, state[win.id]); }
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
