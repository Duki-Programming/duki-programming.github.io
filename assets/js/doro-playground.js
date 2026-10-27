(() => {
  const preview = document.querySelector('.doro-preview');
  if (!preview) return;
  const image = preview.querySelector('[data-doro-animation]');
  const maps = [...preview.querySelectorAll('[data-doro-theme]')];
  const motion = preview.querySelector('[data-doro-motion]');
  const panel = preview.querySelector('[role="tabpanel"]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches;
  let theme = 'grass';
  const render = () => {
    image.src = `${image.dataset.assetBase}doro-${theme}.${paused ? 'png' : 'gif'}`;
    preview.dataset.doroMap = theme;
    motion.setAttribute('aria-pressed', String(paused));
    motion.setAttribute('aria-label', paused ? motion.dataset.play : motion.dataset.pause);
    motion.querySelector('span').textContent = paused ? '▶' : 'Ⅱ';
    for (const button of maps) {
      const selected = button.dataset.doroTheme === theme;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      if (selected) panel.setAttribute('aria-labelledby', button.id);
    }
  };
  for (const [index, button] of maps.entries()) {
    button.addEventListener('click', () => { theme = button.dataset.doroTheme; render(); });
    button.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % maps.length;
      else if (event.key === 'ArrowLeft') next = (index + maps.length - 1) % maps.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = maps.length - 1;
      else return;
      event.preventDefault(); maps[next].click(); maps[next].focus();
    });
  }
  motion.addEventListener('click', () => { paused = !paused; render(); });
  reduced.addEventListener('change', event => { paused = event.matches; render(); });
  const screenshot = document.querySelector('[data-doro-screen]');
  const caption = document.querySelector('[data-doro-role-caption]');
  const roles = [...document.querySelectorAll('[data-doro-role]')];
  for (const button of roles) button.addEventListener('click', () => {
    const role = button.dataset.doroRole;
    screenshot.src = `${screenshot.dataset.assetBase}${role}.png`;
    screenshot.alt = `Doro Modbus ${role === 'master' ? 'Master' : 'Slave'}`;
    caption.textContent = caption.dataset[role];
    for (const other of roles) other.setAttribute('aria-pressed', String(other === button));
  });
  document.querySelectorAll('[data-doro-controls]').forEach(controls => { controls.hidden = false; });
  render();
})();
