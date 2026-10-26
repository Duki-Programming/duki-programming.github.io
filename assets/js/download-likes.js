(() => {
  const root = document.querySelector('[data-likes-api]');
  if (!root) return;
  const button = root.querySelector('.like-button'), count = root.querySelector('[data-likes-count]'), status = root.querySelector('[data-likes-status]');
  const api = `${root.dataset.likesApi.replace(/\/$/, '')}/v1/market-peek`;
  let current = null, pending = false, failed = false;
  // Serialize initial status, download markers, and votes so stale responses cannot overwrite newer state.
  let queue = Promise.resolve();
  const render = () => {
    button.disabled = pending || !current?.downloaded || current.liked;
    button.setAttribute('aria-pressed', String(Boolean(current?.liked)));
    button.setAttribute('aria-label', current?.liked ? root.dataset.likesDone : root.dataset.likesLabel);
    if (current) count.textContent = new Intl.NumberFormat(document.documentElement.lang).format(current.count);
    status.textContent = failed ? root.dataset.likesError : current?.liked ? root.dataset.likesThanks : current?.downloaded ? root.dataset.likesReady : root.dataset.likesWaiting;
  };
  const request = (path, method = 'GET') => {
    queue = queue.then(async () => {
      pending = true; failed = false; render();
      try {
        const response = await fetch(`${api}${path}`, {
          method, mode: 'cors', credentials: 'omit', cache: 'no-store',
          ...(method === 'POST' ? { headers: { 'Content-Type': 'application/json' }, body: '{}', keepalive: true } : {}),
          signal: AbortSignal.timeout(10000),
        });
        const data = await response.json();
        if (!Number.isSafeInteger(data.count) || data.count < 0 || typeof data.liked !== 'boolean' || typeof data.downloaded !== 'boolean') throw new Error('Invalid state');
        current = data;
        if (!response.ok) throw new Error('Request failed');
      } catch { failed = true; }
      finally { pending = false; render(); }
    });
    return queue;
  };
  button.addEventListener('click', () => { if (!pending && current?.downloaded && !current.liked) request('/likes', 'POST'); });
  document.addEventListener('click', event => {
    const link = event.target.closest('#download-link, #archive-link, #mac-download-link');
    if (!link || link.getAttribute('aria-disabled') === 'true' || !link.href) return;
    const url = new URL(link.href);
    if (url.origin !== 'https://github.com' || !url.pathname.startsWith('/Duki-Programming/Market-Peek-releases/releases/download/')) return;
    request('/download', 'POST');
  });
  window.addEventListener('online', () => request('/likes'));
  request('/likes');
})();
