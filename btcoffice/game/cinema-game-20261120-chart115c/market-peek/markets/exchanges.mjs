export const CRYPTO_EXCHANGES = [
  { id: 'binance', name: 'Binance' }, { id: 'bitget', name: 'Bitget' },
  { id: 'bybit', name: 'Bybit' }, { id: 'upbit', name: 'Upbit', spotOnly: true }, { id: 'okx', name: 'OKX' },
];
export const cryptoExchange = value => CRYPTO_EXCHANGES.find(exchange => exchange.id === value);
export const quoteCurrency = settings => settings.instrument.market === 'crypto' && settings.cryptoExchange === 'upbit' ? 'KRW' : settings.instrument.currency;
export const BYBIT_INTERVALS = { '5m': '5', '15m': '15', '1h': '60', '2h': '120', '4h': '240', '1d': 'D', '1w': 'W' };
export const BITGET_INTERVALS = { '5m': '5m', '15m': '15m', '1h': '1H', '2h': '1H', '4h': '4H', '1d': '1D', '1w': '1D' };
export const OKX_INTERVALS = { '5m': '5m', '15m': '15m', '1h': '1H', '2h': '2H', '4h': '4H', '1d': '1Dutc', '1w': '1Wutc' };

export function aggregateCryptoBars(bars, interval) {
  const seconds = interval === '2h' ? 7200 : interval === '1w' ? 604800 : null;
  if (!seconds) return bars;
  const anchor = interval === '1w' ? 345600 : 0; // Monday 00:00 UTC.
  const buckets = new Map();
  for (const bar of [...bars].sort((a, b) => a.time - b.time)) {
    const time = Math.floor((bar.time - anchor) / seconds) * seconds + anchor, old = buckets.get(time);
    if (old) { old.high = Math.max(old.high, bar.high); old.low = Math.min(old.low, bar.low); old.close = bar.close; old.volume += bar.volume; }
    else buckets.set(time, { ...bar, time });
  }
  const aggregated = [...buckets.values()];
  // A history page may start partway through its oldest bucket.
  if (aggregated.length > 1 && bars.length && Math.min(...bars.map(bar => bar.time)) > aggregated[0].time) aggregated.shift();
  return aggregated;
}
