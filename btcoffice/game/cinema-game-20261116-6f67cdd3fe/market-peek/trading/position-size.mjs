import { baseCoin, formatAmount, formatLabelAmount, positive } from './model.mjs';

export function formatPositionSize(quantity, price, symbol, unit = 'coin', negative = false, compact = false) {
  const size = positive(quantity), sign = negative ? '−' : '';
  if (unit === 'usdt') return `${size && positive(price) ? sign + (compact ? formatLabelAmount(size * price) : formatAmount(size * price, size * price < 1 ? 6 : 2)) : '—'} USDT`;
  return `${size ? sign + (compact ? formatLabelAmount(size) : formatAmount(size, 8)) : '—'} ${baseCoin(symbol || '')}`.trim();
}
