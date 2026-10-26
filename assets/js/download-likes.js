(() => {
  const root = document.querySelector('[data-likes-api]');
  if (!root) return;
  const rows = [...root.querySelectorAll('[data-support-platform]')];
  const status = root.querySelector('[data-likes-status]');
  const api = `${root.dataset.likesApi.replace(/\/$/, '')}/v1/market-peek`;
  const number = new Intl.NumberFormat(document.documentElement.lang);
  let current = null, pending = false, queue = Promise.resolve();
  const render = () => {
    for (const row of rows) {
      const platform = row.dataset.supportPlatform;
      const data = current?.platforms[platform], button = row.querySelector('.like-button');
      button.disabled = pending || !data || data.liked;
      button.setAttribute('aria-pressed', String(Boolean(data?.liked)));
      button.setAttribute('aria-label', `${platform === 'windows' ? 'Windows' : 'macOS'} · ${data?.liked ? root.dataset.likesDone : root.dataset.likesLabel}`);
      if (data) {
        row.querySelector('[data-likes-count]').textContent = number.format(data.count);
        row.querySelector('[data-downloads-count]').textContent = number.format(data.downloads);
      }
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
  for (const row of rows) row.querySelector('.like-button').addEventListener('click', () => {
    const platform = row.dataset.supportPlatform;
    if (!pending && current && !current.platforms[platform].liked) request(`/${platform}/likes`, 'POST');
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
