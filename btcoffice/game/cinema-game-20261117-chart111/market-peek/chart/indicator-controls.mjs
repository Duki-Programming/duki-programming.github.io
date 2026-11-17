const ICONS = {
  hide: '<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  show: '<path d="m3 3 18 18M10.6 6.1 12 6c6.4 0 10 6 10 6a19 19 0 0 1-3.2 3.7M6.4 7.6A19 19 0 0 0 2 12s3.6 6 10 6a12 12 0 0 0 4.5-.9"/>',
  settings: '<path d="m9 3 6 0 .5 3 2 1.2 2.9-1 3 5.2-2.4 2 .1 2.3 2.3 2-3 5.2-2.9-1-2 1.1-.5 3H9l-.5-3-2-1.1-2.9 1-3-5.2 2.3-2 .1-2.3-2.4-2 3-5.2 2.9 1L8.5 6Z" transform="translate(2 -1) scale(.83)"/><circle cx="12" cy="12" r="3"/>',
  remove: '<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',
};

export function indicatorControls(spec, onAction) {
  const group = document.createElement('span'); group.className = 'indicator-controls';
  for (const [action, label] of [['hide', 'Hide'], ['settings', 'Settings'], ['remove', 'Remove']]) {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.action = action;
    button.title = `${label} ${spec.short}`; button.setAttribute('aria-label', button.title);
    button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[action]}</svg>`;
    button.onclick = event => { event.stopPropagation(); onAction?.(spec.id, action); };
    group.append(button);
  }
  return group;
}

export function syncIndicatorControls(group, spec, hidden) {
  const button = group?.querySelector('[data-action=hide]');
  if (!button) return;
  button.title = `${hidden ? 'Show' : 'Hide'} ${spec.short}`; button.setAttribute('aria-label', button.title); button.setAttribute('aria-pressed', String(hidden));
  button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[hidden ? 'show' : 'hide']}</svg>`;
}
