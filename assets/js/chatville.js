(() => {
  const button = document.querySelector('[data-effects-toggle]');
  const labels = document.getElementById('cv-effects-copy');
  if (!button || !labels) return;
  const copy = JSON.parse(labels.textContent);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let preference = null;
  try { preference = sessionStorage.getItem('chatville-effects'); } catch {}
  const render = () => {
    const enabled = !reduced.matches && preference !== 'off';
    document.documentElement.classList.toggle('cv-effects-off', !enabled);
    button.setAttribute('aria-pressed', String(enabled));
    button.querySelector('[data-effects-label]').textContent = enabled ? copy.on : copy.off;
  };
  button.hidden = false;
  button.addEventListener('click', () => {
    preference = button.getAttribute('aria-pressed') === 'true' ? 'off' : 'on';
    try { sessionStorage.setItem('chatville-effects', preference); } catch {}
    render();
  });
  reduced.addEventListener('change', render);
  render();
})();
