// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// Link app: sends the gestures to a program on this computer, for example
// Blender with the Leviate add-on. The program listens on a WebSocket at
// 127.0.0.1; nothing leaves the computer. Messages are described in
// integrations/README.md.

export const PROTOCOL = 1;
export const DEFAULT_PORT = 47800;

export class AppLink {
  constructor({ version, onChange = () => {} }) {
    this.version = version;
    this.onChange = onChange;
    this.ws = null;
    this.app = null;
    this.lastMode = 'none';
  }

  get linked() {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  connect(port = DEFAULT_PORT) {
    this.close();
    return new Promise((resolve, reject) => {
      let ws;
      try {
        ws = new WebSocket(`ws://127.0.0.1:${port}`);
      } catch (err) {
        reject(err);
        return;
      }
      this.ws = ws;
      let opened = false;
      ws.onopen = () => {
        opened = true;
        ws.send(JSON.stringify({ type: 'hello', app: 'leviate', version: this.version, protocol: PROTOCOL }));
        this.onChange(this);
        resolve();
      };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'hello') { this.app = msg; this.onChange(this); }
        } catch {}
      };
      ws.onclose = () => {
        if (this.ws === ws) { this.ws = null; this.app = null; }
        if (!opened) reject(new Error('No app is waiting on port ' + port));
        this.onChange(this);
      };
    });
  }

  close() {
    const ws = this.ws;
    this.ws = null;
    this.app = null;
    if (ws) ws.close();
  }

  // rotate: [x, y, z] radians around the view axes (x right, y up, z toward the viewer),
  // pan: [x, y] in heights of the visible view, zoom: scale factor. All describe how the
  // model moves, the app turns them into its own view or object motion.
  motion(mode, rotate, pan, zoom) {
    if (!this.linked) return;
    const still = !rotate[0] && !rotate[1] && !rotate[2] && !pan[0] && !pan[1] && zoom === 1;
    // Send the end of a gesture once, so the app can close an undo step.
    if (still && mode === this.lastMode) return;
    this.lastMode = mode;
    this.ws.send(JSON.stringify({ type: 'motion', mode, rotate, pan, zoom }));
  }
}
