const RELEASE = "game-20261122-chart111a";
const ASSETS = ["app-game-20261122-chart111a/icon-180.png", "app-game-20261122-chart111a/icon-192.png", "app-game-20261122-chart111a/icon-512.png", "app-game-20261122-chart111a/loading-city.png", "app-game-20261122-chart111a/loading-coupe-paint.png", "app-game-20261122-chart111a/loading-coupe-trim.png", "app-game-20261122-chart111a/loading-font.ttf", "app-game-20261122-chart111a/loading-luxury-paint.png", "app-game-20261122-chart111a/loading-luxury-trim.png", "app-game-20261122-chart111a/loading-road.png", "app-game-20261122-chart111a/loading-sedan-paint.png", "app-game-20261122-chart111a/loading-sedan-trim.png", "app-game-20261122-chart111a/loading-taxi.png", "app-game-20261122-chart111a/loading-wedge-paint.png", "app-game-20261122-chart111a/loading-wedge-trim.png", "app-game-20261122-chart111a/preview.png", "cinema-game-20261122-chart111a/LICENSE-lightweight-charts.txt", "cinema-game-20261122-chart111a/cinema.css", "cinema-game-20261122-chart111a/cinema.mjs", "cinema-game-20261122-chart111a/compositor.mjs", "cinema-game-20261122-chart111a/crypto-feed.mjs", "cinema-game-20261122-chart111a/cursor-default.png", "cinema-game-20261122-chart111a/cursor-default.png.import", "cinema-game-20261122-chart111a/cursor-hand-rest.png", "cinema-game-20261122-chart111a/cursor-hand-rest.png.import", "cinema-game-20261122-chart111a/cursor-hand.png", "cinema-game-20261122-chart111a/cursor-hand.png.import", "cinema-game-20261122-chart111a/drawing-geometry.mjs", "cinema-game-20261122-chart111a/drawing-history.mjs", "cinema-game-20261122-chart111a/drawing-permissions.mjs", "cinema-game-20261122-chart111a/drawings.mjs", "cinema-game-20261122-chart111a/host-requests.mjs", "cinema-game-20261122-chart111a/keyboard.mjs", "cinema-game-20261122-chart111a/lightweight-charts.js", "cinema-game-20261122-chart111a/market-peek-sources.json", "cinema-game-20261122-chart111a/market-peek/chart.mjs", "cinema-game-20261122-chart111a/market-peek/chart/indicator-band.mjs", "cinema-game-20261122-chart111a/market-peek/chart/indicator-controls.mjs", "cinema-game-20261122-chart111a/market-peek/chart/indicator-values.mjs", "cinema-game-20261122-chart111a/market-peek/chart/scale-controls.mjs", "cinema-game-20261122-chart111a/market-peek/chart/scale-math.mjs", "cinema-game-20261122-chart111a/market-peek/controls.css", "cinema-game-20261122-chart111a/market-peek/core.mjs", "cinema-game-20261122-chart111a/market-peek/i18n.mjs", "cinema-game-20261122-chart111a/market-peek/indicator-appearance.mjs", "cinema-game-20261122-chart111a/market-peek/indicators.mjs", "cinema-game-20261122-chart111a/market-peek/locales/en.mjs", "cinema-game-20261122-chart111a/market-peek/markets/exchanges.mjs", "cinema-game-20261122-chart111a/market-peek/markets/streams.mjs", "cinema-game-20261122-chart111a/market-peek/trading/chart-lines.mjs", "cinema-game-20261122-chart111a/market-peek/trading/line-labels.mjs", "cinema-game-20261122-chart111a/market-peek/trading/model.mjs", "cinema-game-20261122-chart111a/market-peek/trading/order-side.mjs", "cinema-game-20261122-chart111a/market-peek/trading/position-return.mjs", "cinema-game-20261122-chart111a/market-peek/trading/position-size.mjs", "cinema-game-20261122-chart111a/market-peek/trading/symbols.mjs", "cinema-game-20261122-chart111a/market-peek/trading/unit-control.mjs", "cinema-game-20261122-chart111a/market-peek/window/geometry.mjs", "cinema-game-20261122-chart111a/pens.mjs", "cinema-game-20261122-chart111a/tool-menu.mjs", "cinema-game-20261122-chart111a/view-state.mjs", "cinema-game-20261122-chart111a/youtube-state.mjs", "cinema-game-20261122-chart111a/youtube.mjs", "config.js", "game-20261122-chart111a.audio.position.worklet.js", "game-20261122-chart111a.audio.worklet.js", "game-20261122-chart111a.js", "game-20261122-chart111a.pck", "game-20261122-chart111a.png", "game-20261122-chart111a.wasm", "index.html", "manifest.webmanifest", "title-night.gif"];
/* Generated release manifest is prepended by package_pages.py. */
const CACHE_PREFIX = 'btc-office-app-';
const CACHE_NAME = CACHE_PREFIX + RELEASE;
const base = new URL('./', self.location.href);
const shell = new URL('index.html', base).href;
const allowed = new Set(ASSETS.map(path => new URL(path, base).href));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Limit concurrent copies of large runtime files on mobile.
    const queue = [...ASSETS];
    await Promise.all(Array.from({length:4}, async () => {
      while (queue.length) {
        const url = new URL(queue.shift(), base).href;
        const response = await fetch(url, {cache:/\/(index\.html|config\.js|manifest\.webmanifest)$/.test(url) ? 'reload' : 'force-cache'});
        if (!response.ok || response.type === 'opaque') throw Error('Incomplete app download');
        await cache.put(url, response);
      }
    }));
    // Let existing games finish with their current engine before an update activates.
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== base.origin) return;
  // The worker only handles packaged game assets, never accounts, quotes or other pages.
  const navigation = request.mode === 'navigate' && (url.pathname === base.pathname || url.pathname === new URL(shell).pathname);
  if (!navigation && (!allowed.has(url.href) || request.headers.has('range'))) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    if (navigation) {
      try {
        const response = await fetch(request);
        if (response.ok) return response;
      } catch {}
      return await cache.match(shell) || Response.error();
    }
    const saved = await cache.match(url.href);
    if (saved) return saved;
    const response = await fetch(request);
    if (response.ok && response.type !== 'opaque') await cache.put(url.href, response.clone());
    return response;
  })());
});
