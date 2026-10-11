// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// the same page in Chrome and in Edge: it names the browser it runs in (browser.js, for the modules)
const BROWSER = /Edg\//.test(navigator.userAgent) ? 'Edge' : 'Chrome';
for (const el of document.querySelectorAll('[data-browser]')) el.textContent = el.textContent.replace(/Chrome/g, BROWSER);

navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then((stream) => {
  stream.getTracks().forEach((t) => t.stop());
  document.getElementById('title').textContent = 'Camera allowed';
  document.getElementById('text').textContent = 'Press Start in the Leviate panel. This tab closes by itself.';
  chrome.runtime.sendMessage({ type: 'camera-allowed' }).catch(() => {});
  setTimeout(() => window.close(), 1200);
}).catch((err) => {
  document.getElementById('title').textContent = 'The camera is blocked';
  document.getElementById('text').textContent = `${err.message}. Click the camera icon in the address bar, allow it and open this page again.`;
});
