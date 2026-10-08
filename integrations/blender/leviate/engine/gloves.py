# SPDX-License-Identifier: GPL-3.0-or-later
# Leviate for Blender. Copyright (C) 2026 Vladyslav Pereverzyev

"""Hand tracking with medical gloves.

The hand model was trained on bare skin, so it often misses blue, purple or black
gloves. While no hand is in view, every other frame goes to the model through a
filter that paints the gloves in a skin tone. The filter that finds the hand stays
on until the hand is gone. Bare hands never see a filter once they are found.
Same steps as shared/js/gloves.js in the app.
"""

# Plain frames take turns with the filters, so bare hands are still found right away.
CYCLE = (None, "color", None, "tone", None, "dark")
# Frames without a hand before the search starts again.
HOLD = 10
# Frames go to the model at most this big, filtered or not: it looks at 224 pixels
# anyway and a smaller frame saves it more time than the filter costs.
MAX_SIDE = 640

SKIN = (1.0, 0.78, 0.64)


def _table(np, values):
    """Lookup table for cv2.LUT: brightness to skin pixel, from 256 brightness values."""
    v = np.asarray(values, dtype=np.float32)[:, None] * np.asarray(SKIN, dtype=np.float32)
    return np.clip(np.rint(v), 0, 255).astype(np.uint8).reshape(256, 1, 3)


_tables = {}


def _skin_of(cv2, np, name, values, gray):
    """`gray` (one channel) turned into skin pixels through the table `name`."""
    if name not in _tables:
        _tables[name] = _table(np, values)
    return cv2.LUT(cv2.merge((gray, gray, gray)), _tables[name])


def _color(cv2, np, rgb):
    """Colored pixels that are not reddish take a skin hue and keep their brightness."""
    r, g, b = cv2.split(rgb)
    mx = cv2.max(cv2.max(r, g), b)
    colored = cv2.compare(cv2.subtract(mx, cv2.min(cv2.min(r, g), b)), 30, cv2.CMP_GE)
    reddish = cv2.bitwise_and(cv2.compare(r, g, cv2.CMP_GE), cv2.compare(r, b, cv2.CMP_GE))
    mask = cv2.bitwise_and(colored, cv2.bitwise_not(reddish))
    skin = _skin_of(cv2, np, "color", 255 * (0.15 + 0.85 * np.arange(256) / 255), mx)
    out = rgb.copy()
    cv2.copyTo(skin, mask, out)
    return out


def _tone(cv2, np, rgb):
    """The whole frame in skin tones, brightened so dark gloves get shading."""
    lum = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    lo, hi = np.percentile(lum[::4, ::4], (1, 99))
    hi = max(hi, lo + 1)
    l = np.clip((np.arange(256) - lo) / (hi - lo), 0, 1) ** 0.55
    lut = np.stack([
        255 * np.minimum(1, 0.12 + l * 0.95),
        255 * (0.06 + l * 0.78),
        255 * (0.04 + l * 0.66),
    ], axis=-1)
    lut = np.clip(np.rint(lut), 0, 255).astype(np.uint8).reshape(256, 1, 3)
    return cv2.LUT(cv2.merge((lum, lum, lum)), lut)


def _dark(cv2, np, rgb):
    """Dark grey pixels become skin, with their shading stretched."""
    r, g, b = cv2.split(rgb)
    mx = cv2.max(cv2.max(r, g), b)
    grey = cv2.compare(cv2.subtract(mx, cv2.min(cv2.min(r, g), b)), 40, cv2.CMP_LE)
    mask = cv2.bitwise_and(cv2.compare(mx, 70, cv2.CMP_LE), grey)
    skin = _skin_of(cv2, np, "dark", 255 * (0.35 + 0.6 * np.minimum(np.arange(256), 70) / 70), mx)
    out = rgb.copy()
    cv2.copyTo(skin, mask, out)
    return out


FILTERS = {"color": _color, "tone": _tone, "dark": _dark}


class Gloves:
    def __init__(self):
        self.step = 0
        self.current = None
        self.misses = HOLD

    def next(self):
        """Filter for the next frame, None for the plain frame."""
        if self.misses < HOLD:
            return self.current
        name = CYCLE[self.step]
        self.step = (self.step + 1) % len(CYCLE)
        return name

    def seen(self, found, name):
        """What the model made of the frame sent with `name`."""
        if found:
            self.current = name
            self.misses = 0
        elif self.misses < HOLD:
            self.misses += 1

    @staticmethod
    def prepare(cv2, np, rgb, name):
        """The RGB frame for the model: at most MAX_SIDE big, through filter `name`
        unless it is None. Always a contiguous uint8 array."""
        h, w = rgb.shape[:2]
        scale = min(1.0, MAX_SIDE / max(w, h, 1))
        if scale < 1:
            rgb = cv2.resize(rgb, (max(1, round(w * scale)), max(1, round(h * scale))),
                             interpolation=cv2.INTER_AREA)
        if name is not None:
            rgb = FILTERS[name](cv2, np, rgb)
        return np.ascontiguousarray(rgb)
