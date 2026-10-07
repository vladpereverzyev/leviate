// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// No cookie banner in the desktop app. js/phone.js of the web app asks js/consent.js
// before the camera and PeerJS, because a web page runs in the browser of a visitor.
// The desktop program is installed on purpose, stores only its own settings, the system
// asks for the camera and the video stays on this computer. The only thing that leaves
// it is the pairing through the PeerJS server for the phone, explained once before its
// first use (control.js). This record, written before consent.js loads, tells it so.

try {
  localStorage.setItem('leviate.consent', JSON.stringify({
    version: 1, ts: Date.now(), id: 'desktop', choices: { camera: true, statistics: false, external: true },
  }));
} catch {}
