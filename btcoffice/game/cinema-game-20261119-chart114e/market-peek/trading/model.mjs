import { canonicalSymbol, parseCryptoSymbol, sameCryptoSymbol } from './symbols.mjs';
import { orderPositionSide, isClosingOrder, orderTriggerKind } from './order-side.mjs';
import { positionReturnContext } from './position-return.mjs';

export const EXCHANGES = [
  { id: 'binance', name: 'Binance' },
  { id: 'bitget', name: 'Bitget', passphrase: true },
  { id: 'bybit', name: 'Bybit' },
  { id: 'upbit', name: 'Upbit', spotOnly: true },
  { id: 'okx', name: 'OKX', passphrase: true },
];

export const accountMarkets = exchange => EXCHANGES.find(e => e.id === exchange)?.spotOnly ? ['spot'] : ['spot', 'futures'];

export const number = value => value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
export const positive = value => number(value) > 0 ? number(value) : null;
export const baseCoin = symbol => parseCryptoSymbol(symbol)?.base || symbol;
export const formatAmount = (value, digits = 6) => Number.isFinite(value) ? value.toLocaleString('en-US', { maximumFractionDigits: digits }) : '—';
export const formatTruncatedAmount = (value, digits = 1) => Number.isFinite(value) ? value.toLocaleString('en-US', { maximumFractionDigits: digits, roundingMode: 'trunc' }) : '—';
// Compact labels must not turn a small non-zero holding into a displayed zero.
export const formatLabelAmount = value => Number.isFinite(value) && value !== 0 && Math.abs(value) < .1 ? `${value < 0 ? '−' : ''}<0.1` : formatAmount(value, 1);

export function position(data) {
  return { ...data, symbol: canonicalSymbol(data.symbol) || data.symbol, exchangeSymbol: data.exchangeSymbol || data.symbol, size: Math.abs(number(data.size) || 0), entryPrice: positive(data.entryPrice), markPrice: positive(data.markPrice), liquidationPrice: positive(data.liquidationPrice), unrealizedPnl: number(data.unrealizedPnl), leverage: positive(data.leverage) };
}

export function order(data) {
  return { ...data, symbol: canonicalSymbol(data.symbol) || data.symbol, exchangeSymbol: data.exchangeSymbol || data.symbol, price: positive(data.price), triggerPrice: positive(data.triggerPrice), takeProfit: positive(data.takeProfit), stopLoss: positive(data.stopLoss), takeProfitLimit: positive(data.takeProfitLimit), stopLossLimit: positive(data.stopLossLimit), size: positive(data.size) };
}

// Only matching instrument/mode/currency data may be plotted on the exchange chart.
// KRW holdings remain visible in the panel, without inventing an entry FX rate.
export function accountLines(accounts, symbol, market, positionUnit = 'coin', chartCurrency = 'USDT') {
  const lines = [];
  for (const account of accounts) {
    if (!account.data || !sameCryptoSymbol(account.data.symbol, symbol) || account.data.market !== market) continue;
    const { data } = account, name = EXCHANGES.find(e => e.id === account.exchange)?.name || account.exchange;
    if (data.currency !== chartCurrency) continue;
    const add = (price, label, kind, side, detail = {}) => {
      if (positive(price)) lines.push({ ...detail, unitPrice: kind === 'entry' ? detail.entryPrice : price, id: `${account.exchange}:${symbol}:${market}:${detail.id || label}:${label}`, price, label, title: `${name} ${label}${account.error ? ' · stale' : ''}`, kind, side, currency: data.currency, symbol, positionUnit: chartCurrency === 'USDT' ? positionUnit : 'coin' });
    };
    for (const p of data.positions) {
      if (p.symbol && !sameCryptoSymbol(p.symbol, symbol)) continue;
      const side = p.side === 'short' ? 'Short' : p.side === 'spot' ? 'Spot' : 'Long';
      const detail = { ...positionReturnContext(data, account.exchange, p), id: `position:${p.side}`, quantity: p.size, entryPrice: p.entryPrice, unrealizedPnl: p.unrealizedPnl };
      add(p.entryPrice, side, 'entry', p.side, detail);
      add(p.liquidationPrice, `${side} Liq`, 'liquidation', p.side, detail);
      add(p.takeProfit, `${side} TP`, 'tp', p.side, detail);
      add(p.stopLoss, `${side} SL`, 'sl', p.side, detail);
    }
    for (const [index, o] of data.orders.entries()) {
      if (o.symbol && !sameCryptoSymbol(o.symbol, symbol)) continue;
      const triggerKind = orderTriggerKind(o);
      const positionSide = market === 'spot' ? 'spot' : orderPositionSide(o, triggerKind);
      const side = positionSide === 'short' ? 'Short' : positionSide === 'spot' ? 'Spot' : 'Long';
      const reference = data.positions.find(p => p.side === positionSide);
      const closes = isClosingOrder(o, triggerKind);
      const detail = { ...positionReturnContext(data, account.exchange, reference, o.size), id: `order:${o.id || index}`, orderSide: o.side, quantity: o.size, entryPrice: closes ? reference?.entryPrice : null };
      add(o.triggerPrice, `${side} ${triggerKind === 'tp' ? 'TP' : triggerKind === 'sl' ? 'SL' : 'Stop'}`, triggerKind, positionSide, detail);
      add(o.price, `${o.side === 'sell' ? 'Sell' : 'Buy'} Limit`, 'limit', positionSide, detail);
      // Attached TP/SL on an unfilled entry order are not active protections yet.
      const attached = { ...detail, entryPrice: positive(o.price) || (closes ? reference?.entryPrice : null) };
      add(o.takeProfit, `${side} TP`, 'tp', positionSide, attached);
      add(o.stopLoss, `${side} SL`, 'sl', positionSide, attached);
      add(o.takeProfitLimit, `${side} TP Limit`, 'limit', positionSide, attached);
      add(o.stopLossLimit, `${side} SL Limit`, 'limit', positionSide, attached);
    }
  }
  return lines;
}

export function buildOrderDraft({ exchange, symbol, market, action, side, type, quantity, price, triggerPrice, takeProfit, stopLoss, leverage, marginMode }) {
  if (!EXCHANGES.some(e => e.id === exchange) || !/^[A-Z0-9]{2,20}USDT$/.test(symbol) || !['spot', 'futures'].includes(market)) throw new Error('거래소와 코인 종목을 선택해 주세요.');
  if (exchange === 'upbit' && market !== 'spot') throw new Error('Upbit는 현물만 지원합니다.');
  if (!['open', 'close'].includes(action) || !['buy', 'sell'].includes(side) || !['limit', 'market', 'stop-limit'].includes(type)) throw new Error('주문 구분을 확인해 주세요.');
  if (!positive(quantity)) throw new Error('수량은 0보다 커야 합니다.');
  if (type !== 'market' && !positive(price)) throw new Error('주문 가격을 입력해 주세요.');
  if (type === 'stop-limit' && !positive(triggerPrice)) throw new Error('스톱 발동 가격을 입력해 주세요.');
  for (const [label, value] of [['익절', takeProfit], ['손절', stopLoss]]) if (value !== '' && value != null && !positive(value)) throw new Error(`${label} 가격은 0보다 커야 합니다.`);
  const reference = type === 'market' ? null : positive(price);
  const direction = side === 'buy' ? 1 : -1;
  if (action === 'open' && reference) {
    if (positive(takeProfit) && (positive(takeProfit) - reference) * direction <= 0) throw new Error('익절 가격의 방향을 확인해 주세요.');
    if (positive(stopLoss) && (positive(stopLoss) - reference) * direction >= 0) throw new Error('손절 가격의 방향을 확인해 주세요.');
  }
  const lev = market === 'spot' ? 1 : number(leverage);
  if (!Number.isInteger(lev) || lev < 1 || lev > 1000) throw new Error('거래소에서 허용한 레버리지 범위의 정수를 입력해 주세요.');
  if (!['cross', 'isolated'].includes(marginMode)) throw new Error('증거금 모드를 확인해 주세요.');
  return { exchange, symbol, market, action, side, type, quantity: positive(quantity), price: reference, triggerPrice: type === 'stop-limit' ? positive(triggerPrice) : null, takeProfit: positive(takeProfit), stopLoss: positive(stopLoss), leverage: lev, marginMode, currency: exchange === 'upbit' ? 'KRW' : 'USDT' };
}
