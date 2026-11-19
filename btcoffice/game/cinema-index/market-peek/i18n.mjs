import { EN } from './locales/en.mjs';

export const normalizeLanguage = value => value === 'en' ? 'en' : 'ko';
export const localeFor = language => normalizeLanguage(language) === 'en' ? 'en-US' : 'ko-KR';

// Values stay separate from labels: symbols, amounts and user input are never changed.
const patterns = [
  [/^(BB|SMA|EMA|MFI|RSI|MACD|STOCH|ATR|CCI|OBV) (?!·)(.+)$/, (_, name, label) => {
    const translated = english(label);
    return translated === label ? undefined : `${name} ${translated}`;
  }],
  [/^드래그로 이동 · 더블클릭으로 (.+)$/, (_, action) => `Drag to move · Double-click to ${english(action).toLowerCase()}`],
  [/^트레이로 숨기기 \((.+)\) · 앱은 계속 실행$/, (_, shortcut) => `Hide to tray (${shortcut}) · Keep running`],
  [/^고가·저가: (.+)$/, (_, period) => `High/low: ${english(period)}`],
  [/^최근 24시간 체결 수량 \((.+)\)$/, (_, unit) => `Last 24h traded quantity (${unit})`],
  [/^마지막 시세 (.+)$/, (_, time) => `Last quote ${english(time)}`],
  [/^마지막 조회 (.+)$/, (_, time) => `Last checked ${time}`],
  [/^개발 소스: (.*)$/, (_, path) => `Development source: ${path}`],
  [/^(.+) 즐겨찾기 (추가|해제)$/, (_, name, action) => `${action === '추가' ? 'Add' : 'Remove'} ${english(name)} ${action === '추가' ? 'to' : 'from'} favorites`],
  [/^(\d+)개 종목 · ★를 눌러 즐겨찾기에 추가하세요\.$/, (_, count) => `${count} symbols · Select ★ to add a favorite.`],
  [/^(.+) 수량 단위 전환$/, (_, unit) => `Change quantity unit to ${unit}`],
  [/^(.+) 계정으로 전환$/, (_, name) => `Switch to ${name} account`],
  [/^(.+) 계좌 요약$/, (_, name) => `${name} account summary`],
  [/^(.+) 포지션$/, (_, position) => `${position} position`],
  [/^수량 \((.+)\)$/, (_, unit) => `Quantity (${unit})`],
  [/^(.+) 수량을 환산할 가격을 조회하지 못했습니다\.$/, (_, unit) => `The conversion price for ${unit} quantity is unavailable.`],
  [/^닫을 (Long|Short) 포지션이 없습니다\.$/, (_, side) => `No ${side} position to close.`],
  [/^(.+) API 미연결\. 설정 → 거래소 API에서 이 거래소의 계정을 연결하세요\.$/, (_, name) => `${name} API is not connected. Connect this account in Settings → Exchange API.`],
  [/^(.+) API 미연결\. 연결된 계정: (.+)\. 상단에서 주문할 거래소를 선택하세요\.$/, (_, name, accounts) => `${name} API is not connected. Connected accounts: ${accounts}. Select an exchange above to trade.`],
  [/^(.+?) (USDT 선물|현물) (포지션 없음|조회 중…)$/, (_, name, market, status) => `${name} ${english(market)}: ${status === '포지션 없음' ? 'No positions' : 'Loading…'}`],
  [/^(.+) 포지션 없음$/, (_, name) => `${english(name)}: No positions`],
  [/^(.+) 조회 중…$/, (_, name) => `${english(name)}: Loading…`],
  [/^(Long|Short) TP\/SL 수정$/, (_, side) => `Edit ${side} TP/SL`],
  [/^(.+): 미설정$/, (_, label) => `${label}: Not set`],
  [/^(.+): (수정 버튼에서 최신 가격을 확인하세요\.)$/, (_, label, message) => `${label}: ${english(message)}`],
  [/^(TP|SL) 가격$/, (_, label) => `${label} price`],
  [/^(가격|스톱 발동|진입가 \/ TP \/ SL) \((.+)\)$/, (_, label, currency) => `${label === '스톱 발동' ? 'Stop trigger' : label === '가격' ? 'Price' : 'Entry / TP / SL'} (${currency})`],
  [/^현재 (Cross|Isolated)$/, (_, mode) => `Current: ${mode}`],
  [/^레버리지 1배 (올리기|내리기)$/, (_, action) => `${action === '올리기' ? 'Increase' : 'Decrease'} leverage by 1×`],
  [/^1배 (올리기|내리기)$/, (_, action) => `${action === '올리기' ? 'Increase' : 'Decrease'} by 1×`],
  [/^(.+) 색상 기본값$/, (_, name) => `Reset ${name} colors`],
  [/^(.+) 설정$/, (_, name) => `${english(name)} settings`],
  [/^(.+) 확대( \(더블클릭\))?$/, (_, name, hint) => `Maximize ${english(name)}${hint ? ' (double-click)' : ''}`],
  [/^(.+) (색상|채우기|불투명도)$/, (_, name, label) => `${english(name)} ${label === '색상' ? 'color' : label === '채우기' ? 'fill' : 'opacity'}`],
  [/^(.+) 선$/, (_, label) => `${english(label)} line`],
  [/^(.+) 기준선$/, (_, value) => `${value} reference line`],
  [/^(.+) 범위$/, (_, value) => `${value} range`],
  [/^지표 (\d+)$/, (_, count) => `Indicators ${count}`],
  [/^(\d+)개$/, (_, count) => `${count}`],
  [/^대기·예약 주문 (\d+)개$/, (_, count) => `Pending / conditional orders: ${count}`],
  [/^(.+) 조회 실패: (.+)$/, (_, name, error) => `${english(name)} query failed: ${english(error)}`],
  [/^(.+): (보유|포지션) (\d+)개$/, (_, name, type, count) => `${english(name)}: ${count} ${type === '보유' ? 'holdings' : 'positions'}`],
  [/^주문 (\d+)개(.*)$/, (_, count, warnings) => `${count} orders${warnings}`],
  [/^(.+) 기준 MMR · 유지증거금 비율(.*)$/, (_, scope, suffix) => `${english(scope)} MMR · Maintenance margin ratio${english(suffix)}`],
  [/^(.+) 신규 주문에 사용할 수 있는 증거금$/, (_, prefix) => `${prefix} margin available for new orders`],
  [/^(.+)주문 가격과 거래소 최소 수량·금액을 함께 반영합니다\.$/, (_, prefix) => `${prefix}Accounts for the order price and exchange minimum quantity/value.`],
  [/^거래소 조회 한도(.*)$/, (_, suffix) => `Exchange-verified limit${suffix}`],
  [/^차트 (.+) ↔ (.+)$/, (_, symbol, exchange) => `Chart ${symbol} ↔ ${exchange}`],
  [/^주문 금액 ≈ (.+) \(수수료 제외\)$/, (_, value) => `Order value ≈ ${english(value)} (excluding fees)`],
  [/^예상 증거금 ≈ (.+)$/, (_, value) => `Estimated margin ≈ ${value}`],
  [/^(매수|매도) (.+)$/, (_, side, quantity) => `${english(side)} ${quantity}`],
  [/^발동 (.+)$/, (_, price) => `Trigger ${price}`],
  [/^지정가 (.+)$/, (_, price) => `Limit ${price}`],
  [/^(TP|SL) 지정가 (.+)$/, (_, label, price) => `${label} limit ${price}`],
  [/^(익절|손절) 가격은 0보다 커야 합니다\.$/, (_, kind) => `${english(kind)} price must be greater than zero.`],
  [/^허용 배율: (.+)$/, (_, range) => `Allowed leverage: ${range}`],
  [/^배율을 낮추려면 추가 증거금 약 (.+) USDT가 필요합니다\. Available (.+) USDT$/, (_, required, available) => `Reducing leverage requires about ${required} USDT additional margin. Available: ${available} USDT`],
  [/^(.+) — 실제 주문은 전송되지 않았습니다\.$/, (_, order) => `${english(order)} — Preview only; no order was sent.`],
  [/^새 버전 (.+) Beta를 다운로드할 수 있어요\.$/, (_, version) => `Version ${version} Beta is available to download.`],
  [/^현재 버전\s*(.*)$/, (_, version) => `Current version${version ? ` ${version}` : ''}`],
  [/^다운로드 중$/, () => 'Downloading'],
  [/^광고: (.+) \(브라우저에서 열기\)$/, (_, title) => `Ad: ${title} (open in browser)`],
  [/^(.*) 주$/, (_, value) => `${value} shares`],
];

function english(value) {
  const text = value.trim();
  if (!/[가-힣]/.test(text)) return value;
  let translated = Object.hasOwn(EN, text) ? EN[text] : undefined;
  if (translated === undefined) {
    for (const [pattern, render] of patterns) {
      const match = text.match(pattern);
      if (match) { translated = render(...match); if (translated !== undefined) break; }
    }
  }
  if (translated === undefined && text.includes(' · ')) translated = text.split(' · ').map(english).join(' · ');
  return value.slice(0, value.length - value.trimStart().length) + (translated ?? text) + value.slice(value.trimEnd().length);
}

export function translate(text, language = 'ko') {
  return normalizeLanguage(language) === 'en' && typeof text === 'string' ? english(text) : text;
}
