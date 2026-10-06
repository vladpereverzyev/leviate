// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ring', {
  onState: (callback) => ipcRenderer.on('ring:state', (e, state) => callback(state)),
  onFlash: (callback) => ipcRenderer.on('ring:flash', (e, mode) => callback(mode)),
});
