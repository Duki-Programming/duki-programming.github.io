export function positionReturnContext(data, exchange, position, quantity = position?.size) {
  const futures = data?.market === 'futures' || position && position.side !== 'spot';
  if (futures && exchange === 'bitget') {
    const margin = position?.positionMargin > 0 && position.size > 0 && quantity > 0 ? position.positionMargin * quantity / position.size : null;
    return { percentBasis: 'margin', roiBase: margin, roePercent: position?.roePercent, roeSource: position?.roeSource, markPrice: position?.markPrice, priceSource: 'exchange' };
  }
  const wallet = data?.performance?.walletBalance ?? data?.balances?.find(b => b.coin === data.currency)?.walletBalance;
  return { percentBasis: futures ? 'wallet' : 'entry', roiBase: wallet > 0 ? wallet : null };
}

export function returnDescription(item) {
  if (item.percentBasis === 'margin') return item.kind === 'entry' && item.roeSource === 'exchange' ? 'Bitget ROE · Exchange profitRate' : 'ROE = Exchange PnL / Position margin × 100';
  return item.percentBasis === 'wallet' ? 'ROI = PnL / Wallet balance × 100' : '% = PnL / entry cost × 100';
}
