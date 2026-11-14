// Native series primitive: coordinates stay aligned through zoom, inversion and pane changes.
export class IndicatorBand {
  constructor() {
    this.data = []; this.points = []; this.style = {};
    const renderer = { draw: target => this.draw(target) };
    this.views = [{ zOrder: () => 'bottom', renderer: () => renderer }];
  }
  attached({ chart, series, requestUpdate }) { this.chart = chart; this.series = series; this.requestUpdate = requestUpdate; }
  detached() { this.chart = this.series = this.requestUpdate = null; this.points = []; }
  paneViews() { return this.views; }
  setStyle(style) { this.style = style; this.requestUpdate?.(); }
  setData(upper, lower) {
    const lowerByTime = new Map(lower.map(point => [point.time, point.value]));
    this.data = upper.filter(point => Number.isFinite(point.value) && Number.isFinite(lowerByTime.get(point.time))).map(point => ({ time: point.time, upper: point.value, lower: lowerByTime.get(point.time) }));
    this.requestUpdate?.();
  }
  updateAllViews() {
    this.points = [];
    if (!this.style.visible || !this.style.opacity || !this.chart || !this.series) return;
    const timeScale = this.chart.timeScale(), range = timeScale.getVisibleRange();
    if (!range) return;
    let first = this.data.findIndex(point => point.time >= range.from);
    if (first < 0) return;
    first = Math.max(0, first - 1);
    for (let index = first; index < this.data.length; index++) {
      const point = this.data[index], x = timeScale.timeToCoordinate(point.time), upper = this.series.priceToCoordinate(point.upper), lower = this.series.priceToCoordinate(point.lower);
      if (x !== null && upper !== null && lower !== null) this.points.push({ x, upper, lower });
      if (point.time > range.to) break;
    }
  }
  draw(target) {
    if (this.points.length < 2 || !this.style.visible || !this.style.opacity) return;
    target.useMediaCoordinateSpace(({ context }) => {
      context.save(); context.globalAlpha = this.style.opacity / 100; context.fillStyle = this.style.color; context.beginPath();
      this.points.forEach((point, index) => index ? context.lineTo(point.x, point.upper) : context.moveTo(point.x, point.upper));
      for (let index = this.points.length - 1; index >= 0; index--) context.lineTo(this.points[index].x, this.points[index].lower);
      context.closePath(); context.fill(); context.restore();
    });
  }
}
