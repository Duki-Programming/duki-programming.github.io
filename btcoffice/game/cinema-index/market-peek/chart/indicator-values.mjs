const views = new WeakMap();

export function renderIndicatorValues(target, values, title = null, status = '') {
  const signature = status ? `status:${status}` : JSON.stringify([Boolean(title), values.map(value => value.key)]);
  let view = views.get(target);
  if (view?.signature !== signature) {
    view = { signature, items: new Map() }; target.replaceChildren();
    if (title) { view.title = document.createElement('span'); target.append(view.title); }
    if (status) target.append(status);
    else for (const value of values) {
      if (view.items.size) target.append('  ·  ');
      const node = document.createElement('span'); node.className = 'indicator-series-value'; node.dataset.series = value.key;
      view.items.set(value.key, node); target.append(node);
    }
    views.set(target, view);
  }
  if (view.title) { view.title.textContent = `${title.text}  `; view.title.style.color = title.color; }
  if (!status) for (const value of values) {
    const node = view.items.get(value.key); if (node.textContent !== value.text) node.textContent = value.text; node.style.color = value.color;
  }
}
