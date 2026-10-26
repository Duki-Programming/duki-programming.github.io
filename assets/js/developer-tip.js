(() => {
  const dialog = document.getElementById('developer-tip-dialog');
  const trigger = document.querySelector('[data-tip-open]');
  if (!dialog || !trigger) return;
  trigger.addEventListener('click', () => { if (!dialog.open) dialog.showModal(); });
  dialog.addEventListener('close', () => trigger.focus());
  let pressedBackdrop = false;
  const outside = event => {
    const bounds = dialog.getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
  };
  dialog.addEventListener('pointerdown', event => { pressedBackdrop = event.target === dialog && outside(event); });
  dialog.addEventListener('click', event => {
    if (pressedBackdrop && event.target === dialog && outside(event)) dialog.close();
    pressedBackdrop = false;
  });
  const tabs = [...dialog.querySelectorAll('[role="tab"]')];
  const selectTab = selected => {
    for (const tab of tabs) {
      const active = tab === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
    }
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault(); selectTab(tabs[next]); tabs[next].focus();
    });
  });
  const copy = dialog.querySelector('[data-tip-copy]');
  const address = dialog.querySelector('#tip-usdt-address');
  const status = dialog.querySelector('.tip-copy-status');
  if (copy && address && status) {
    copy.addEventListener('click', async () => {
      copy.disabled = true;
      status.textContent = '';
      try {
        await navigator.clipboard.writeText(address.value);
        status.textContent = copy.dataset.success;
      } catch {
        address.focus(); address.select();
        status.textContent = copy.dataset.failure;
      } finally { copy.disabled = false; }
    });
    dialog.addEventListener('close', () => { status.textContent = ''; });
  }
})();
