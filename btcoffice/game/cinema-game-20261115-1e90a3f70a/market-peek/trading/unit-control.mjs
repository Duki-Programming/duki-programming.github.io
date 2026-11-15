export function positionUnitControl(unit, currency) {
  const interactive = currency === 'USDT';
  const control = document.createElement(interactive ? 'button' : 'span');
  control.textContent = unit;
  if (interactive) {
    control.type = 'button';
    control.className = 'position-unit-toggle';
    control.dataset.positionUnit = unit === 'USDT' ? 'coin' : 'usdt';
    control.title = unit === 'USDT' ? '코인 수량으로 표시' : 'USDT 금액으로 표시';
    control.setAttribute('aria-label', `${unit} 수량 단위 전환`);
  }
  return control;
}
