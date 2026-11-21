(() => {
  // Plays are counted by the Duki notifier: each IP once, forever.
  let url, recordUrl;
  try {
    url = new URL('/v1/public/plays?program=btcoffice', document.currentScript.dataset.api);
    recordUrl = new URL('/v1/plays', document.currentScript.dataset.api);
    if (url.protocol !== 'https:') return;
  } catch { return; }
  const numbers = [...document.querySelectorAll('[data-program-stats="btcoffice"] [data-program-stat="plays"]')];
  const format = new Intl.NumberFormat(document.documentElement.lang || 'ko');
  const render = data => {
    if (!data?.ok || !Number.isSafeInteger(data.plays) || data.plays < 0) return;
    for (const number of numbers) number.textContent = format.format(data.plays);
  };
  let pendingRead = false, entrySent = false;
  async function read() {
    if (pendingRead || !numbers.length) return;
    pendingRead = true;
    try {
      const response = await fetch(url.href, { credentials:'omit', mode:'cors', signal:AbortSignal.timeout(8000) });
      if (response.ok) render(await response.json());
    } catch { /* Unavailable counts stay blank. Never invent a zero. */ }
    finally { pendingRead = false; }
  }
  document.addEventListener('click', event => {
    const entry = event.target?.closest?.('a[data-lounge-entry]');
    if (!entry || event.defaultPrevented || event.button !== 0 || entrySent) return;
    // Navigation stays immediate. The server also deduplicates direct game entry.
    entrySent = true;
    fetch(recordUrl.href, { method:'POST', credentials:'omit', mode:'cors', keepalive:true,
      headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ program:'btcoffice' })
    }).then(async response => { if (!response.ok) throw Error(); render(await response.json()); })
      .catch(() => { entrySent = false; });
  });
  window.addEventListener('pageshow', event => { if (event.persisted) read(); });
  window.addEventListener('online', read);
  read();
})();
