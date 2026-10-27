(() => {
  const root = document.querySelector('[data-likes-api]');
  if (!root) return;
  const button = root.querySelector('.like-button');
  const status = root.querySelector('[data-likes-status]');
  const product = root.dataset.likesProduct || 'market-peek';
  const repository = root.dataset.releaseRepository || 'Duki-Programming/Market-Peek-releases';
  const api = `${root.dataset.likesApi.replace(/\/$/, '')}/v1/${encodeURIComponent(product)}`;
  const number = new Intl.NumberFormat(document.documentElement.lang);
  let current = null, pending = false, queue = Promise.resolve();
  const render = () => {
    const liked = current?.liked === true;
    button.disabled = pending || !current || liked;
    button.dataset.supported = String(liked);
    button.setAttribute('aria-label', liked ? root.dataset.likesDone : root.dataset.likesLabel);
    if (current) {
      root.querySelector('[data-likes-count]').textContent = number.format(current.count);
    }
  };
  const valid = data => Number.isSafeInteger(data?.count) && data.count >= 0 && typeof data.liked === 'boolean';
  const request = (path, method = 'GET') => {
    queue = queue.then(async () => {
      pending = true; render();
      try {
        const response = await fetch(`${api}${path}`, {
          method, mode: 'cors', credentials: 'omit', cache: 'no-store',
          ...(method === 'POST' ? { headers: { 'Content-Type': 'application/json' }, body: '{}', keepalive: true } : {}),
          signal: AbortSignal.timeout(10000),
        });
        const data = await response.json();
        if (!response.ok || !valid(data)) throw new Error('Invalid state');
        current = data;
        status.textContent = method === 'POST' ? root.dataset.likesThanks : '';
      } catch { status.textContent = root.dataset.likesError; }
      finally { pending = false; render(); }
    });
    return queue;
  };
  button.addEventListener('click', () => {
    if (pending || !current || current.liked) return;
    request('/likes', 'POST');
  });
  document.addEventListener('click', event => {
    const link = event.target.closest('#download-link, #archive-link, #mac-download-link');
    if (!link || link.getAttribute('aria-disabled') === 'true' || !link.href) return;
    const url = new URL(link.href);
    if (url.origin !== 'https://github.com' || !url.pathname.startsWith(`/${repository}/releases/download/`)) return;
    request(`/${link.id === 'mac-download-link' ? 'macos' : 'windows'}/download`, 'POST');
  });
  window.addEventListener('online', () => request('/stats'));
  request('/stats');
})();
