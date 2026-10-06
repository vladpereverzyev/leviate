// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// Hand tracking off the main thread, so the 3D view never waits for it.
// The page sends one video frame at a time as an ImageBitmap and gets back
// the 21 hand points.

// MediaPipe loads its WebAssembly glue with importScripts, which module workers
// do not allow. A synchronous request plus a global eval does the same job.
self.importScripts = (...urls) => {
  for (const url of urls) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send();
    if (xhr.status >= 400) throw new Error(`Could not load ${url}`);
    (0, eval)(xhr.responseText);
  }
};

const { FilesetResolver, HandLandmarker } = await import('../vendor/mediapipe/vision_bundle.mjs');

let landmarker = null;
let lastTs = 0;

async function init() {
  const fileset = await FilesetResolver.forVisionTasks(new URL('../vendor/mediapipe/wasm', import.meta.url).href);
  landmarker = await HandLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: new URL('../models/hand_landmarker.task', import.meta.url).href, delegate: 'CPU' },
    runningMode: 'VIDEO',
    numHands: 1,
    minHandDetectionConfidence: 0.6,
    minHandPresenceConfidence: 0.6,
    minTrackingConfidence: 0.5,
  });
}

self.onmessage = async ({ data }) => {
  if (data.type === 'init') {
    try {
      await init();
      self.postMessage({ type: 'ready' });
    } catch (err) {
      self.postMessage({ type: 'error', message: String(err?.message || err) });
    }
    return;
  }
  if (data.type === 'frame') {
    const { bitmap } = data;
    try {
      // Timestamps must grow, even if two frames arrive in the same millisecond.
      const ts = Math.max(data.ts, lastTs + 1);
      lastTs = ts;
      const t0 = performance.now();
      const result = landmarker.detectForVideo(bitmap, ts);
      self.postMessage({
        type: 'result',
        lm: result.landmarks?.[0] || null,
        world: result.worldLandmarks?.[0] || null,
        ms: performance.now() - t0,
      });
    } catch (err) {
      self.postMessage({ type: 'result', lm: null, ms: 0, error: String(err?.message || err) });
    } finally {
      bitmap.close();
    }
  }
};

self.postMessage({ type: 'loaded' });
