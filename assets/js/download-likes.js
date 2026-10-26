(() => {
  const root = document.querySelector('[data-likes-api]');
  if (!root) return;
  const button = root.querySelector('.like-button');
  const platformOrder = /Mac|iPhone|iPad/.test(navigator.platform) ? ['macos', 'windows'] : ['windows', 'macos'];
  const status = root.querySelector('[data-likes-status]');
  const api = `${root.dataset.likesApi.replace(/\/$/, '')}/v1/market-peek`;
  const number = new Intl.NumberFormat(document.documentElement.lang);
  let current = null, pending = false, queue = Promise.resolve();
  const render = () => {
    const states = current ? Object.values(current.platforms) : [];
    const ownLikes = states.filter(item => item.liked).length;
    button.disabled = pending || !current || ownLikes >= 2;
    button.dataset.supported = String(ownLikes > 0);
    button.setAttribute('aria-label', ownLikes >= 2 ? root.dataset.likesDone : root.dataset.likesLabel);
    if (current) {
      root.querySelector('[data-likes-count]').textContent = number.format(states.reduce((sum, item) => sum + item.count, 0));
    }
  };
  const valid = data => ['windows', 'macos'].every(platform => {
    const item = data?.platforms?.[platform];
    return item && Number.isSafeInteger(item.count) && item.count >= 0 && Number.isSafeInteger(item.downloads) && item.downloads >= 0
      && typeof item.liked === 'boolean' && typeof item.downloaded === 'boolean';
  });
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
    if (pending || !current) return;
    const platform = platformOrder.find(id => !current.platforms[id].liked);
    if (platform) request(`/${platform}/likes`, 'POST');
  });
  document.addEventListener('click', event => {
    const link = event.target.closest('#download-link, #archive-link, #mac-download-link');
    if (!link || link.getAttribute('aria-disabled') === 'true' || !link.href) return;
    const url = new URL(link.href);
    if (url.origin !== 'https://github.com' || !url.pathname.startsWith('/Duki-Programming/Market-Peek-releases/releases/download/')) return;
    request(`/${link.id === 'mac-download-link' ? 'macos' : 'windows'}/download`, 'POST');
  });
  window.addEventListener('online', () => request('/stats'));
  request('/stats');
})();
