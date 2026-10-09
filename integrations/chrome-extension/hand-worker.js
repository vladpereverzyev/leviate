// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// The hand worker of the web app, started as a classic worker: Chrome extensions allow
// no eval, so MediaPipe loads its WebAssembly glue with the real importScripts here.

self.LEVIATE_CLASSIC_WORKER = true;
import('./js/hand-worker.js');
