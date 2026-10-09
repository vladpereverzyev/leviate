// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// The mouse of the Chrome extension: what Leviate for Desktop does with the real mouse,
// done inside the page of the active tab through the Chrome DevTools Protocol
// (chrome.debugger). The page gets real mouse events, so 3D viewers, links and menus
// answer as they do to the mouse. Chrome shows a bar saying that Leviate is using the
// tab while the hand is on.
//
// A small layer drawn in the page shows the cursor of the hand (Mouse) and the ring of
// the click poses. It also keeps where the real mouse was last, where 3D drags start.

const PROTOCOL = '1.3';
const PRESS = 6;      // how far the hand moves before the buttons go down, in pixels
const CLUTCH = 350;   // how far a drag goes before it starts again from where it began
const STEP = 8;       // time between two moves during a drag, in ms
const FRAME = 34;     // time between two moves of the hand at 30 fps, in ms
const WHEEL_GAP = 15; // time between two parts of a wheel step, in ms
const WHEEL_PART = 0.2;
const WHEEL_MAX = 6;
const WHEEL_PIXELS = 100;

const BUTTON_BITS = { left: 1, right: 2, middle: 4 };
const KEY_BITS = { alt: 1, ctrl: 2, shift: 8 };

// Runs inside the page. Draws the layer once and leaves window.__leviate to talk to.
function layer() {
  if (window.__leviate) return;
  const host = document.createElement('leviate-hand');
  host.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647;';
  const root = host.attachShadow({ mode: 'closed' });
  root.innerHTML = `
    <style>
      :host { all: initial; }
      .at { position: fixed; left: 0; top: 0; width: 0; height: 0; display: none; }
      .cursor { position: absolute; left: -2px; top: -2px; width: 22px; height: 22px; filter: drop-shadow(0 1px 2px rgba(0,0,0,.5)); }
      .ring { position: absolute; left: -36px; top: -36px; width: 72px; height: 72px; display: none; }
      .track { stroke: rgba(70,70,70,.55); } .shadow { stroke: rgba(0,0,0,.35); }
      .inner { display: none; } svg.double .inner { display: inline; }
      #flash { opacity: 0; transform-origin: 36px 36px; }
      #flash.go { animation: flash 350ms ease-out; }
      @keyframes flash { from { opacity: .6; transform: scale(.6); } to { opacity: 0; transform: scale(1.3); } }
    </style>
    <div class="at">
      <svg class="ring" viewBox="0 0 72 72">
        <circle class="shadow" cx="36" cy="36" r="24" fill="none" stroke-width="9"/>
        <circle class="track" cx="36" cy="36" r="24" fill="none" stroke-width="5"/>
        <circle id="arc" cx="36" cy="36" r="24" fill="none" stroke-width="5" stroke-linecap="round"
                stroke-dasharray="150.8" stroke-dashoffset="150.8" transform="rotate(-90 36 36)"/>
        <circle class="inner shadow" cx="36" cy="36" r="13" fill="none" stroke-width="8"/>
        <circle class="inner track" cx="36" cy="36" r="13" fill="none" stroke-width="4"/>
        <circle class="inner" id="arc2" cx="36" cy="36" r="13" fill="none" stroke-width="4" stroke-linecap="round"
                stroke-dasharray="81.7" stroke-dashoffset="81.7" transform="rotate(-90 36 36)"/>
        <circle id="flash" cx="36" cy="36" r="22"/>
      </svg>
      <svg class="cursor" viewBox="0 0 22 22"><path d="M2 2l6.5 17 2.6-7.1 7.1-2.6z" fill="#2791CB" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>
    </div>`;
  const at = root.querySelector('.at');
  const ring = root.querySelector('.ring');
  const cursor = root.querySelector('.cursor');
  const arc = root.getElementById('arc');
  const arc2 = root.getElementById('arc2');
  const flash = root.getElementById('flash');
  const COLORS = { left: '#10B279', double: '#10B279', right: '#E0B85A' };
  const state = { x: innerWidth / 2, y: innerHeight / 2 };
  const place = () => { (document.documentElement || document.body)?.append(host); };
  place();
  addEventListener('DOMContentLoaded', place);
  addEventListener('mousemove', (e) => { state.x = e.clientX; state.y = e.clientY; }, true);
  window.__leviate = {
    where: () => [state.x, state.y, innerWidth, innerHeight],
    cursor(x, y) {
      if (!host.isConnected) place();
      at.style.display = x === null ? 'none' : 'block';
      cursor.style.display = x === null ? 'none' : 'block';
      if (x !== null) at.style.transform = `translate(${x}px, ${y}px)`;
    },
    ring(mode, progress) {
      const double = mode === 'double';
      ring.style.display = mode ? 'block' : 'none';
      ring.classList.toggle('double', double);
      arc.style.stroke = arc2.style.stroke = COLORS[mode] || '#fff';
      arc.style.strokeDashoffset = String(double ? 0 : 150.8 * (1 - progress));
      arc2.style.strokeDashoffset = String(81.7 * (1 - (double ? progress : 0)));
    },
    flash(mode) {
      flash.style.fill = COLORS[mode] || '#fff';
      flash.classList.remove('go');
      void flash.getBoundingClientRect();
      flash.classList.add('go');
    },
    hide() { at.style.display = 'none'; ring.style.display = 'none'; },
  };
}

const LAYER = `(${layer})()`;

export class Page {
  // onError(text) when the tab cannot be used or the bar of Chrome was closed.
  constructor({ onError }) {
    this.onError = onError;
    this.tabId = null;
    this.windowId = null;
    this.wanted = false;
    this.next = null;     // the tab the hand should work on
    this.queue = Promise.resolve();
    this.size = [1280, 800];
    this.mouse = null;     // where the hand cursor is, in the page
    this.drag = null;
    this.wheelLeft = 0;
    this.wheelTimer = null;
    this.wheelAt = null;
    chrome.debugger.onDetach.addListener((source, reason) => {
      if (source.tabId !== this.tabId) return;
      this.tabId = null;
      this.drag = null;
      // Closing the bar of Chrome (Cancel) means: stop. A tab that closes or crashes does not.
      if (reason === 'canceled_by_user') this.onError('Chrome stopped Leviate on this tab. Turn the hand on again to go on.');
    });
    chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
      if (this.wanted && windowId === this.windowId) this.follow(tabId);
    });
    chrome.tabs.onUpdated.addListener((tabId, info) => {
      if (this.wanted && tabId === this.tabId && info.status === 'complete') this.send('Runtime.evaluate', { expression: LAYER }).catch(() => {});
    });
  }

  // Follows the active tab of the window of the side panel while the hand is on.
  async start() {
    this.wanted = true;
    this.windowId ??= (await chrome.windows.getCurrent()).id;
    const [tab] = await chrome.tabs.query({ active: true, windowId: this.windowId });
    if (tab && this.wanted) await this.follow(tab.id);
  }

  stop() {
    this.wanted = false;
    this.endDrag();
    return this.follow(null);
  }

  // One change of tab at a time, always towards the last one asked for: a switch of tab
  // while Chrome is still attaching to the one before never leaves the hand on the wrong tab.
  follow(tabId) {
    this.next = tabId;
    this.queue = this.queue.then(async () => {
      if (this.next === this.tabId) return;
      await this.detach();
      if (this.next !== null) await this.attach(this.next);
    });
    return this.queue;
  }

  async attach(tabId) {
    try {
      await chrome.debugger.attach({ tabId }, PROTOCOL);
    } catch (err) {
      this.onError(/chrome:|extensions gallery|Cannot access|Cannot attach/i.test(err.message)
        ? 'Leviate cannot work on this tab: Chrome keeps its own pages and the Chrome Web Store closed to extensions.'
        : `Leviate cannot work on this tab. ${err.message}`);
      return;
    }
    this.tabId = tabId;
    this.onError('');
    await this.send('Page.addScriptToEvaluateOnNewDocument', { source: LAYER }).catch(() => {});
    await this.send('Runtime.evaluate', { expression: LAYER }).catch(() => {});
    await this.measure();
  }

  async detach() {
    const tabId = this.tabId;
    if (tabId === null) return;
    await this.call('hide()');
    this.tabId = null;
    this.drag = null;
    await chrome.debugger.detach({ tabId }).catch(() => {});
  }

  send(method, params = {}) {
    if (this.tabId === null) return Promise.reject(new Error('No tab'));
    return chrome.debugger.sendCommand({ tabId: this.tabId }, method, params);
  }

  // Calls the layer in the page; nothing happens on a page without it yet.
  async call(code) {
    try {
      const { result } = await this.send('Runtime.evaluate', { expression: `window.__leviate?.${code}`, returnByValue: true });
      return result?.value;
    } catch {
      return undefined;
    }
  }

  async measure() {
    const where = await this.call('where()');
    if (where) this.size = [where[2], where[3]];
    return where;
  }

  mouseEvent(type, x, y, extra = {}) {
    return this.send('Input.dispatchMouseEvent', { type, x: Math.round(x), y: Math.round(y), ...extra }).catch(() => {});
  }

  // ------------------------------------------------------------- Mouse

  move(u, v) {
    if (this.tabId === null) return;
    const [w, h] = this.size;
    this.mouse = { x: u * (w - 1), y: v * (h - 1) };
    this.mouseEvent('mouseMoved', this.mouse.x, this.mouse.y);
    this.call(`cursor(${this.mouse.x}, ${this.mouse.y})`);
  }

  async click(button) {
    if (this.tabId === null) return;
    if (!this.mouse) {
      const where = await this.measure();
      this.mouse = where ? { x: where[0], y: where[1] } : { x: this.size[0] / 2, y: this.size[1] / 2 };
    }
    const { x, y } = this.mouse;
    const b = button === 'right' ? 'right' : 'left';
    const one = async (count) => {
      await this.mouseEvent('mousePressed', x, y, { button: b, buttons: BUTTON_BITS[b], clickCount: count });
      await this.mouseEvent('mouseReleased', x, y, { button: b, buttons: 0, clickCount: count });
    };
    await one(1);
    if (button === 'double') await one(2);
    this.call(`flash('${button}')`);
  }

  ring(mode, progress) {
    if (this.tabId !== null) this.call(`ring(${mode ? `'${mode}'` : 'null'}, ${progress})`);
  }

  hideCursor() {
    this.mouse = null;
    if (this.tabId !== null) this.call('cursor(null)');
  }

  // ------------------------------------------------------------- 3D

  // The drag starts where the real mouse was last in the page: the cursor goes over the
  // 3D view first, as in Leviate for Desktop.
  async dragStart(button, keys) {
    this.endDrag();
    if (this.tabId === null) return;
    const buttons = String(button).split('+').sort((a, b) => (b === 'right') - (a === 'right'));
    if (!buttons.every((b) => b in BUTTON_BITS)) return;
    const d = {
      buttons, modifiers: (keys || []).reduce((m, k) => m | (KEY_BITS[k] || 0), 0),
      anchor: null, pos: null, target: null, pending: { x: 0, y: 0 }, pressed: false, rest: 0, due: 0, last: 0, frame: FRAME, timer: null,
    };
    this.drag = d;
    const where = await this.measure();
    if (this.drag !== d) return;
    const p = where ? { x: where[0], y: where[1] } : { x: this.size[0] / 2, y: this.size[1] / 2 };
    d.anchor = p;
    d.pos = p;
    d.target = { x: p.x + d.pending.x, y: p.y + d.pending.y };
  }

  dragMove(dx, dy) {
    const d = this.drag;
    if (!d) return;
    if (!d.anchor) {
      // The start point is still on its way: keep the move for it.
      d.pending.x += dx;
      d.pending.y += dy;
      return;
    }
    const now = Date.now();
    if (d.last) d.frame += (Math.min(Math.max(now - d.last, 16), 200) - d.frame) * 0.3;
    d.last = now;
    d.target = { x: d.target.x + dx, y: d.target.y + dy };
    d.due = now + d.frame * 1.5;
    d.timer ||= setInterval(() => this.dragStep(d), STEP);
  }

  bits(d) {
    return d.buttons.reduce((m, b) => m | BUTTON_BITS[b], 0);
  }

  async press(d, at) {
    let held = 0;
    for (const b of d.buttons) {
      held |= BUTTON_BITS[b];
      await this.mouseEvent('mousePressed', at.x, at.y, { button: b, buttons: held, clickCount: 1, modifiers: d.modifiers });
    }
    d.pressed = true;
  }

  async letGo(d, at) {
    let held = this.bits(d);
    for (const b of [...d.buttons].reverse()) {
      held &= ~BUTTON_BITS[b];
      await this.mouseEvent('mouseReleased', at.x, at.y, { button: b, buttons: held, clickCount: 1, modifiers: d.modifiers });
    }
    d.pressed = false;
  }

  dragStep(d) {
    if (this.drag !== d || this.tabId === null) return;
    const now = Date.now();
    if (!d.pressed) {
      if (d.busy || now < d.rest || Math.hypot(d.target.x - d.anchor.x, d.target.y - d.anchor.y) < PRESS) return;
      d.busy = true;
      this.press(d, d.pos).then(() => { d.busy = false; });
      return;
    }
    const k = now >= d.due ? 1 : Math.min(1, STEP / (d.due - now));
    const next = { x: d.pos.x + (d.target.x - d.pos.x) * k, y: d.pos.y + (d.target.y - d.pos.y) * k };
    if (Math.hypot(next.x - d.anchor.x, next.y - d.anchor.y) > CLUTCH) {
      // Far from where it began: let go, go back and grab again, so the drag never
      // leaves the 3D view.
      this.letGo(d, d.pos);
      d.target = { x: d.target.x - (d.pos.x - d.anchor.x), y: d.target.y - (d.pos.y - d.anchor.y) };
      d.pos = d.anchor;
      this.mouseEvent('mouseMoved', d.anchor.x, d.anchor.y, { modifiers: d.modifiers });
      d.rest = now + STEP * 4;
      return;
    }
    if (Math.round(next.x) !== Math.round(d.pos.x) || Math.round(next.y) !== Math.round(d.pos.y)) {
      this.mouseEvent('mouseMoved', next.x, next.y, { button: d.buttons[0], buttons: this.bits(d), modifiers: d.modifiers });
    }
    d.pos = next;
  }

  endDrag() {
    const d = this.drag;
    this.drag = null;
    if (!d) return;
    clearInterval(d.timer);
    if (d.pressed) this.letGo(d, d.pos).then(() => this.mouseEvent('mouseMoved', d.anchor.x, d.anchor.y));
  }

  // The wheel goes out in small even parts, so the zoom flows. Positive is away from the user.
  wheel(steps) {
    if (!steps || this.tabId === null) return;
    if (Math.sign(steps) !== Math.sign(this.wheelLeft)) this.wheelLeft = 0;
    this.wheelLeft = Math.max(-WHEEL_MAX, Math.min(WHEEL_MAX, this.wheelLeft + steps));
    this.wheelTimer ||= setInterval(async () => {
      if (Math.abs(this.wheelLeft) < WHEEL_PART || this.tabId === null) {
        clearInterval(this.wheelTimer);
        this.wheelTimer = null;
        this.wheelLeft = 0;
        this.wheelAt = null;
        return;
      }
      const part = Math.sign(this.wheelLeft) * WHEEL_PART;
      this.wheelLeft -= part;
      this.wheelAt ??= (await this.measure()) || [this.size[0] / 2, this.size[1] / 2];
      const [x, y] = this.wheelAt;
      this.mouseEvent('mouseWheel', x, y, { deltaX: 0, deltaY: -part * WHEEL_PIXELS });
    }, WHEEL_GAP);
  }
}
