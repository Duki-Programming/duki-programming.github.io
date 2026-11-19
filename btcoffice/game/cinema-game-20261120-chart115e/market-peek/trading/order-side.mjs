export function isClosingOrder(order, kind) {
  const positionSide = String(order.positionSide || '').toLowerCase();
  return order.reduceOnly === true || /^(true|yes)$/i.test(String(order.reduceOnly)) || order.closePosition === true || /^(true|yes)$/i.test(String(order.closePosition)) || order.tradeSide === 'close' || ['tp', 'sl'].includes(kind) || (positionSide === 'long' && order.side === 'sell') || (positionSide === 'short' && order.side === 'buy');
}

export function orderTriggerKind(order) {
  const type = String(order.type || '').toUpperCase();
  if (/TAKE_?PROFIT/.test(type)) return 'tp';
  if (/STOP_?LOSS/.test(type) || (/^STOP(?:_LIMIT|_MARKET)?$/.test(type) && isClosingOrder(order))) return 'sl';
  return 'trigger';
}

export function orderPositionSide(order, kind) {
  const explicit = String(order.positionSide || '').toLowerCase();
  if (['long', 'short', 'spot'].includes(explicit)) return explicit;
  const closes = isClosingOrder(order, kind);
  return order.side === 'sell' ? (closes ? 'long' : 'short') : (closes ? 'short' : 'long');
}
