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
})();
