import { exchangeSymbol } from '../trading/symbols.mjs';
import { number } from '../trading/model.mjs';

const numeric = fields => Object.fromEntries(Object.entries(fields).filter(([, value]) => number(value) !== null).map(([key, value]) => [key, Number(value)]));
const ratioChange = (last, open) => number(last) !== null && +open > 0 ? (+last / +open - 1) * 100 : undefined;

export function marketStream(instrument, settings) {
  const exchange = settings.cryptoExchange || 'binance', futures = settings.cryptoMarket === 'futures';
  const symbol = exchangeSymbol(exchange, instrument.symbol, settings.cryptoMarket);
  const specs = {
    binance: { url: `${futures ? 'wss://fstream.binance.com' : 'wss://data-stream.binance.vision'}/stream?streams=${symbol.toLowerCase()}@ticker/${symbol.toLowerCase()}@kline_${settings.interval}` },
    bitget: { url: 'wss://ws.bitget.com/v3/ws/public', subscribe: { op: 'subscribe', args: [{ instType: futures ? 'usdt-futures' : 'spot', topic: 'ticker', symbol }] }, heartbeat: 'ping' },
    bybit: { url: `wss://stream.bybit.com/v5/public/${futures ? 'linear' : 'spot'}`, subscribe: { op: 'subscribe', args: [`tickers.${symbol}`] }, heartbeat: JSON.stringify({ op: 'ping' }) },
    okx: { url: 'wss://ws.okx.com:8443/ws/v5/public', subscribe: { op: 'subscribe', args: [{ channel: 'tickers', instId: symbol }] }, heartbeat: 'ping' },
    upbit: { url: 'wss://api.upbit.com/websocket/v1', subscribe: [{ ticket: 'market-peek' }, { type: 'ticker', codes: [symbol] }, { format: 'DEFAULT' }] },
  };
  const spec = specs[exchange];
  if (!spec) throw new Error('지원하지 않는 차트 거래소입니다.');
  return { ...spec, parse(raw) {
    if (raw === 'pong' || raw === 'ping') return null;
    const message = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (exchange === 'binance') {
      const data = message.data;
      if (data?.e === '24hrTicker' && (!data.s || data.s === symbol)) return { quote: numeric({ price: data.c, changePercent: data.P, high: data.h, low: data.l, volume: data.v, time: data.E }) };
      if (data?.e === 'kline' && (!data.s || data.s === symbol) && data.k) {
        const k = data.k;
        return { bar: { time: +k.t / 1000, open: +k.o, high: +k.h, low: +k.l, close: +k.c, volume: +k.v } };
      }
    } else if (exchange === 'bitget' && message.arg?.topic === 'ticker' && message.arg.symbol === symbol) {
      const data = message.data?.[0];
      if (data) return { quote: numeric({ price: data.lastPrice, changePercent: number(data.price24hPcnt) === null ? undefined : +data.price24hPcnt * 100, high: data.highPrice24h, low: data.lowPrice24h, volume: data.volume24h, time: message.ts }) };
    } else if (exchange === 'bybit' && message.topic === `tickers.${symbol}`) {
      const data = Array.isArray(message.data) ? message.data[0] : message.data;
      if (data) return { quote: numeric({ price: data.lastPrice, changePercent: number(data.price24hPcnt) === null ? undefined : +data.price24hPcnt * 100, high: data.highPrice24h, low: data.lowPrice24h, volume: data.volume24h, time: message.ts }) };
    } else if (exchange === 'okx' && message.arg?.channel === 'tickers' && message.arg.instId === symbol) {
      const data = message.data?.[0];
      if (data) return { quote: numeric({ price: data.last, changePercent: ratioChange(data.last, data.open24h), high: data.high24h, low: data.low24h, volume: futures ? data.volCcy24h : data.vol24h, time: data.ts }) };
    } else if (exchange === 'upbit' && message.type === 'ticker' && message.code === symbol) {
      return { quote: numeric({ price: message.trade_price, changePercent: number(message.signed_change_rate) === null ? undefined : +message.signed_change_rate * 100, high: message.high_price, low: message.low_price, volume: message.acc_trade_volume_24h, time: message.timestamp }) };
    }
    return null;
  } };
}
