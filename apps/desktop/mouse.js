// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// Mouse and modifier keys of the computer, through the system libraries (koffi, no
// compiler needed). Coordinates are in the units of the system: physical pixels on
// Windows and Linux (X11), points on macOS.
//
//   move(x, y, held)     held: the button being dragged, or null
//   down(button) / up(button)      'left', 'middle' or 'right'
//   wheel(steps)         positive scrolls up (away from the user); Windows also takes
//                        parts of a step, the others whole steps
//   key(name, pressed)   'shift', 'ctrl' or 'alt'

const koffi = require('koffi');

function windows() {
  const user32 = koffi.load('user32.dll');
  const SetCursorPos = user32.func('bool __stdcall SetCursorPos(int x, int y)');
  const mouseEvent = user32.func(
    'void __stdcall mouse_event(uint32 flags, uint32 dx, uint32 dy, uint32 data, uintptr extra)');
  const keyEvent = user32.func('void __stdcall keybd_event(uint8 vk, uint8 scan, uint32 flags, uintptr extra)');
  const BUTTONS = { left: [0x0002, 0x0004], right: [0x0008, 0x0010], middle: [0x0020, 0x0040] };
  const KEYS = { shift: 0x10, ctrl: 0x11, alt: 0x12 };
  return {
    move(x, y) { SetCursorPos(Math.round(x), Math.round(y)); },
    down(button) { mouseEvent(BUTTONS[button][0], 0, 0, 0, 0); },
    up(button) { mouseEvent(BUTTONS[button][1], 0, 0, 0, 0); },
    wheel(steps) { mouseEvent(0x0800, 0, 0, Math.round(steps * 120) >>> 0, 0); },
    key(name, pressed) { keyEvent(KEYS[name], 0, pressed ? 0 : 0x0002, 0); },
  };
}

function macos() {
  const cg = koffi.load('/System/Library/Frameworks/ApplicationServices.framework/ApplicationServices');
  const cf = koffi.load('/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation');
  const CGPoint = koffi.struct('CGPoint', { x: 'double', y: 'double' });
  const create = cg.func('void *CGEventCreate(void *source)');
  const location = cg.func('CGPoint CGEventGetLocation(void *event)');
  const mouseEvent = cg.func('void *CGEventCreateMouseEvent(void *source, uint32 type, CGPoint pos, uint32 button)');
  // wheelCount and wheel1 are named parameters, so the fixed signature is the right call.
  const scrollEvent = cg.func('void *CGEventCreateScrollWheelEvent(void *source, uint32 units, uint32 count, int32 wheel1)');
  const setFlags = cg.func('void CGEventSetFlags(void *event, uint64 flags)');
  const post = cg.func('void CGEventPost(uint32 tap, void *event)');
  const release = cf.func('void CFRelease(void *ref)');
  // [down, up, dragged, button number]
  const BUTTONS = { left: [1, 2, 6, 0], right: [3, 4, 7, 1], middle: [25, 26, 27, 2] };
  const FLAGS = { shift: 0x20000, ctrl: 0x40000, alt: 0x80000 };
  let flags = 0;

  const send = (event) => {
    setFlags(event, flags);
    post(0, event);   // kCGHIDEventTap
    release(event);
  };
  const here = () => {
    const event = create(null);
    const pos = location(event);
    release(event);
    return pos;
  };
  return {
    move(x, y, held) {
      const [, , dragged, number] = held ? BUTTONS[held] : [0, 0, 5, 0];   // 5: mouse moved
      send(mouseEvent(null, dragged, { x, y }, number));
    },
    down(button) { send(mouseEvent(null, BUTTONS[button][0], here(), BUTTONS[button][3])); },
    up(button) { send(mouseEvent(null, BUTTONS[button][1], here(), BUTTONS[button][3])); },
    wheel(steps) { send(scrollEvent(null, 1, 1, steps)); },   // 1: lines
    key(name, pressed) { flags = pressed ? flags | FLAGS[name] : flags & ~FLAGS[name]; },
  };
}

function linux() {
  if (process.env.XDG_SESSION_TYPE === 'wayland') {
    throw new Error('Wayland does not let programs move the mouse. Log in with the "Xorg" (X11) session to use it.');
  }
  const x11 = koffi.load('libX11.so.6');
  const xtst = koffi.load('libXtst.so.6');
  const open = x11.func('void *XOpenDisplay(const char *name)');
  const flush = x11.func('int XFlush(void *display)');
  const keycode = x11.func('uint8 XKeysymToKeycode(void *display, unsigned long keysym)');
  const motion = xtst.func('int XTestFakeMotionEvent(void *display, int screen, int x, int y, unsigned long delay)');
  const button = xtst.func('int XTestFakeButtonEvent(void *display, unsigned int button, int press, unsigned long delay)');
  const keyEvent = xtst.func('int XTestFakeKeyEvent(void *display, unsigned int keycode, int press, unsigned long delay)');
  const display = open(null);
  if (!display) throw new Error('Could not open the X11 display');
  const BUTTONS = { left: 1, middle: 2, right: 3 };
  const KEYS = { shift: 0xffe1, ctrl: 0xffe3, alt: 0xffe9 };
  const press = (b, pressed) => { button(display, b, pressed ? 1 : 0, 0); flush(display); };
  return {
    move(x, y) { motion(display, -1, Math.round(x), Math.round(y), 0); flush(display); },
    down(b) { press(BUTTONS[b], true); },
    up(b) { press(BUTTONS[b], false); },
    wheel(steps) {
      const b = steps > 0 ? 4 : 5;
      for (let i = 0; i < Math.abs(steps); i++) { press(b, true); press(b, false); }
    },
    key(name, pressed) { keyEvent(display, keycode(display, KEYS[name]), pressed ? 1 : 0, 0); flush(display); },
  };
}

let native = null;
let failure = '';

// The mouse of this system, or null with the reason in error().
exports.load = () => {
  if (native || failure) return native;
  try {
    native = { win32: windows, darwin: macos, linux }[process.platform]?.() || null;
    if (!native) failure = `Moving the mouse is not supported on ${process.platform}`;
  } catch (err) {
    failure = err.message;
  }
  return native;
};

exports.error = () => failure;
