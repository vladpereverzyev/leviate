// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// No cookie banner in the extension, as in Leviate for Desktop: js/phone.js asks
// js/consent.js before the camera and PeerJS, because a web page runs in the browser of
// a visitor. The extension is installed on purpose, Chrome asks for the camera and the
// pairing through PeerJS is explained before its first use (panel.js). This record,
// written before consent.js loads, tells it so.

try {
  localStorage.setItem('leviate.consent', JSON.stringify({
    version: 1, ts: Date.now(), id: 'chrome', choices: { camera: true, statistics: false, external: true },
  }));
} catch {}
