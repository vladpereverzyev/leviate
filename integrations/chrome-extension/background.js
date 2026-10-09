// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// The toolbar button opens the Leviate side panel, where the camera, the hand tracking
// and the two modules run. Alt+Shift+M turns the hand on or off from any page.

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-hand') chrome.runtime.sendMessage({ type: 'toggle' }).catch(() => {});
});
