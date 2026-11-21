import { formatLabelAmount, number, positive } from './model.mjs';
import { formatPositionSize } from './position-size.mjs';
export function lineLabelContent(item, markPrice) {
  const direction = item.side === 'short' ? -1 : 1;
  const quantity = positive(item.quantity);
  let pnl = number(item.unrealizedPnl), percent = null;
  const entry = positive(item.entryPrice);
  // A connected exchange's PnL/mark must not be replaced by another chart's price.
  if (!(item.kind === 'entry' && pnl !== null) && entry && quantity) {
    const reference = item.kind === 'entry' ? positive(item.markPrice) || (item.priceSource === 'exchange' ? null : positive(markPrice)) : positive(item.price);
    if (reference) pnl = (reference - entry) * quantity * direction;
  }
  const denominator = ['wallet', 'margin'].includes(item.percentBasis) ? positive(item.roiBase) : entry && quantity ? entry * quantity : null;
  if (pnl !== null && denominator) percent = pnl / denominator * 100;
  if (item.kind === 'entry' && item.percentBasis === 'margin' && number(item.roePercent) !== null) percent = number(item.roePercent);
  const signed = value => `${value > 0 ? '+' : ''}${formatLabelAmount(value)}`;
  return {
    quantity: quantity ? formatPositionSize(quantity, item.unitPrice || item.entryPrice || item.price, item.symbol || item.baseCurrency || '', item.positionUnit, direction < 0, true) : '',
    detail: pnl === null ? percent === null ? '' : `${signed(percent)}%` : `${signed(pnl)} ${item.currency || 'USDT'}${percent === null ? '' : ` (${signed(percent)}%)`}`,
    pnl, percent,
  };
}
