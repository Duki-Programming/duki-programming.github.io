// Canonical pair identity is separate from the exchange's instrument spelling.
// Quotes and settlement currencies are retained: BTCUSD is never BTCUSDT.
export function parseCryptoSymbol(value) {
  if (typeof value !== 'string') return null;
  let symbol = value.trim().toUpperCase();
  if (symbol.length > 80) return null;
  const prefix = symbol.match(/^(BINANCE|BITGET|BYBIT|UPBIT|OKX):(.+)$/);
  if (prefix) symbol = prefix[2];
  let market = null, settlement = null;
  if (/_UMCBL$/.test(symbol)) { symbol = symbol.slice(0, -6); market = 'futures'; settlement = 'USDT'; }
  else if (/_DMCBL$/.test(symbol)) { symbol = symbol.slice(0, -6); market = 'futures'; }
  else if (/_CMCBL$/.test(symbol)) { symbol = symbol.slice(0, -6); market = 'futures'; settlement = 'USDC'; }
  if (/(?:-SWAP|\.P|PERP)$/.test(symbol)) { symbol = symbol.replace(/(?:-SWAP|\.P|PERP)$/, ''); market = 'futures'; }
  if (symbol.includes(':')) {
    const split = symbol.split(':');
    if (split.length !== 2 || !/^(USDT|USDC|USD|BTC)$/.test(split[1])) return null;
    [symbol, settlement] = split; market = 'futures';
  }
  let base, quote;
  const upbit = symbol.match(/^(KRW|BTC|USDT)-([A-Z0-9]{1,24})$/);
  const separated = symbol.match(/^([A-Z0-9]{1,24})[-/_](USDT|USDC|USD|KRW|BTC)$/);
  const compact = symbol.match(/^([A-Z0-9]{1,24}?)(USDT|USDC|USD|KRW|BTC)$/);
  if (upbit && (['KRW', 'USDT'].includes(upbit[1]) || !/^(USDT|USDC|USD|KRW|BTC)$/.test(upbit[2]))) { [, quote, base] = upbit; market ||= 'spot'; }
  else if (separated) [, base, quote] = separated;
  else if (compact) [, base, quote] = compact;
  else return null;
  if (base === 'XBT') base = 'BTC';
  return { base, quote, symbol: `${base}${quote}`, market, settlement };
}

export function canonicalSymbol(value) { return parseCryptoSymbol(value)?.symbol || null; }

export function sameCryptoSymbol(a, b) {
  const left = parseCryptoSymbol(a), right = parseCryptoSymbol(b);
  if (!left || !right || left.base !== right.base || left.quote !== right.quote) return false;
  if (left.settlement && left.settlement !== left.quote || right.settlement && right.settlement !== right.quote) return false;
  return true;
}

export function exchangeSymbol(exchange, value, market = 'spot') {
  const pair = parseCryptoSymbol(value);
  if (!pair || !['spot', 'futures'].includes(market) || (pair.market && pair.market !== market) || (pair.settlement && pair.settlement !== pair.quote)) throw new Error('거래소 종목과 시장 구분을 확인해 주세요.');
  if (exchange === 'upbit') {
    if (market !== 'spot') throw new Error('Upbit는 현물만 지원합니다.');
    return `KRW-${pair.base}`;
  }
  if (pair.quote !== 'USDT') throw new Error('현재는 USDT 거래쌍을 지원합니다.');
  if (exchange === 'okx') return `${pair.base}-USDT${market === 'futures' ? '-SWAP' : ''}`;
  if (['binance', 'bitget', 'bybit'].includes(exchange)) return `${pair.base}USDT`;
  throw new Error('지원하지 않는 거래소입니다.');
}
