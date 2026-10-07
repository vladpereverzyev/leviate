// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// Consent banner and preferences, same look and wording as vladpereverzyev.com.
// Leviate sets no cookies. The webcam runs only when "camera" is allowed, and the
// PeerJS broker behind Use phone only when "external" is allowed too.

const KEY = 'leviate.consent';
const VERSION = 1;
const MONTHS = 6;

// The markup lives here so the app and the privacy page share one copy.
document.body.insertAdjacentHTML('beforeend', `
  <div class="cc" data-cc hidden><div class="cc__bar" role="dialog" aria-modal="false" aria-labelledby="cc-title"><div class="cc__inner">
    <div class="cc__copy">
      <p class="cc__h" id="cc-title">Cookies and privacy</p>
      <p class="cc__p">Leviate sets no cookies and has no analytics or advertising. The camera starts only if you allow it and its video is read on your device, never sent anywhere. <b>Use phone</b> also needs an outside service: the PeerJS server that connects the phone to the computer, which sees the IP addresses but never the video. Without your consent camera and phone stay off, and the choice is kept on your device for six months. <a href="privacy.html">Privacy and cookie policy</a></p>
    </div>
    <div class="cc__actions">
      <button class="btn ghost" type="button" data-cc-prefs>Preferences</button>
      <button class="btn" type="button" data-cc-reject>Reject all</button>
      <button class="btn" type="button" data-cc-accept>Accept all</button>
    </div>
  </div></div></div>

  <div class="ccp" data-cc-panel hidden><div class="ccp__box" role="dialog" aria-modal="true" aria-labelledby="ccp-title">
    <h2 class="ccp__h" id="ccp-title">Cookie preferences</h2>
    <p class="ccp__p">Choose what may run in Leviate. A category with nothing in it stays empty until a tool is actually added.</p>
    <p class="ccp__record" data-cc-record hidden></p>
    <ul class="ccp__list">
      <li class="ccp__item"><div class="ccp__copy"><p class="ccp__name">Necessary</p><p class="ccp__desc">Your settings, the position of the windows and the memory of this choice, kept in your browser storage.</p><p class="ccp__state">No cookies.</p></div><span class="ccp__always">Always active</span></li>
      <li class="ccp__item"><div class="ccp__copy"><p class="ccp__name">Camera</p><p class="ccp__desc">The webcam or phone camera for hand gestures. Hand tracking runs on your device and the video is never recorded or sent.</p><p class="ccp__state">MediaPipe, bundled with the app</p></div><label class="ccp__switch"><input type="checkbox" data-cc-cat="camera"><span class="ccp__track" aria-hidden="true"></span><span class="ccp__sr">Camera</span></label></li>
      <li class="ccp__item"><div class="ccp__copy"><p class="ccp__name">Statistics</p><p class="ccp__desc">Counting visits and how the app is used.</p><p class="ccp__state">Nothing in use today.</p></div><label class="ccp__switch"><input type="checkbox" data-cc-cat="statistics"><span class="ccp__track" aria-hidden="true"></span><span class="ccp__sr">Statistics</span></label></li>
      <li class="ccp__item"><div class="ccp__copy"><p class="ccp__name">External services</p><p class="ccp__desc">Needed for <b>Use phone</b> and its QR code: the PeerJS server connects phone and computer, then the video goes straight between them, encrypted.</p><p class="ccp__state">PeerJS (0.peerjs.com)</p></div><label class="ccp__switch"><input type="checkbox" data-cc-cat="external"><span class="ccp__track" aria-hidden="true"></span><span class="ccp__sr">External services</span></label></li>
    </ul>
    <div class="ccp__actions">
      <button class="btn ghost" type="button" data-cc-close>Close</button>
      <button class="btn" type="button" data-cc-save>Save preferences</button>
    </div>
  </div></div>
`);

const $ = (sel) => document.querySelector(sel);

// Opened from the QR code: the banner speaks to the phone that sends its camera.
if (new URLSearchParams(location.search).has('pair')) {
  $('.cc__p').innerHTML = 'This page turns your phone into the webcam of your computer. '
    + 'Leviate sets no cookies and has no analytics or advertising. The camera starts only if you allow it '
    + 'and its video goes straight to your computer, encrypted, never recorded or kept. To connect the two '
    + 'devices the PeerJS server sees their IP addresses but never the video. Without your consent Camera and '
    + 'External services stay off, and the choice is kept on this phone for six months. '
    + '<a href="privacy.html">Privacy and cookie policy</a>';
}
const banner = $('[data-cc]');
const panel = $('[data-cc-panel]');
const record = $('[data-cc-record]');
const boxes = [...document.querySelectorAll('[data-cc-cat]')];

let choices = null;
let waiting = [];   // callbacks of ensure() calls waiting for the panel to close

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    if (!v || v.version !== VERSION) return null;
    // Six months, then the question comes back.
    if (Date.now() - v.ts > MONTHS * 30 * 24 * 3600 * 1000) return null;
    return v;
  } catch {
    return null;
  }
}

// A random code that identifies nobody, shown in the panel so a visitor can quote it.
function newId() {
  const b = new Uint8Array(6);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function showRecord(v) {
  if (!v) { record.hidden = true; return; }
  const d = new Date(v.ts).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  record.textContent = `Choice saved on ${d}, code ${v.id}`;
  record.hidden = false;
}

function save(next) {
  const v = { version: VERSION, ts: Date.now(), id: newId(), choices: next };
  try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* private mode: asked again next time */ }
  choices = next;
  showRecord(v);
  banner.hidden = true;
  close();
}

function all(value) {
  return Object.fromEntries(boxes.map((b) => [b.dataset.ccCat, value]));
}

function open() {
  boxes.forEach((b) => { b.checked = !!choices?.[b.dataset.ccCat]; });
  panel.hidden = false;
  requestAnimationFrame(() => panel.classList.add('is-open'));
  panel.querySelector('[data-cc-save]').focus({ preventScroll: true });
}

function close() {
  if (panel.hidden) return finish();
  panel.classList.remove('is-open');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  setTimeout(() => { panel.hidden = true; }, reduced ? 0 : 300);
  finish();
}

function finish() {
  panel.querySelectorAll('.is-asked').forEach((el) => el.classList.remove('is-asked'));
  const list = waiting;
  waiting = [];
  list.forEach((done) => done());
}

export function granted(cat) {
  return !!choices?.[cat];
}

// Resolves true when every category is allowed, opening the preferences first if not.
export function ensure(...cats) {
  const ok = () => cats.every(granted);
  if (ok()) return Promise.resolve(true);
  return new Promise((resolve) => {
    waiting.push(() => resolve(ok()));
    open();
    for (const cat of cats) {
      if (!granted(cat)) panel.querySelector(`[data-cc-cat="${cat}"]`)?.closest('.ccp__item')?.classList.add('is-asked');
    }
  });
}

export function openPreferences() {
  open();
}

const stored = read();
choices = stored?.choices || null;
showRecord(stored);
if (!stored) banner.hidden = false;

// While the banner is open the pages keep room for it under the footer, so the footer is not
// hidden behind it.
new ResizeObserver(() => {
  document.documentElement.style.setProperty('--cc-room', banner.hidden ? '0px' : `${banner.offsetHeight}px`);
}).observe(banner);

banner.querySelector('[data-cc-accept]').addEventListener('click', () => save(all(true)));
banner.querySelector('[data-cc-reject]').addEventListener('click', () => save(all(false)));
banner.querySelector('[data-cc-prefs]').addEventListener('click', open);
panel.querySelector('[data-cc-save]').addEventListener('click', () => {
  save(Object.fromEntries(boxes.map((b) => [b.dataset.ccCat, b.checked])));
});
panel.querySelector('[data-cc-close]').addEventListener('click', close);
panel.addEventListener('click', (e) => { if (e.target === panel) close(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) close(); });
document.querySelectorAll('[data-cc-open]').forEach((a) => a.addEventListener('click', (e) => {
  e.preventDefault();
  open();
}));
