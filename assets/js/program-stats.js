(() => {
  const endpoint = document.currentScript?.dataset.api;
  const template = document.querySelector('template[data-product-stats-template]');
  if (endpoint && template && !document.querySelector('.product-stats')) {
    const target = document.querySelector('.hero-copy .product-brand');
    target?.after(template.content.cloneNode(true));
  }
  const roots = [...document.querySelectorAll('[data-program-stats]')];
  if (!endpoint || !roots.length) return;
  let url;
  try { url = new URL('/v1/public/stats', endpoint); if (url.protocol !== 'https:') return; } catch { return; }
  const format = new Intl.NumberFormat(document.documentElement.lang || 'ko');
  let pending = null, refreshAfter = false, timer;
  const render = data => {
    if (!Array.isArray(data?.programs)) throw Error('Invalid statistics');
    const programs = new Map(data.programs.filter(row => typeof row?.program === 'string' &&
      ['visitors','downloads'].every(key => Number.isSafeInteger(row[key]) && row[key] >= 0)).map(row => [row.program, row]));
    for (const root of roots) {
      const row = programs.get(root.dataset.programStats);
      if (!row) continue;
      for (const number of root.querySelectorAll('[data-program-stat]')) {
        const value = row[number.dataset.programStat];
        if (Number.isSafeInteger(value) && value >= 0) number.textContent = format.format(value);
      }
    }
  };
  const update = (fresh = false) => {
    if (pending) { refreshAfter ||= fresh; return pending; }
    pending = (async () => {
      try {
        const response = await fetch(url.href, { mode:'cors', credentials:'omit', cache:fresh ? 'reload' : 'default', signal:AbortSignal.timeout(8000) });
        if (!response.ok) throw Error('Statistics unavailable');
        render(await response.json());
      } catch { /* Keep unavailable numbers blank instead of inventing a zero. */ }
      finally {
        pending = null;
        if (refreshAfter) { refreshAfter = false; schedule(true); }
      }
    })();
    return pending;
  };
  const schedule = fresh => { clearTimeout(timer); timer = setTimeout(() => update(fresh), 180); };
  window.addEventListener('program-stats-updated', () => schedule(true));
  window.addEventListener('online', () => schedule(true));
  schedule(false);
})();
