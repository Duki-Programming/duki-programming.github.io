import { appearanceDefaults, normalizeAppearance } from './indicator-appearance.mjs';

const period = (value = 14) => ({ key: 'period', label: '기간', value, min: 2, max: 200, step: 1 });
export const INDICATORS = [
  { id: 'bb', name: '볼린저밴드', short: 'BB', placement: 'overlay', description: '이동평균과 변동성 범위', params: [period(20), { key: 'deviation', label: '표준편차 배수', value: 2, min: .1, max: 5, step: .1 }] },
  { id: 'sma', name: '단순 이동평균', short: 'SMA', placement: 'overlay', description: '종가의 단순 평균', params: [period(20)] },
  { id: 'ema', name: '지수 이동평균', short: 'EMA', placement: 'overlay', description: '최근 가격에 더 큰 비중', params: [period(20)] },
  { id: 'mfi', name: '자금흐름지수', short: 'MFI', placement: 'pane', description: '가격과 거래량의 흐름', params: [period()] },
  { id: 'rsi', name: '상대강도지수', short: 'RSI', placement: 'pane', description: '상승과 하락의 상대 강도', params: [period()] },
  { id: 'macd', name: '이동평균 수렴·확산', short: 'MACD', placement: 'pane', description: 'MACD · 시그널 · 히스토그램', params: [{ ...period(12), key: 'fast', label: '단기', max: 100 }, { ...period(26), key: 'slow', label: '장기', min: 3 }, { ...period(9), key: 'signal', label: '시그널' }] },
  { id: 'stoch', name: '스토캐스틱', short: 'STOCH', placement: 'pane', description: 'Slow %K · %D', params: [{ ...period(), label: '%K 기간' }, { ...period(3), key: 'smooth', label: '%K 평활', min: 1, max: 50 }, { ...period(3), key: 'signal', label: '%D 기간', min: 1, max: 50 }] },
  { id: 'atr', name: '평균 진폭', short: 'ATR', placement: 'pane', description: 'Wilder 방식의 가격 변동폭', params: [period()] },
  { id: 'cci', name: '상품채널지수', short: 'CCI', placement: 'pane', description: '평균 가격으로부터의 이격 · HLC3', params: [period(20)] },
  { id: 'obv', name: '누적 거래량', short: 'OBV', placement: 'pane', description: '상승·하락에 따른 거래량 누적', params: [] },
];

export function indicatorDefaults() {
  return Object.fromEntries(INDICATORS.map(spec => [spec.id, { enabled: spec.id === 'mfi', hidden: false, ...Object.fromEntries(spec.params.map(p => [p.key, p.value])), ...appearanceDefaults(spec.id) }]));
}

export function normalizeIndicators(raw, legacy = {}) {
  const result = indicatorDefaults();
  // Upgrade the original single-indicator settings without losing the user's choice.
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    if (['mfi', 'rsi', 'none'].includes(legacy.indicator)) {
      result.mfi.enabled = legacy.indicator === 'mfi';
      result.rsi.enabled = legacy.indicator === 'rsi';
    }
    if (Number.isInteger(legacy.indicatorPeriod)) result[legacy.indicator === 'rsi' ? 'rsi' : 'mfi'].period = Math.max(2, Math.min(50, legacy.indicatorPeriod));
    return result;
  }
  for (const spec of INDICATORS) {
    const value = raw[spec.id];
    if (!value || typeof value !== 'object') continue;
    if (typeof value.enabled === 'boolean') result[spec.id].enabled = value.enabled;
    if (typeof value.hidden === 'boolean') result[spec.id].hidden = value.hidden;
    Object.assign(result[spec.id], normalizeAppearance(spec.id, value));
    for (const p of spec.params) {
      if (Number.isFinite(value[p.key])) result[spec.id][p.key] = Number((Math.round(Math.max(p.min, Math.min(p.max, value[p.key])) / p.step) * p.step).toFixed(6));
    }
  }
  result.macd.slow = Math.max(result.macd.fast + 1, result.macd.slow);
  return result;
}

export function indicatorTitle(spec, config) {
  return `${spec.short}${spec.params.length ? ` (${spec.params.map(p => config[p.key]).join(', ')})` : ''}`;
}

const point = (time, value) => ({ time, value });
const closes = bars => bars.map(b => point(b.time, b.close));
const typical = b => (b.high + b.low + b.close) / 3;
function checkPeriod(period, min = 1) {
  if (!Number.isInteger(period) || period < min) throw new Error('Invalid indicator period');
}

export function simpleMovingAverage(values, period) {
  checkPeriod(period);
  const result = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i].value;
    if (i >= period) sum -= values[i - period].value;
    if (i >= period - 1) result.push(point(values[i].time, sum / period));
  }
  return result;
}

export function exponentialMovingAverage(values, period, alpha = 2 / (period + 1)) {
  checkPeriod(period);
  if (values.length < period) return [];
  let average = values.slice(0, period).reduce((sum, p) => sum + p.value, 0) / period;
  const result = [point(values[period - 1].time, average)];
  for (let i = period; i < values.length; i++) {
    average += alpha * (values[i].value - average);
    result.push(point(values[i].time, average));
  }
  return result;
}

export function bollingerBands(bars, period = 20, deviation = 2) {
  const values = closes(bars), middle = simpleMovingAverage(values, period), upper = [], lower = [];
  for (let i = period - 1; i < bars.length; i++) {
    const mean = middle[i - period + 1].value;
    // Center before squaring to avoid cancellation on high-price, low-volatility data.
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) variance += (values[j].value - mean) ** 2;
    const width = deviation * Math.sqrt(variance / period);
    upper.push(point(bars[i].time, mean + width)); lower.push(point(bars[i].time, mean - width));
  }
  return { middle, upper, lower };
}

export function moneyFlowIndex(bars, period = 14) {
  checkPeriod(period, 2);
  if (!bars.some(b => b.volume > 0)) return [];
  const result = [], positive = [], negative = [];
  let pos = 0, neg = 0;
  for (let i = 1; i < bars.length; i++) {
    const price = typical(bars[i]), old = typical(bars[i - 1]), flow = price * bars[i].volume;
    positive.push(price > old ? flow : 0); negative.push(price < old ? flow : 0);
    pos += positive.at(-1); neg += negative.at(-1);
    if (i > period) { pos -= positive[i - period - 1]; neg -= negative[i - period - 1]; }
    if (i >= period) {
      const total = Math.max(0, pos) + Math.max(0, neg);
      result.push(point(bars[i].time, total === 0 ? 50 : 100 * Math.max(0, pos) / total));
    }
  }
  return result;
}

export function relativeStrengthIndex(bars, period = 14) {
  checkPeriod(period, 2);
  const result = [];
  let gain = 0, loss = 0;
  for (let i = 1; i < bars.length; i++) {
    const delta = bars[i].close - bars[i - 1].close;
    if (i <= period) { gain += Math.max(0, delta) / period; loss += Math.max(0, -delta) / period; }
    else { gain = (gain * (period - 1) + Math.max(0, delta)) / period; loss = (loss * (period - 1) + Math.max(0, -delta)) / period; }
    if (i >= period) result.push(point(bars[i].time, gain + loss === 0 ? 50 : 100 * gain / (gain + loss)));
  }
  return result;
}

export function macd(bars, fast = 12, slow = 26, signal = 9) {
  const values = closes(bars), quick = new Map(exponentialMovingAverage(values, fast).map(p => [p.time, p.value]));
  const line = exponentialMovingAverage(values, slow).filter(p => quick.has(p.time)).map(p => point(p.time, quick.get(p.time) - p.value));
  const signalLine = exponentialMovingAverage(line, signal), byTime = new Map(line.map(p => [p.time, p.value]));
  return { macd: line, signal: signalLine, histogram: signalLine.map(p => point(p.time, byTime.get(p.time) - p.value)) };
}

export function stochastic(bars, period = 14, smooth = 3, signal = 3) {
  checkPeriod(period);
  const raw = [];
  for (let i = period - 1; i < bars.length; i++) {
    let high = -Infinity, low = Infinity;
    for (let j = i - period + 1; j <= i; j++) { high = Math.max(high, bars[j].high); low = Math.min(low, bars[j].low); }
    raw.push(point(bars[i].time, high === low ? 50 : 100 * (bars[i].close - low) / (high - low)));
  }
  const k = simpleMovingAverage(raw, smooth);
  return { k, d: simpleMovingAverage(k, signal) };
}

export function averageTrueRange(bars, period = 14) {
  return exponentialMovingAverage(bars.map((b, i) => point(b.time, i ? Math.max(b.high - b.low, Math.abs(b.high - bars[i - 1].close), Math.abs(b.low - bars[i - 1].close)) : b.high - b.low)), period, 1 / period);
}

export function commodityChannelIndex(bars, period = 20) {
  const values = bars.map(b => point(b.time, typical(b))), average = simpleMovingAverage(values, period), result = [];
  for (let i = period - 1; i < bars.length; i++) {
    const mean = average[i - period + 1].value;
    let deviation = 0;
    for (let j = i - period + 1; j <= i; j++) deviation += Math.abs(values[j].value - mean) / period;
    result.push(point(bars[i].time, deviation === 0 ? 0 : (values[i].value - mean) / (.015 * deviation)));
  }
  return result;
}

export function onBalanceVolume(bars) {
  if (!bars.some(b => b.volume > 0)) return [];
  let total = 0;
  return bars.map((b, i) => {
    if (i) total += Math.sign(b.close - bars[i - 1].close) * b.volume;
    return point(b.time, total);
  });
}

export function calculateIndicator(id, bars, config) {
  switch (id) {
    case 'bb': return bollingerBands(bars, config.period, config.deviation);
    case 'sma': return { value: simpleMovingAverage(closes(bars), config.period) };
    case 'ema': return { value: exponentialMovingAverage(closes(bars), config.period) };
    case 'mfi': return { value: moneyFlowIndex(bars, config.period) };
    case 'rsi': return { value: relativeStrengthIndex(bars, config.period) };
    case 'macd': return macd(bars, config.fast, config.slow, config.signal);
    case 'stoch': return stochastic(bars, config.period, config.smooth, config.signal);
    case 'atr': return { value: averageTrueRange(bars, config.period) };
    case 'cci': return { value: commodityChannelIndex(bars, config.period) };
    case 'obv': return { value: onBalanceVolume(bars) };
    default: throw new Error(`Unknown indicator: ${id}`);
  }
}
