// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// Writes the version in the footer of the pages without the web app (download, privacy,
// 404). The web app does it in app.js.

import { VERSION } from './version.js';

const el = document.getElementById('version');
if (el) el.textContent = 'v' + VERSION;
