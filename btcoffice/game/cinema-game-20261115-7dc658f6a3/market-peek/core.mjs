import { indicatorDefaults, normalizeIndicators } from './indicators.mjs';
import { normalizeWindowSize } from './window/geometry.mjs';
import { cryptoExchange } from './markets/exchanges.mjs';
import { normalizeLanguage } from './i18n.mjs';
export { translate } from './i18n.mjs';
export { normalizeWindowSize, WINDOW_LIMITS, applyWindowLimits, expandedMinimumHeight, rememberWindowGeometry, windowPosition } from './window/geometry.mjs';
export { moneyFlowIndex, relativeStrengthIndex } from './indicators.mjs';

export const INTERVALS = [['5m', '5분'], ['15m', '15분'], ['1h', '1시간'], ['2h', '2시간'], ['4h', '4시간'], ['1d', '일봉'], ['1w', '주봉']];
export const CATALOG = [
  ['crypto', 'BTCUSDT', '비트코인', 'BTC', 'USDT'],
  ['crypto', 'ETHUSDT', '이더리움', 'ETH', 'USDT'],
  ['crypto', 'SOLUSDT', '솔라나', 'SOL', 'USDT'],
  ['crypto', 'XRPUSDT', '리플', 'XRP', 'USDT'],
  ['crypto', 'DOGEUSDT', '도지코인', 'DOGE', 'USDT'],
  ['crypto', 'BNBUSDT', '비앤비', 'BNB', 'USDT'],
  ['us', 'NVDA', '엔비디아', 'NVDA', 'USD'],
  ['us', 'AAPL', '애플', 'AAPL', 'USD'],
  ['us', 'TSLA', '테슬라', 'TSLA', 'USD'],
  ['us', 'MSFT', '마이크로소프트', 'MSFT', 'USD'],
  ['us', 'GOOGL', '알파벳', 'GOOGL', 'USD'],
  ['us', 'AMZN', '아마존', 'AMZN', 'USD'],
  ['us', 'SPY', 'S&P 500 ETF', 'SPY', 'USD'],
  ['us', 'QQQ', '나스닥 100 ETF', 'QQQ', 'USD'],
  ['kr', '005930.KS', '삼성전자', '005930', 'KRW'],
  ['kr', '000660.KS', 'SK하이닉스', '000660', 'KRW'],
  ['kr', '373220.KS', 'LG에너지솔루션', '373220', 'KRW'],
  ['kr', '005380.KS', '현대차', '005380', 'KRW'],
  ['kr', '035420.KS', 'NAVER', '035420', 'KRW'],
  ['kr', '035720.KS', '카카오', '035720', 'KRW'],
  ['kr', '086520.KQ', '에코프로', '086520', 'KRW'],
  ['kr', '247540.KQ', '에코프로비엠', '247540', 'KRW'],
].map(([market, symbol, name, short, currency]) => ({ id: `${market}:${symbol}`, market, symbol, name, short, currency }));

export const DEFAULTS = {
  instrument: CATALOG[0], interval: '15m', favorites: [CATALOG[0], CATALOG[1], CATALOG[6], CATALOG[8], CATALOG[14]],
  alwaysOnTop: true, lockPosition: false, showCompactPositions: true, showTaskbarPrice: false, opacity: 1, shortcut: 'Alt+H',
  launchAtLogin: false, cryptoMarket: 'spot', cryptoExchange: 'binance', stockRefresh: 30, indicators: indicatorDefaults(),
  showVolume: true, positionUnit: 'coin', spotMinValueUsdt: 1, theme: 'dark', language: 'ko', timezone: 'Asia/Seoul', bounds: null,
  compactSize: { width: 352, height: 104 }, expandedSize: { width: 860, height: 680 },
  compactBounds: null,
};

export function validInstrument(a) {
  if (!a || !['crypto', 'us', 'kr'].includes(a.market) || typeof a.symbol !== 'string') return false;
  const valid = a.market === 'crypto' ? /^[A-Z0-9]{2,20}USDT$/.test(a.symbol)
    : a.market === 'kr' ? /^[A-Z0-9]{6}\.(KS|KQ)$/.test(a.symbol) : /^[A-Z][A-Z0-9.^=-]{0,14}$/.test(a.symbol);
  return valid && a.id === `${a.market}:${a.symbol}` && typeof a.name === 'string' && a.name.length <= 100
    && typeof a.short === 'string' && a.short.length <= 24 && ['USDT', 'USD', 'KRW'].includes(a.currency);
}

export function normalizeSettings(raw = {}) {
  const s = structuredClone(DEFAULTS);
  if (!raw || typeof raw !== 'object') return s;
  for (const k of ['alwaysOnTop', 'lockPosition', 'showCompactPositions', 'showTaskbarPrice', 'launchAtLogin', 'showVolume']) if (typeof raw[k] === 'boolean') s[k] = raw[k];
  if (validInstrument(raw.instrument)) s.instrument = raw.instrument;
  if (Array.isArray(raw.favorites)) s.favorites = [...new Map(raw.favorites.filter(validInstrument).map(a => [a.id, a])).values()].slice(0, 30);
  if (INTERVALS.some(([id]) => id === raw.interval)) s.interval = raw.interval;
  if (['spot', 'futures'].includes(raw.cryptoMarket)) s.cryptoMarket = raw.cryptoMarket;
  if (cryptoExchange(raw.cryptoExchange)) s.cryptoExchange = raw.cryptoExchange;
  if (s.cryptoExchange === 'upbit') s.cryptoMarket = 'spot';
  if (['coin', 'usdt'].includes(raw.positionUnit)) s.positionUnit = raw.positionUnit;
  if (Number.isFinite(raw.spotMinValueUsdt)) s.spotMinValueUsdt = Math.max(0, Math.min(1000000000, raw.spotMinValueUsdt));
  s.indicators = normalizeIndicators(raw.indicators, raw);
  if (['dark', 'light'].includes(raw.theme)) s.theme = raw.theme;
  s.language = normalizeLanguage(raw.language);
  if (['Asia/Seoul', 'UTC', 'America/New_York'].includes(raw.timezone)) s.timezone = raw.timezone;
  if (Number.isFinite(raw.opacity)) s.opacity = Math.min(1, Math.max(0.5, raw.opacity));
  if ([15, 30, 60].includes(raw.stockRefresh)) s.stockRefresh = raw.stockRefresh;
  const shortcut = normalizeShortcut(raw.shortcut);
  if (shortcut) s.shortcut = shortcut;
  if (raw.bounds && ['x', 'y'].every(k => Number.isFinite(raw.bounds[k]))) s.bounds = { x: Math.round(raw.bounds.x), y: Math.round(raw.bounds.y) };
  for (const key of ['compactBounds']) {
    if (raw[key] && ['x', 'y'].every(k => Number.isFinite(raw[key][k]))) s[key] = { x: Math.round(raw[key].x), y: Math.round(raw[key].y) };
  }
  s.compactBounds ||= s.bounds;
  for (const key of ['compactSize', 'expandedSize']) {
    if (raw[key] && Number.isFinite(raw[key].width) && Number.isFinite(raw[key].height)) s[key] = normalizeWindowSize(raw[key], key === 'expandedSize');
  }
  return s;
}

export function normalizeShortcut(value) {
  if (typeof value !== 'string' || value.length > 80 || !/^(?:(?:CommandOrControl|Ctrl|Control|Alt|Shift|Super)\+)+(?:[A-Z0-9]|F(?:[1-9]|1[0-9]|2[0-4]))$/.test(value)) return null;
  const parts = value.split('+'), key = parts.pop();
  const modifiers = new Set(parts.map(p => ['Ctrl', 'Control'].includes(p) ? 'CommandOrControl' : p));
  return [...['CommandOrControl', 'Alt', 'Shift', 'Super'].filter(p => modifiers.has(p)), key].join('+');
}

export function cleanBars(bars) {
  return [...new Map(bars.filter(b => ['time', 'open', 'high', 'low', 'close'].every(k => Number.isFinite(b[k]))
    && b.time > 0 && b.high >= Math.max(b.open, b.close) && b.low <= Math.min(b.open, b.close))
    .map(b => [b.time, { ...b, volume: Number.isFinite(b.volume) ? Math.max(0, b.volume) : 0 }])).values()].sort((a, b) => a.time - b.time);
}

// Aggregate within each exchange-local trading session; never join two days or DST boundaries.
export function aggregateSessionBars(bars, hours, timezone = 'America/New_York') {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const buckets = new Map();
  for (const b of bars) {
    const p = Object.fromEntries(fmt.formatToParts(new Date(b.time * 1000)).map(v => [v.type, v.value]));
    const openMinute = timezone === 'Asia/Seoul' ? 540 : 570;
    const bucket = Math.floor((Number(p.hour) * 60 + Number(p.minute) - openMinute) / (hours * 60));
    const key = `${p.year}-${p.month}-${p.day}:${bucket}`;
    const old = buckets.get(key);
    if (old) { old.high = Math.max(old.high, b.high); old.low = Math.min(old.low, b.low); old.close = b.close; old.volume += b.volume; }
    else buckets.set(key, { ...b });
  }
  return [...buckets.values()];
}

export function fitBounds(bounds, area, size) {
  const width = Math.min(size.width, area.width), height = Math.min(size.height, area.height);
  return { width, height, x: Math.round(Math.max(area.x, Math.min(bounds.x, area.x + area.width - width))), y: Math.round(Math.max(area.y, Math.min(bounds.y, area.y + area.height - height))) };
}

export function dataKey(instrument, interval, cryptoMarket, exchange = 'binance') { return `${instrument.id}:${interval}:${instrument.market === 'crypto' ? `${exchange}:${cryptoMarket}` : 'stock'}`; }
