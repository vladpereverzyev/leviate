// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// What the window may ask of the app: nothing else of Electron or Node.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('leviateDesktop', {
  platform: process.platform,
  hotkey: process.platform === 'darwin' ? 'Ctrl+Option+M' : 'Ctrl+Alt+M',
  store: ipcRenderer.sendSync('app:store'),
  enable: () => ipcRenderer.send('mouse:enable'),
  move: (u, v, allScreens) => ipcRenderer.send('mouse:move', u, v, allScreens),
  click: (button) => ipcRenderer.send('mouse:click', button),
  dragStart: (button, keys) => ipcRenderer.send('drag:start', button, keys),
  dragMove: (dx, dy) => ipcRenderer.send('drag:move', dx, dy),
  dragEnd: () => ipcRenderer.send('drag:end'),
  wheel: (steps) => ipcRenderer.send('wheel', steps),
  ring: (mode, progress) => ipcRenderer.send('mouse:ring', mode, progress),
  flash: (mode) => ipcRenderer.send('mouse:flash', mode),
  phoneNotice: () => ipcRenderer.invoke('phone:notice'),
  checkUpdate: () => ipcRenderer.invoke('update:check'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  onUpdateProgress: (callback) => ipcRenderer.on('update:progress', (e, part) => callback(part)),
  onToggle: (callback) => ipcRenderer.on('mode:toggle', () => callback()),
  onError: (callback) => ipcRenderer.on('mouse:error', (e, text) => callback(text)),
});
