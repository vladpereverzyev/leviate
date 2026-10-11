// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// The same extension runs in Chrome and in Edge (both are built on Chromium, with the same side
// panel and debugger): what it says to the user names the browser it runs in.
export const BROWSER = /\bEdg\//.test(navigator.userAgent) ? 'Edge' : 'Chrome';
// where a browser keeps extensions out (besides its own pages)
export const STORE = BROWSER === 'Edge' ? 'the Edge Add-ons store' : 'the Chrome Web Store';

/** Every element marked data-browser says the browser's name instead of Chrome. */
export function nameBrowser(root = document) {
  for (const el of root.querySelectorAll('[data-browser]')) el.textContent = el.textContent.replace(/Chrome/g, BROWSER);
}
