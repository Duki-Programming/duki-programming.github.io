import { INDICATORS, calculateIndicator, indicatorTitle } from './indicators.mjs';
import { PositionLines } from './trading/chart-lines.mjs';
import { quoteCurrency } from './markets/exchanges.mjs';
import { dataKey } from './core.mjs';
import { localeFor } from './i18n.mjs';
import { PriceScaleControls } from './chart/scale-controls.mjs';
import { indicatorControls, syncIndicatorControls } from './chart/indicator-controls.mjs';
import { CHART_COLORS, INDICATOR_APPEARANCE, indicatorColor, indicatorFill } from './indicator-appearance.mjs';
import { IndicatorBand } from './chart/indicator-band.mjs';
import { renderIndicatorValues } from './chart/indicator-values.mjs';

export class MarketChart {
  constructor(container, onCrosshair, onFocus = () => {}, onIndicatorAction = () => {}) {
    this.container = container; this.onCrosshair = onCrosshair; this.onFocus = onFocus;
    this.bars = []; this.data = {}; this.focusId = null; this.fontSize = 11;
    this.positionLines = new PositionLines();
    this.onIndicatorAction = onIndicatorAction; this.scaleControls = new PriceScaleControls(this);
    this.numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
    this.volumeFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, notation: 'compact' });
    this.resizeObserver = new ResizeObserver(() => this.scheduleLayout());
    this.doubleClick = event => {
      if (event.target.closest('button, .position-price-label')) return;
      const index = this.chart?.panes().findIndex(pane => {
        const rect = pane.getHTMLElement()?.getBoundingClientRect();
        // Leave price/time axis double-click autoscale intact.
        return rect && event.clientY >= rect.top && event.clientY < rect.bottom && event.clientX >= rect.left && event.clientX < rect.right - this.chart.priceScale('right').width();
      });
      if (index >= 0) { event.preventDefault(); event.stopPropagation(); this.toggleFocus(this.paneIds[index]); }
    };
    container.addEventListener('dblclick', this.doubleClick, true);
    this.priceLabelLayout = () => this.positionLines.scheduleLayout();
    container.addEventListener('pointermove', this.priceLabelLayout); container.addEventListener('wheel', this.priceLabelLayout, { passive: true });
  }

  configure(settings, instrument) {
    const key = dataKey(instrument, settings.interval, settings.cryptoMarket, settings.cryptoExchange), changedContext = this.scaleKey !== key;
    if (changedContext) this.scaleControls.unbind();
    this.scaleKey = key;
    this.settings = settings; this.instrument = { ...instrument, currency: quoteCurrency({ ...settings, instrument }) };
    this.active = INDICATORS.filter(spec => settings.indicators[spec.id].enabled);
    this.colors = CHART_COLORS[settings.theme];
    if (this.focusId && this.focusId !== 'price' && !this.active.some(spec => spec.id === this.focusId)) {
      this.focusId = null; this.onFocus(null);
    }
    const signature = `${this.focusId}:${this.active.map(spec => spec.id).join(',')}`;
    if (this.signature !== signature) {
      const saved = this.captureLayout(); this.signature = signature; this.build(saved);
    } else if (changedContext) this.scaleControls.bind();
    this.applyTheme(); this.updateTitles();
    this.updateIndicatorVisibility();
  }

  captureLayout() {
    if (!this.chart) return null;
    return { range: this.chart.timeScale().getVisibleLogicalRange(), scroll: this.container.scrollTop, heights: Object.fromEntries(this.chart.panes().map((p, i) => [this.paneIds[i], p.getHeight()])) };
  }

  build(saved) {
    const L = window.LightweightCharts;
    this.scaleControls.unbind();
    this.resizeObserver.disconnect(); this.chart?.remove();
    this.surface = document.createElement('div'); this.surface.className = 'chart-surface';
    const canvas = document.createElement('div'); canvas.className = 'chart-canvas';
    this.labels = document.createElement('div'); this.labels.className = 'pane-labels';
    this.surface.append(canvas, this.labels); this.container.replaceChildren(this.surface);
    const lower = this.active.filter(spec => spec.placement === 'pane');
    this.paneIds = this.focusId ? [this.focusId] : ['price', ...lower.map(spec => spec.id)];
    this.surface.style.minHeight = !this.focusId && lower.length > 1 ? `${170 + 110 * lower.length + 26}px` : '0px';
    this.container.dataset.focus = this.focusId || '';
    this.chart = L.createChart(canvas, {
      autoSize: true,
      layout: { background: { color: '#10171f' }, textColor: '#8b9aac', fontFamily: 'Segoe UI, sans-serif', fontSize: this.fontSize, attributionLogo: true, panes: { separatorColor: '#25313e', separatorHoverColor: '#617387', enableResize: true } },
      grid: { vertLines: { color: '#1a2530' }, horzLines: { color: '#1a2530' } },
      rightPriceScale: { borderVisible: false, minimumWidth: 76 },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, rightOffset: 5, barSpacing: 6 },
      crosshair: { mode: L.CrosshairMode.Normal, vertLine: { color: '#61798c', labelBackgroundColor: '#334657' }, horzLine: { color: '#61798c', labelBackgroundColor: '#334657' } },
      handleScroll: true, handleScale: true,
    });
    this.candles = null; this.volume = null; this.timeline = null; this.series = new Map(); this.headers = new Map(); this.bands = new Map();
    if (this.paneIds.includes('price')) {
      this.candles = this.chart.addSeries(L.CandlestickSeries, { borderVisible: false });
      this.volume = this.chart.addSeries(L.HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: '', lastValueVisible: false, priceLineVisible: false });
      this.volume.priceScale().applyOptions({ scaleMargins: { top: .86, bottom: 0 } });
    } else {
      // Whitespace preserves the candle timeline during warm-up or missing volume.
      this.timeline = this.chart.addSeries(L.LineSeries, { visible: false, lastValueVisible: false, priceLineVisible: false });
    }
    for (const spec of this.active) {
      const index = this.paneIds.indexOf(spec.placement === 'overlay' ? 'price' : spec.id);
      if (index < 0) continue;
      const entries = new Map();
      for (const { key, label } of INDICATOR_APPEARANCE[spec.id].series) {
        const bounded = ['mfi', 'rsi', 'stoch'].includes(spec.id), histogram = key === 'histogram';
        const series = this.chart.addSeries(histogram ? L.HistogramSeries : L.LineSeries, {
          color: indicatorColor(spec.id, key, this.settings.indicators[spec.id], this.settings.theme), priceLineVisible: false, lastValueVisible: spec.placement !== 'overlay',
          ...(histogram ? {} : { lineWidth: 2, crosshairMarkerRadius: 3 }),
          priceFormat: { type: spec.id === 'obv' ? 'volume' : 'price', precision: 2, minMove: .01 },
          ...(bounded ? { autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }) } : {}),
        }, index);
        entries.set(key, { series, label, lines: [] });
      }
      const reference = [...entries.values()][0];
      for (const level of INDICATOR_APPEARANCE[spec.id].levels || []) reference.lines.push({ key: level.key, line: reference.series.createPriceLine({ price: level.value, color: indicatorColor(spec.id, level.key, this.settings.indicators[spec.id], this.settings.theme), lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: '' }) });
      for (const fill of INDICATOR_APPEARANCE[spec.id].fills || []) {
        const primitive = new IndicatorBand(); reference.series.attachPrimitive(primitive);
        if (!this.bands.has(spec.id)) this.bands.set(spec.id, []);
        this.bands.get(spec.id).push({ spec: fill, primitive });
      }
      if (spec.placement === 'pane') reference.series.priceScale().applyOptions({ scaleMargins: { top: .25, bottom: .1 } });
      this.series.set(spec.id, entries);
    }
    for (const [index, id] of this.paneIds.entries()) {
      const pane = this.chart.panes()[index];
      const samePanes = saved?.heights && Object.keys(saved.heights).length === this.paneIds.length && this.paneIds.every(key => saved.heights[key]);
      pane.setStretchFactor(samePanes ? saved.heights[id] : id === 'price' ? (lower.length > 1 ? 170 / 110 : 3) : 1);
      const header = document.createElement('div'); header.className = 'pane-header'; header.dataset.pane = id;
      const title = document.createElement('span'); title.className = 'pane-title';
      const values = document.createElement('span'); values.className = 'pane-values';
      const button = document.createElement('button'); button.className = 'pane-toggle'; button.type = 'button';
      button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${this.focusId ? '<path d="M8 3v5H3m13-5v5h5M8 21v-5H3m13 5v-5h5"/>' : '<path d="M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6"/>'}</svg>`;
      const name = id === 'price' ? '가격 차트' : INDICATORS.find(spec => spec.id === id).short;
      button.title = this.focusId ? '원래 배치로 복원 (Esc / 더블클릭)' : `${name} 확대 (더블클릭)`;
      button.setAttribute('aria-label', this.focusId ? '원래 배치로 복원' : `${name} 확대`);
      button.onclick = () => this.toggleFocus(id);
      header.title = '차트 영역을 더블클릭하면 확대·복원합니다.';
      if (id === 'price') header.append(title, values, button);
      else {
        const legend = document.createElement('span'); legend.className = 'indicator-legend';
        const spec = INDICATORS.find(spec => spec.id === id);
        legend.append(title, values, indicatorControls(spec, this.onIndicatorAction)); header.append(legend, button);
      }
      this.labels.append(header); this.headers.set(id, { header, title, values });
      const element = pane.getHTMLElement(); if (element) this.resizeObserver.observe(element);
    }
    this.overlayLabels = new Map();
    if (this.candles) for (const spec of this.active.filter(s => s.placement === 'overlay')) {
      const label = document.createElement('div'); label.className = 'overlay-indicator indicator-legend'; label.dataset.indicator = spec.id;
      const value = document.createElement('span'); value.className = 'indicator-legend-value'; label.append(value, indicatorControls(spec, this.onIndicatorAction));
      this.labels.append(label); this.overlayLabels.set(spec.id, label);
    }
    this.chart.subscribeCrosshairMove(param => {
      const bar = param.time ? this.bars.find(b => b.time === param.time) : null;
      this.onCrosshair(bar); this.updateValues(param.time ? param : null);
    });
    this.chart.timeScale().subscribeVisibleLogicalRangeChange(this.priceLabelLayout);
    this.positionLines.bind(this.candles, this.candles ? { surface: this.surface, pane: this.chart.panes()[0], chart: this.chart } : null);
    this.applyTheme(); this.updateTitles(); this.drawData();
    if (saved?.range && this.bars.length) this.chart.timeScale().setVisibleLogicalRange(saved.range);
    else this.resetRange();
    this.scaleControls.bind(); this.updateIndicatorVisibility();
    this.container.scrollTop = saved?.scroll || 0;
    this.resizeObserver.observe(this.surface); this.scheduleLayout();
  }

  applyTheme() {
    if (!this.chart) return;
    const { settings, colors } = this, light = settings.theme === 'light', grid = light ? '#e8edf2' : '#1a2530';
    const formatter = new Intl.DateTimeFormat(localeFor(settings.language), { timeZone: settings.timezone, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    const tickFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: settings.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    this.chart.applyOptions({ layout: { background: { color: light ? '#f7f9fb' : '#10171f' }, textColor: light ? '#617387' : '#8b9aac', panes: { separatorColor: light ? '#dbe2e9' : '#25313e' } }, grid: { vertLines: { color: grid }, horzLines: { color: grid } }, localization: { locale: localeFor(settings.language), timeFormatter: time => formatter.format(new Date(time * 1000)) }, timeScale: { timeVisible: !['1d', '1w'].includes(settings.interval), tickMarkFormatter: (time, type) => type === 3 || type === 4 ? tickFormatter.format(new Date(time * 1000)) : null } });
    this.candles?.applyOptions({ upColor: colors.up, downColor: colors.down, wickUpColor: colors.up, wickDownColor: colors.down });
    this.candles?.priceScale().applyOptions({ scaleMargins: { top: .12, bottom: settings.showVolume ? .2 : .08 } });
    this.volume?.applyOptions({ visible: settings.showVolume });
    for (const [id, entries] of this.series) for (const [key, entry] of entries) {
      entry.series.applyOptions({ color: indicatorColor(id, key, settings.indicators[id], settings.theme) });
      for (const { key, line } of entry.lines) line.applyOptions({ color: indicatorColor(id, key, settings.indicators[id], settings.theme) });
    }
    this.updateBandStyles();
  }

  updateTitles() {
    for (const [id, { title }] of this.headers) {
      const spec = INDICATORS.find(s => s.id === id);
      title.textContent = spec ? indicatorTitle(spec, this.settings.indicators[id]) : '가격';
      if (spec) title.style.color = indicatorColor(id, INDICATOR_APPEARANCE[id].series[0].key, this.settings.indicators[id], this.settings.theme);
    }
    this.updateValues();
  }

  updateValues(crosshair = null) {
    const renderValues = (id, target, prefix = '') => {
      const status = ['mfi', 'obv'].includes(id) && this.bars.length && !this.bars.some(b => b.volume > 0) ? '거래량 미제공' : !crosshair && !Object.values(this.data[id] || {}).some(points => points.length) ? '계산할 봉 부족' : '';
      const items = [...this.series.get(id)].map(([key, entry]) => {
        const p = crosshair ? crosshair.seriesData.get(entry.series) : this.data[id]?.[key]?.at(-1);
        const value = Number.isFinite(p?.value) ? (id === 'obv' ? this.volumeFormat : this.numberFormat).format(p.value) : '—';
        return { key, text: `${entry.label ? `${entry.label} ` : ''}${value}`, color: indicatorColor(id, key, this.settings.indicators[id], this.settings.theme, p?.value) };
      });
      renderIndicatorValues(target, items, prefix ? { text: prefix, color: indicatorColor(id, INDICATOR_APPEARANCE[id].series[0].key, this.settings.indicators[id], this.settings.theme) } : null, status);
    };
    for (const [id, { values }] of this.headers) if (id !== 'price') renderValues(id, values);
    for (const [id, label] of this.overlayLabels) {
      const spec = INDICATORS.find(s => s.id === id);
      renderValues(id, label.querySelector('.indicator-legend-value'), indicatorTitle(spec, this.settings.indicators[id]));
    }
  }

  updateBandStyles() {
    for (const [id, fills] of this.bands) for (const { spec, primitive } of fills) primitive.setStyle(indicatorFill(id, spec, this.settings.indicators[id], this.settings.theme));
  }

  updateIndicatorVisibility() {
    for (const spec of this.active) {
      const hidden = Boolean(this.settings.indicators[spec.id].hidden);
      for (const entry of this.series.get(spec.id)?.values() || []) {
        entry.series.applyOptions({ visible: !hidden });
        for (const { line } of entry.lines) line.applyOptions({ lineVisible: !hidden });
      }
      const legend = spec.placement === 'overlay' ? this.overlayLabels.get(spec.id) : this.headers.get(spec.id)?.header.querySelector('.indicator-legend');
      legend?.classList.toggle('indicator-hidden', hidden);
      syncIndicatorControls(legend?.querySelector('.indicator-controls'), spec, hidden);
    }
    this.updateBandStyles();
  }

  scheduleLayout() {
    cancelAnimationFrame(this.layoutFrame);
    this.layoutFrame = requestAnimationFrame(() => {
      if (!this.chart) return;
      const top = this.surface.getBoundingClientRect().top;
      this.chart.panes().forEach((pane, index) => {
        const rect = pane.getHTMLElement()?.getBoundingClientRect();
        if (rect) this.headers.get(this.paneIds[index]).header.style.top = `${rect.top - top + 3}px`;
      });
      let row = 0;
      for (const label of this.overlayLabels.values()) label.style.top = `${28 + row++ * 17}px`;
      this.positionLines.layout();
      this.scaleControls.layout(); this.scaleControls.schedule();
    });
  }

  setData(bars, reset = false, incremental = false) {
    // The stream mutates its bar array in place; retain timestamps independently.
    const oldFirst = this.firstTime, oldLast = this.lastTime;
    this.bars = bars;
    this.firstTime = bars[0]?.time; this.lastTime = bars.at(-1)?.time;
    if (reset || !bars.length) { this.data = {}; if (this.overview) this.overview.range = null; }
    for (const spec of this.active) {
      const result = calculateIndicator(spec.id, bars, this.settings.indicators[spec.id]);
      if (spec.id === 'obv' && result.value.length && this.data.obv?.value.length) {
        // Preserve OBV's origin when the bounded candle window rolls forward.
        const previous = new Map(this.data.obv.value.map(p => [p.time, p.value]));
        const anchor = result.value.find(p => previous.has(p.time));
        if (anchor) { const offset = previous.get(anchor.time) - anchor.value; result.value = result.value.map(p => ({ ...p, value: p.value + offset })); }
      }
      this.data[spec.id] = result;
    }
    this.drawData(incremental && !reset && oldFirst === bars[0]?.time && oldLast <= bars.at(-1)?.time);
    if (reset) this.resetRange();
    this.updateValues();
    this.positionLines.setMarkPrice(bars.at(-1)?.close); this.positionLines.scheduleLayout();
  }

  drawData(incremental = false) {
    const bars = this.bars, last = bars.at(-1), precision = this.instrument.currency === 'KRW' ? 0 : last?.close < 1 ? 6 : last?.close < 10 ? 4 : 2;
    const priceFormat = { type: 'price', precision, minMove: 10 ** -precision };
    this.candles?.applyOptions({ priceFormat });
    const volumeBar = b => ({ time: b.time, value: b.volume, color: `${b.close >= b.open ? this.colors.up : this.colors.down}32` });
    if (incremental && last) { this.candles?.update(last); this.volume?.update(volumeBar(last)); }
    else { this.candles?.setData(bars); this.volume?.setData(bars.map(volumeBar)); }
    this.timeline?.setData(bars.map(b => ({ time: b.time })));
    for (const [id, entries] of this.series) for (const [key, { series }] of entries) {
      let data = this.data[id]?.[key] || [];
      if (['bb', 'sma', 'ema'].includes(id)) series.applyOptions({ priceFormat });
      if (key === 'histogram') data = data.map(p => ({ ...p, color: indicatorColor(id, key, this.settings.indicators[id], this.settings.theme, p.value) }));
      // Bounded recomputation prevents cumulative drift while the live candle changes.
      series.setData(data);
    }
    for (const [id, fills] of this.bands) for (const { spec, primitive } of fills) {
      const result = this.data[id] || {}, timeline = Object.values(result)[0] || [];
      const boundary = value => typeof value === 'number' ? timeline.map(point => ({ time: point.time, value })) : result[value] || [];
      primitive.setData(boundary(spec.upper), boundary(spec.lower));
    }
  }

  toggleFocus(id) {
    if (!this.focusId && this.paneIds.length < 2) return;
    const saved = this.captureLayout();
    if (this.focusId) { this.focusId = null; this.build(this.overview); this.overview = null; }
    else { this.overview = saved; this.focusId = id; this.build({ range: saved.range }); }
    this.signature = `${this.focusId}:${this.active.map(spec => spec.id).join(',')}`;
    this.onFocus(this.focusId); this.onCrosshair(null); this.updateValues();
  }

  restore() { if (!this.focusId) return false; this.toggleFocus(this.focusId); return true; }
  setAccountLines(lines) { this.positionLines.setData(lines); }
  setMarkPrice(price) { this.positionLines.setMarkPrice(price); }
  resetRange() { if (this.bars.length) this.chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, this.bars.length - 100), to: this.bars.length + 4 }); }
  setFontSize(size) { this.fontSize = size; this.chart?.applyOptions({ layout: { fontSize: size } }); }
  fit() { this.chart?.timeScale().fitContent(); }
  destroy() { cancelAnimationFrame(this.layoutFrame); this.resizeObserver.disconnect(); this.container.removeEventListener('dblclick', this.doubleClick, true); this.container.removeEventListener('pointermove', this.priceLabelLayout); this.container.removeEventListener('wheel', this.priceLabelLayout); this.scaleControls.destroy(); this.positionLines.destroy(); this.chart?.remove(); this.chart = null; }
}
