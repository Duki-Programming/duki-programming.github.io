(() => {
  const root = document.documentElement;
  const key = 'duki-site-theme';
  const valid = value => value === 'light' || value === 'dark';
  const controls = [...document.querySelectorAll('.site-theme-toggle')];

  function apply(theme) {
    root.dataset.theme = valid(theme) ? theme : root.dataset.defaultTheme;
    controls.forEach(button => {
      const dark = root.dataset.theme === 'dark';
      button.setAttribute('aria-checked', String(dark));
      button.title = dark ? button.dataset.lightTitle : button.dataset.darkTitle;
      button.hidden = false;
    });
  }
  function restore() {
    try { apply(localStorage.getItem(key)); }
    catch (_) { apply(root.dataset.theme); }
  }
  controls.forEach(button => button.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    apply(next);
    try { localStorage.setItem(key, next); } catch (_) { /* In-memory choice. */ }
  }));
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) restore();
  });
  window.addEventListener('pageshow', restore);
  apply(root.dataset.theme);
})();
