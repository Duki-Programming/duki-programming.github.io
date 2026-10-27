(() => {
  'use strict';
  const script = document.currentScript;
  const endpoint = script?.dataset.api;
  if (!endpoint) return;
  let api;
  try {
    api = new URL('/v1/events', endpoint);
    if (api.protocol !== 'https:') return;
  } catch { return; }

  const path = location.pathname;
  if (['/', '/en/', '/index.html', '/en/index.html'].includes(path)) return;
  // A product's front matter is authoritative; flat product URLs also work without it.
  const candidate = script.dataset.program || path.split('/').filter(Boolean)[0] || '';
  const program = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(candidate) && candidate.length <= 64 ? candidate : 'site';
  const send = (kind, platform) => {
    // Only path and product metadata are sent; no query strings or visitor identifiers.
    const body = JSON.stringify({ id: crypto.randomUUID(), kind, program, page: path, platform });
    fetch(api.href, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
      keepalive: true, credentials: 'omit', referrerPolicy: 'no-referrer' }).catch(() => {});
  };
  // Count once per path in a tab session. English and Korean are separate page views.
  const key = `duki-view:${path}`;
  try {
    if (!sessionStorage.getItem(key)) {
      send('pageview', 'web');
      sessionStorage.setItem(key, '1');
    }
  } catch { send('pageview', 'web'); }

  const lastClick = new Map();
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (!link || link.getAttribute('aria-disabled') === 'true' || event.defaultPrevented || program === 'site') return;
    let url;
    try { url = new URL(link.href); } catch { return; }
    // Count file download clicks only, never release notes, section anchors or cards.
    if (url.protocol !== 'https:' || url.hostname !== 'github.com' ||
      !/^\/(DukiChoi|Duki-Programming)\/[^/]+\/releases\/download\//i.test(url.pathname)) return;
    const extension = url.pathname.match(/\.(exe|dmg|7z|zip)$/i)?.[1]?.toLowerCase();
    if (!extension) return;
    const now = Date.now();
    if (now - (lastClick.get(url.href) || 0) < 2000) return;
    lastClick.set(url.href, now);
    send('download', extension === 'exe' ? 'windows' : extension === 'dmg' ? 'macos' : 'archive');
  });
})();
