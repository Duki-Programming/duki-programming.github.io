import { lineLabelContent } from './line-labels.mjs';
import { returnDescription } from './position-return.mjs';
import { positionUnitControl } from './unit-control.mjs';
import { formatLabelAmount } from './model.mjs';

const COLORS = { liquidation: '#b18bf3', tp: '#20c997', sl: '#f45d69', trigger: '#f6a54c' };
const colorFor = item => COLORS[item.kind] || ((item.kind === 'limit' ? item.orderSide === 'sell' : ['short', 'sell'].includes(item.side)) ? '#f45d69' : '#20c997');

export class PositionLines {
  constructor() { this.definitions = []; this.lines = []; this.hidden = new Set(); this.badges = []; }
  key(item) { return item.id || `${item.title}:${item.kind}:${item.price}`; }
  setData(definitions) {
    const keys = new Set(definitions.map(item => this.key(item)));
    for (const key of this.hidden) if (!keys.has(key)) this.hidden.delete(key);
    this.definitions = definitions; this.draw();
  }
  bind(series, context = null) {
    this.layer?.remove(); this.layer = null; this.series = series; this.context = context; this.lines = []; this.badges = [];
    if (series && context) {
      this.layer = document.createElement('div'); this.layer.className = 'position-label-layer'; context.surface.append(this.layer);
      this.restoreButton = document.createElement('button'); this.restoreButton.type = 'button'; this.restoreButton.className = 'order-lines-restore'; this.restoreButton.textContent = 'Show hidden lines';
      this.restoreButton.onclick = () => { this.hidden.clear(); this.draw(); };
    }
    this.draw();
  }
  draw() {
    if (!this.series) return;
    for (const line of this.lines) this.series.removePriceLine(line);
    this.lines = []; this.badges = []; this.layer?.replaceChildren();
    for (const item of this.definitions) {
      if (this.hidden.has(this.key(item))) continue;
      const color = colorFor(item);
      this.lines.push(this.series.createPriceLine({ price: item.price, title: '', color, lineWidth: item.kind === 'entry' ? 2 : 1, lineStyle: item.kind === 'entry' ? 0 : 2, axisLabelVisible: true, lineVisible: true }));
      if (!this.layer) continue;
      const badge = document.createElement('div'); badge.className = 'position-price-label'; badge.dataset.kind = item.kind; badge.dataset.price = item.price; badge.style.setProperty('--order-color', color);
      const quantity = document.createElement('span'); quantity.className = 'order-label-quantity';
      const sizeText = lineLabelContent(item, this.markPrice).quantity;
      const quantityValue = document.createTextNode('');
      quantity.append(quantityValue, document.createTextNode(' '), positionUnitControl(sizeText.slice(sizeText.lastIndexOf(' ') + 1), item.currency || 'USDT'));
      const name = document.createElement('span'); name.className = 'order-label-name'; name.textContent = item.label || item.title;
      const pnl = document.createElement('span'); pnl.className = 'order-label-pnl';
      const close = document.createElement('button'); close.type = 'button'; close.className = 'order-label-close'; close.textContent = '×'; close.title = 'Hide this line (does not cancel the order)'; close.setAttribute('aria-label', `Hide ${item.label || item.title}`);
      close.onclick = event => { event.stopPropagation(); this.hidden.add(this.key(item)); this.draw(); };
      badge.title = `${item.title} · ${formatLabelAmount(item.price)} ${item.currency || 'USDT'} · ${item.kind === 'entry' && Number.isFinite(item.unrealizedPnl) ? 'Exchange PnL' : 'Estimated PnL'} · ${returnDescription(item)}`;
      badge.append(quantity, name, pnl, close); this.layer.append(badge); this.badges.push({ item, badge, quantity, quantityValue, pnl });
    }
    if (this.layer && this.hidden.size) this.layer.append(this.restoreButton);
    this.updateValues(); this.scheduleLayout();
  }
  setMarkPrice(price) { this.markPrice = price; this.updateValues(); }
  updateValues() {
    for (const { item, quantity, quantityValue, pnl } of this.badges) {
      const content = lineLabelContent(item, this.markPrice);
      quantityValue.textContent = content.quantity.slice(0, content.quantity.lastIndexOf(' ')); quantity.hidden = !content.quantity;
      pnl.textContent = content.detail; pnl.hidden = !content.detail;
      pnl.classList.toggle('positive', content.pnl > 0); pnl.classList.toggle('negative', content.pnl < 0);
    }
  }
  scheduleLayout() {
    if (!this.context) return;
    cancelAnimationFrame(this.frame); this.frame = requestAnimationFrame(() => this.layout());
  }
  layout() {
    if (!this.series || !this.context || !this.layer) return;
    const { surface, pane, chart } = this.context;
    const paneRect = pane.getHTMLElement()?.getBoundingClientRect(), surfaceRect = surface.getBoundingClientRect();
    if (!paneRect) return;
    const width = chart.timeScale().width(), height = pane.getHeight();
    this.layer.style.left = `${paneRect.left - surfaceRect.left}px`; this.layer.style.top = `${paneRect.top - surfaceRect.top}px`;
    this.layer.style.width = `${width}px`; this.layer.style.height = `${height}px`; this.layer.style.right = this.layer.style.bottom = 'auto';
    for (const { item, badge } of this.badges) {
      const y = this.series.priceToCoordinate(item.price);
      badge.hidden = y === null || y < 10 || y > height - 10;
      if (badge.hidden) continue;
      badge.style.top = `${y}px`;
    }
  }
  destroy() { cancelAnimationFrame(this.frame); this.layer?.remove(); this.series = null; this.context = null; }
}
