// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// Hand tracking with medical gloves.
// The hand model was trained on bare skin, so it often misses blue, purple or black
// gloves. While no hand is in view, every other frame goes to the model through a
// filter that paints the gloves in a skin tone. The filter that finds the hand stays
// on until the hand is gone. Bare hands never see a filter once they are found.
// integrations/blender/leviate/gloves.py does the same in Blender.

// Plain frames take turns with the filters, so bare hands are still found right away.
const CYCLE = [null, 'color', null, 'tone', null, 'dark'];
// Frames without a hand before the search starts again (the model loses a hand for a
// frame or two now and then).
const HOLD = 10;
// Frames go to the model at most this big, filtered or not: it looks at 224 pixels
// anyway and a smaller frame saves it more time than the filter costs.
const MAX_SIDE = 640;

// Size of a width x height frame once it fits MAX_SIDE.
function fitSize(width, height) {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height, 1));
  return [Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale))];
}

let resize = true;

// The current video frame as an ImageBitmap for the hand model, already at the
// smaller size. Browsers that refuse the resize get the full frame from then on.
export async function frameBitmap(video) {
  if (resize) {
    const [resizeWidth, resizeHeight] = fitSize(video.videoWidth, video.videoHeight);
    try {
      return await createImageBitmap(video, { resizeWidth, resizeHeight, resizeQuality: 'medium' });
    } catch {
      // Only the resize is to blame if the full frame works.
      const bitmap = await createImageBitmap(video);
      resize = false;
      return bitmap;
    }
  }
  return createImageBitmap(video);
}

// Skin tone the gloves are painted with, as a share of the brightness.
const SKIN_G = 0.78;
const SKIN_B = 0.64;

// Pixels are read as one 32 bit word each (red in the low byte), and every filter
// turns a brightness into a ready skin pixel through a table.
function table(fn) {
  const t = new Uint32Array(256);
  for (let m = 0; m < 256; m++) {
    const [r, g, b] = fn(m).map((c) => Math.round(Math.min(255, Math.max(0, c))));
    t[m] = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
  }
  return t;
}
const skin = (v) => [v, v * SKIN_G, v * SKIN_B];
const COLOR_SKIN = table((m) => skin(255 * (0.15 + 0.85 * m / 255)));
const DARK_SKIN = table((m) => skin(255 * (0.35 + 0.6 * Math.min(m, 70) / 70)));
const words = (d) => new Uint32Array(d.buffer, d.byteOffset, d.length >> 2);

// Blue, purple, green and every other colored glove: colored pixels that are not
// reddish (skin, wood) take a skin hue and keep their brightness.
function color(d) {
  const p = words(d);
  for (let i = 0; i < p.length; i++) {
    const x = p[i];
    const r = x & 255, g = (x >> 8) & 255, b = (x >> 16) & 255;
    if (r >= g && r >= b) continue;
    const mx = g > b ? g : b;
    const mn = r < g ? (r < b ? r : b) : (g < b ? g : b);
    if (mx - mn >= 30) p[i] = COLOR_SKIN[mx];
  }
}

// Any glove: the whole frame in skin tones, brightened so dark gloves get shading.
function tone(d) {
  const p = words(d);
  // Darkest and brightest 1 % of the frame, for the auto levels.
  const hist = new Uint32Array(256);
  let n = 0;
  for (let i = 0; i < p.length; i += 4) {
    const x = p[i];
    hist[(0.299 * (x & 255) + 0.587 * ((x >> 8) & 255) + 0.114 * ((x >> 16) & 255)) | 0]++;
    n++;
  }
  let lo = 0, hi = 255, acc = 0;
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc > n * 0.01) { lo = v; break; } }
  acc = 0;
  for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc > n * 0.01) { hi = v; break; } }
  hi = Math.max(hi, lo + 1);

  const lut = table((v) => {
    const l = Math.pow(Math.min(1, Math.max(0, (v - lo) / (hi - lo))), 0.55);
    return [255 * (0.12 + l * 0.95), 255 * (0.06 + l * 0.78), 255 * (0.04 + l * 0.66)];
  });
  for (let i = 0; i < p.length; i++) {
    const x = p[i];
    p[i] = lut[(0.299 * (x & 255) + 0.587 * ((x >> 8) & 255) + 0.114 * ((x >> 16) & 255)) | 0];
  }
}

// Black gloves: dark grey pixels become skin, with their shading stretched.
function dark(d) {
  const p = words(d);
  for (let i = 0; i < p.length; i++) {
    const x = p[i];
    const r = x & 255, g = (x >> 8) & 255, b = (x >> 16) & 255;
    const mx = r > g ? (r > b ? r : b) : (g > b ? g : b);
    if (mx > 70) continue;
    const mn = r < g ? (r < b ? r : b) : (g < b ? g : b);
    if (mx - mn <= 40) p[i] = DARK_SKIN[mx];
  }
}

const FILTERS = { color, tone, dark };

export class Gloves {
  constructor() {
    this.step = 0;
    this.current = null;
    this.misses = HOLD;
    this.canvas = null;
    this.ctx = null;
  }

  // Filter for the next frame, null for the plain frame.
  next() {
    if (this.misses < HOLD) return this.current;
    const name = CYCLE[this.step];
    this.step = (this.step + 1) % CYCLE.length;
    return name;
  }

  // What the model made of the frame sent with `name`.
  seen(found, name) {
    if (found) {
      this.current = name;
      this.misses = 0;
    } else if (this.misses < HOLD) {
      this.misses++;
    }
  }

  // The frame through filter `name`, as pixels the model can read.
  apply(source, width, height, name) {
    const [w, h] = fitSize(width, height);
    if (!this.canvas || this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas = new OffscreenCanvas(w, h);
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    }
    this.ctx.drawImage(source, 0, 0, w, h);
    const img = this.ctx.getImageData(0, 0, w, h);
    FILTERS[name](img.data);
    return img;
  }
}
