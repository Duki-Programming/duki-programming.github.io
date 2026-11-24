import { priceBarRatio, lockedScaleRange, scaleTransform, zoomScaleRange } from './scale-math.mjs';

const item = (tag, cls, text) => { const element = document.createElement(tag); element.className = cls; if (text != null) element.textContent = text; return element; };
const AXIS_HOLD_MS = 500, AXIS_HOLD_SLOP = 8;

export class PriceScaleControls {
  constructor(owner) {
    this.owner = owner; this.container = owner.container; this.contexts = new Map(); this.states = new Map(); this.buttons = new Map();
    this.cancelHold = () => { clearTimeout(this.holdTimer); this.axisHold = null; };
    this.move = event => {
      const hold = this.axisHold;
      if (hold?.pointer === event.pointerId && Math.hypot(event.clientX - hold.x, event.clientY - hold.y) > AXIS_HOLD_SLOP) this.cancelHold();
      const pane = this.hit(event);
      this.hovered = pane?.id || null;
      if (pane) this.lastPane = pane.id;
      for (const [id, group] of this.buttons) group.classList.toggle('axis-hovered', pane?.axis && pane.id === id);
      if (this.dragging) this.schedule(true);
    };
    this.leave = () => { this.hovered = null; for (const group of this.buttons.values()) group.classList.remove('axis-hovered'); };
    this.down = event => {
      this.cancelHold();
      const pane = this.hit(event);
      if (event.button !== 0 || !pane?.axis || event.target.closest('button')) return;
      if (this.state(pane.id).locked) this.dragging = pane.id;
      if (event.pointerType !== 'touch' || !event.isPrimary) return;
      const hold = this.axisHold = {pointer:event.pointerId, x:event.clientX, y:event.clientY};
      this.holdTimer = setTimeout(() => { this.cancelHold(); this.openMenu(pane.id, hold.x, hold.y); }, AXIS_HOLD_MS);
    };
    this.up = () => { this.cancelHold(); this.schedule(Boolean(this.dragging)); this.dragging = null; };
    this.wheel = event => {
      const pane = this.hit(event);
      if (!pane?.axis || !event.deltaY || event.target.closest('button')) return;
      const scale = this.scale(pane.id), options = scale.options();
      const rect = this.bound.panes()[this.owner.paneIds.indexOf(pane.id)].getHTMLElement().getBoundingClientRect();
      const height = rect.height * (1 - options.scaleMargins.top - options.scaleMargins.bottom);
      if (!(height > 0)) return;
      const y = (event.clientY - rect.top - rect.height * options.scaleMargins.top) / height;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1);
      const range = zoomScaleRange(scale.getVisibleRange(), Math.exp(Math.max(-1000, Math.min(1000, delta)) * .0015), options.invertScale ? y : 1 - y, options.mode === 1);
      if (!range) return;
      event.preventDefault(); event.stopPropagation();
      this.lastPane = pane.id;
      scale.applyOptions({ autoScale: false }); scale.setVisibleRange(range);
      this.sync(pane.id); this.closeMenu(); this.schedule(this.state(pane.id).locked);
    };
    this.contextMenu = event => {
      const pane = this.hit(event);
      if (!pane?.axis) return;
      this.cancelHold();
      event.preventDefault(); event.stopPropagation(); this.openMenu(pane.id, event.clientX, event.clientY);
    };
    this.outside = event => { if (this.menu && !this.menu.contains(event.target)) this.closeMenu(); };
    this.key = event => {
      if (event.altKey && event.code === 'KeyI' && !event.ctrlKey && !event.metaKey && !event.target.closest('input,textarea,select,[contenteditable=true]') && !document.querySelector('#overlay:not([hidden]), dialog[open]') && this.container.getClientRects().length) {
        event.preventDefault(); event.stopPropagation(); this.action(this.lastPane || this.owner.paneIds[0], 'invert');
      } else if (event.key === 'Escape' && this.menu) { event.preventDefault(); event.stopImmediatePropagation(); this.closeMenu(true); }
    };
    this.dismiss = () => this.closeMenu();
    this.container.addEventListener('pointermove', this.move);
    this.container.addEventListener('pointerleave', this.leave);
    this.container.addEventListener('pointerdown', this.down, true);
    this.container.addEventListener('wheel', this.wheel, { passive: false, capture: true });
    this.container.addEventListener('contextmenu', this.contextMenu);
    this.container.addEventListener('scroll', this.dismiss);
    this.container.addEventListener('dblclick', this.up);
    document.addEventListener('pointerup', this.up);
    document.addEventListener('pointercancel', this.up);
    document.addEventListener('pointerdown', this.outside, true);
    document.addEventListener('keydown', this.key, true);
    window.addEventListener('resize', this.dismiss);
  }
  state(id) { if (!this.states.has(id)) this.states.set(id, { auto: true, log: false, inverted: false, onlyPrice: false, locked: false, ratio: null, range: null }); return this.states.get(id); }
  scale(id) { const index = this.owner.paneIds.indexOf(id); return index >= 0 && this.bound ? this.bound.priceScale('right', index) : null; }
  height(id) {
    const index = this.owner.paneIds.indexOf(id), options = this.scale(id)?.options();
    return options ? Math.max(1, this.bound.panes()[index].getHeight() * (1 - options.scaleMargins.top - options.scaleMargins.bottom) - 1) : 0;
  }
  spacing() { return this.bound?.timeScale().options().barSpacing || 6; }
  sync(id) {
    const scale = this.scale(id); if (!scale) return;
    const options = scale.options(), state = this.state(id);
    state.auto = options.autoScale; state.log = options.mode === 1; state.inverted = options.invertScale;
    state.range = scale.getVisibleRange();
    if (state.auto) state.locked = false;
    const group = this.buttons.get(id);
    for (const [action, value] of [['auto', state.auto], ['log', state.log]]) {
      const button = group?.querySelector(`[data-action=${action}]`); button?.classList.toggle('active', value); button?.setAttribute('aria-pressed', String(value));
    }
  }
  unbind() {
    this.cancelHold(); this.closeMenu(); cancelAnimationFrame(this.frame);
    if (this.bound) {
      for (const id of this.boundIds) this.sync(id);
      this.bound.timeScale().unsubscribeVisibleLogicalRangeChange(this.timeChange);
    }
    this.bound = null; this.layer?.remove(); this.buttons.clear();
  }
  bind() {
    this.unbind();
    const key = this.owner.scaleKey;
    if (!this.contexts.has(key)) this.contexts.set(key, new Map());
    this.states = this.contexts.get(key);
    if (this.contexts.size > 60) this.contexts.delete(this.contexts.keys().next().value);
    this.bound = this.owner.chart; this.boundIds = [...this.owner.paneIds];
    this.layer = item('div', 'price-scale-controls'); this.owner.surface.append(this.layer);
    for (const id of this.owner.paneIds) {
      const state = this.state(id), scale = this.scale(id);
      scale.applyOptions({ autoScale: state.auto, mode: state.log ? 1 : 0, invertScale: state.inverted });
      if (!state.auto && state.range) {
        const { project } = scaleTransform(state.range, state.log);
        scale.setVisibleRange({ from: project(state.range.from), to: project(state.range.to) });
      }
      const group = item('div', 'price-scale-buttons'); group.dataset.pane = id;
      for (const [action, text, title] of [['auto', 'A', 'Auto (fits data to screen)'], ['log', 'L', 'Logarithmic']]) {
        const button = item('button', '', text); button.type = 'button'; button.dataset.action = action; button.title = title; button.setAttribute('aria-label', title);
        button.onclick = event => { event.stopPropagation(); this.action(id, action); };
        group.append(button);
      }
      this.buttons.set(id, group); this.layer.append(group); this.sync(id);
    }
    this.applyPriceOnly();
    this.timeChange = () => this.schedule(); this.bound.timeScale().subscribeVisibleLogicalRangeChange(this.timeChange);
    this.layout(); this.schedule();
  }
  applyPriceOnly() {
    const only = this.state('price').onlyPrice;
    for (const id of ['bb', 'sma', 'ema']) for (const entry of this.owner.series.get(id)?.values() || []) entry.series.applyOptions({ autoscaleInfoProvider: original => only ? null : original() });
  }
  hit(event) {
    if (!this.bound) return null;
    for (const [index, id] of this.owner.paneIds.entries()) {
      const rect = this.bound.panes()[index].getHTMLElement()?.getBoundingClientRect();
      if (rect && event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom) return { id, axis: event.clientX >= rect.right - this.scale(id).width() };
    }
    return null;
  }
  action(id, action) {
    const scale = this.scale(id); if (!scale) return;
    this.sync(id); const state = this.state(id);
    if (action === 'auto') { state.locked = false; scale.applyOptions({ autoScale: !state.auto }); }
    if (action === 'log' || action === 'regular') {
      const locked = state.locked;
      scale.applyOptions({ mode: action === 'regular' ? 0 : state.log ? 0 : 1 });
      if (locked) { state.ratio = null; this.rebase = id; }
    }
    if (action === 'invert') scale.applyOptions({ invertScale: !state.inverted });
    if (action === 'price-only') { state.onlyPrice = !state.onlyPrice; this.applyPriceOnly(); }
    if (action === 'lock') {
      if (state.locked) state.locked = false;
      else {
        state.ratio = priceBarRatio(scale.getVisibleRange(), this.height(id), this.spacing(), state.log);
        if (state.ratio) { scale.applyOptions({ autoScale: false }); state.locked = true; }
      }
    }
    this.sync(id); this.closeMenu(); this.owner.positionLines.scheduleLayout(); this.schedule();
  }
  schedule(verticalDrag = false) {
    this.verticalDrag = this.verticalDrag || verticalDrag;
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      if (!this.bound) return;
      for (const id of this.owner.paneIds) {
        this.sync(id); const state = this.state(id), scale = this.scale(id), range = scale.getVisibleRange();
        if (this.rebase === id && state.locked) { state.ratio = priceBarRatio(range, this.height(id), this.spacing(), state.log); this.rebase = null; }
        if (!state.locked || !range || !state.ratio) continue;
        if (this.verticalDrag && (this.dragging === id || this.lastPane === id)) {
          const current = priceBarRatio(range, this.height(id), 1, state.log);
          if (current) this.bound.timeScale().applyOptions({ barSpacing: Math.max(.5, Math.min(500, state.ratio / current)) });
        } else {
          const current = priceBarRatio(range, this.height(id), this.spacing(), state.log);
          if (current && Math.abs(current / state.ratio - 1) > 1e-7) {
            const next = lockedScaleRange(range, state.ratio, this.height(id), this.spacing(), state.log);
            if (next) scale.setVisibleRange(next);
          }
        }
        this.sync(id);
      }
      this.verticalDrag = false; this.layout(); this.owner.positionLines.scheduleLayout();
    });
  }
  layout() {
    if (!this.bound || !this.layer) return;
    const surface = this.owner.surface.getBoundingClientRect();
    for (const [index, id] of this.owner.paneIds.entries()) {
      const rect = this.bound.panes()[index].getHTMLElement()?.getBoundingClientRect(), group = this.buttons.get(id);
      if (rect && group) { group.style.top = `${rect.bottom - surface.top - 26}px`; group.style.right = `${surface.right - rect.right + 5}px`; }
    }
  }
  openMenu(id, x, y) {
    this.closeMenu(); this.sync(id); this.lastPane = id;
    const state = this.state(id), scale = this.scale(id);
    const ratio = state.locked ? state.ratio : priceBarRatio(scale.getVisibleRange(), this.height(id), this.spacing(), state.log);
    this.menu = item('div', 'price-scale-menu'); this.menu.setAttribute('role', 'menu'); this.menu.setAttribute('aria-label', 'Price scale options'); this.menu.dataset.pane = id;
    const entries = [
      ['auto', 'Auto (fits data to screen)', state.auto, ''], ['lock', 'Lock price to bar ratio', state.locked, ratio ? ratio.toFixed(4) : '—'],
      ['price-only', 'Scale price chart only', state.onlyPrice, ''], ['invert', 'Invert scale', state.inverted, 'Alt+I'],
      ['regular', 'Regular', !state.log, ''], ['log', 'Logarithmic', state.log, ''],
    ];
    for (const [action, text, checked, detail] of entries) {
      const button = item('button', '', ''); button.type = 'button'; button.dataset.action = action; button.setAttribute('role', action === 'regular' || action === 'log' ? 'menuitemradio' : 'menuitemcheckbox'); button.setAttribute('aria-checked', String(checked));
      if (action === 'price-only' && id !== 'price') button.disabled = true;
      if (action === 'lock' && !ratio) button.disabled = true;
      if (action === 'regular') button.classList.add('scale-mode-start');
      button.append(item('span', 'scale-menu-check', checked ? '✓' : ''), item('span', 'scale-menu-label', text), item('span', 'scale-menu-detail', detail));
      button.onclick = () => { if (action === 'log' && state.log) this.closeMenu(); else this.action(id, action); }; this.menu.append(button);
    }
    this.menu.onkeydown = event => {
      const buttons = [...this.menu.querySelectorAll('button:not(:disabled)')], index = buttons.indexOf(document.activeElement);
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length; buttons[next].focus();
      }
    };
    this.beforeMenuFocus = document.activeElement; document.body.append(this.menu);
    const rect = this.menu.getBoundingClientRect(); this.menu.style.left = `${Math.max(5, Math.min(x, window.innerWidth - rect.width - 5))}px`; this.menu.style.top = `${Math.max(5, Math.min(y, window.innerHeight - rect.height - 5))}px`;
    this.menu.querySelector('button').focus();
  }
  closeMenu(restoreFocus = false) { this.menu?.remove(); this.menu = null; if (restoreFocus && this.beforeMenuFocus?.isConnected) this.beforeMenuFocus.focus(); }
  destroy() {
    this.container.removeEventListener('wheel', this.wheel, true);
    this.unbind(); this.container.removeEventListener('pointermove', this.move); this.container.removeEventListener('pointerleave', this.leave); this.container.removeEventListener('pointerdown', this.down, true); this.container.removeEventListener('contextmenu', this.contextMenu); this.container.removeEventListener('scroll', this.dismiss); this.container.removeEventListener('dblclick', this.up);
    document.removeEventListener('pointerup', this.up); document.removeEventListener('pointercancel', this.up); document.removeEventListener('pointerdown', this.outside, true); document.removeEventListener('keydown', this.key, true); window.removeEventListener('resize', this.dismiss);
  }
}
