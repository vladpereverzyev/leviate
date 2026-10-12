// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// GitHub Pages serves /leviate/download, /leviate/download.html and /leviate//download alike,
// and cannot redirect: the address bar is cleaned here instead (no reload), so it always reads
// /leviate/download. On the page not found an address that only differs from a page of the
// site (a slash at the end, capitals, index.html) goes to that page.

const PAGES = { '/leviate': '/leviate/', '/leviate/index': '/leviate/', '/leviate/download': '/leviate/download', '/leviate/privacy': '/leviate/privacy' };

const path = location.pathname.replace(/\/{2,}/g, '/');
const key = path.replace(/\.html$/i, '').replace(/\/+$/, '').toLowerCase();
const target = PAGES[key];

if (document.documentElement.dataset.page === '404') {
  if (target) location.replace(target + location.search + location.hash);
} else if (target && target !== location.pathname) {
  history.replaceState(history.state, '', target + location.search + location.hash);
}
