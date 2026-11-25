const RELEASE = "game-20261125-chart115e";
const ASSETS = ["app-game-20261125-chart115e/icon-180.png", "app-game-20261125-chart115e/icon-192.png", "app-game-20261125-chart115e/icon-512.png", "app-game-20261125-chart115e/loading-city.png", "app-game-20261125-chart115e/loading-coupe-paint.png", "app-game-20261125-chart115e/loading-coupe-trim.png", "app-game-20261125-chart115e/loading-font.ttf", "app-game-20261125-chart115e/loading-luxury-paint.png", "app-game-20261125-chart115e/loading-luxury-trim.png", "app-game-20261125-chart115e/loading-road.png", "app-game-20261125-chart115e/loading-sedan-paint.png", "app-game-20261125-chart115e/loading-sedan-trim.png", "app-game-20261125-chart115e/loading-taxi.png", "app-game-20261125-chart115e/loading-wedge-paint.png", "app-game-20261125-chart115e/loading-wedge-trim.png", "app-game-20261125-chart115e/preview.png", "cinema-game-20261125-chart115e/LICENSE-lightweight-charts.txt", "cinema-game-20261125-chart115e/cinema.css", "cinema-game-20261125-chart115e/cinema.mjs", "cinema-game-20261125-chart115e/compositor.mjs", "cinema-game-20261125-chart115e/crypto-feed.mjs", "cinema-game-20261125-chart115e/cursor-default.png", "cinema-game-20261125-chart115e/cursor-default.png.import", "cinema-game-20261125-chart115e/cursor-hand-rest.png", "cinema-game-20261125-chart115e/cursor-hand-rest.png.import", "cinema-game-20261125-chart115e/cursor-hand.png", "cinema-game-20261125-chart115e/cursor-hand.png.import", "cinema-game-20261125-chart115e/drawing-geometry.mjs", "cinema-game-20261125-chart115e/drawing-history.mjs", "cinema-game-20261125-chart115e/drawing-permissions.mjs", "cinema-game-20261125-chart115e/drawings.mjs", "cinema-game-20261125-chart115e/host-requests.mjs", "cinema-game-20261125-chart115e/keyboard.mjs", "cinema-game-20261125-chart115e/lightweight-charts.js", "cinema-game-20261125-chart115e/market-peek-sources.json", "cinema-game-20261125-chart115e/market-peek/chart.mjs", "cinema-game-20261125-chart115e/market-peek/chart/indicator-band.mjs", "cinema-game-20261125-chart115e/market-peek/chart/indicator-controls.mjs", "cinema-game-20261125-chart115e/market-peek/chart/indicator-values.mjs", "cinema-game-20261125-chart115e/market-peek/chart/scale-controls.mjs", "cinema-game-20261125-chart115e/market-peek/chart/scale-math.mjs", "cinema-game-20261125-chart115e/market-peek/controls.css", "cinema-game-20261125-chart115e/market-peek/core.mjs", "cinema-game-20261125-chart115e/market-peek/i18n.mjs", "cinema-game-20261125-chart115e/market-peek/indicator-appearance.mjs", "cinema-game-20261125-chart115e/market-peek/indicators.mjs", "cinema-game-20261125-chart115e/market-peek/locales/en.mjs", "cinema-game-20261125-chart115e/market-peek/markets/exchanges.mjs", "cinema-game-20261125-chart115e/market-peek/markets/streams.mjs", "cinema-game-20261125-chart115e/market-peek/trading/chart-lines.mjs", "cinema-game-20261125-chart115e/market-peek/trading/line-labels.mjs", "cinema-game-20261125-chart115e/market-peek/trading/model.mjs", "cinema-game-20261125-chart115e/market-peek/trading/order-side.mjs", "cinema-game-20261125-chart115e/market-peek/trading/position-return.mjs", "cinema-game-20261125-chart115e/market-peek/trading/position-size.mjs", "cinema-game-20261125-chart115e/market-peek/trading/symbols.mjs", "cinema-game-20261125-chart115e/market-peek/trading/unit-control.mjs", "cinema-game-20261125-chart115e/market-peek/window/geometry.mjs", "cinema-game-20261125-chart115e/pens.mjs", "cinema-game-20261125-chart115e/tool-menu.mjs", "cinema-game-20261125-chart115e/view-state.mjs", "cinema-game-20261125-chart115e/youtube-state.mjs", "cinema-game-20261125-chart115e/youtube.mjs", "config.js", "game-20261125-chart115e.audio.position.worklet.js", "game-20261125-chart115e.audio.worklet.js", "game-20261125-chart115e.js", "game-20261125-chart115e.pck", "game-20261125-chart115e.png", "game-20261125-chart115e.wasm", "index.html", "manifest.webmanifest", "title-night.gif"];
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
