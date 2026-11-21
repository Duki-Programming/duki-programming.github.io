export const CHART_COLORS = {
  dark: { up: '#55d6ab', down: '#f28591', blue: '#75b5ff', gold: '#e8ba6a', purple: '#b4a0f5', pink: '#ee9dd5', reference: '#3f4b60' },
  light: { up: '#078565', down: '#d34460', blue: '#246cce', gold: '#a96d0b', purple: '#7950b8', pink: '#b4388d', reference: '#bdc4d1' },
};

const line = (key, label, color) => ({ key, label, color });
const levels = values => values.map(value => ({ key: `level${value}`, label: `${value} 기준선`, value, color: 'reference' }));
const range = (lower, upper) => [{ key: 'range', label: `${lower}–${upper} 범위`, lower, upper, color: 'purple', opacity: 6 }];
export const INDICATOR_APPEARANCE = {
  bb: { series: [line('middle', '중심', 'gold'), line('upper', '상단', 'blue'), line('lower', '하단', 'blue')], fills: [{ key: 'band', label: '밴드 내부', upper: 'upper', lower: 'lower', color: 'blue', opacity: 12 }] },
  sma: { series: [line('value', '', 'gold')] }, ema: { series: [line('value', '', 'pink')] },
  mfi: { series: [line('value', '', 'purple')], levels: levels([20, 80]), fills: range(20, 80) },
  rsi: { series: [line('value', '', 'purple')], levels: levels([30, 70]), fills: range(30, 70) },
  macd: { series: [line('histogram', '히스토그램', 'up'), line('macd', 'MACD', 'blue'), line('signal', '시그널', 'gold')], levels: levels([0]) },
  stoch: { series: [line('k', '%K', 'blue'), line('d', '%D', 'gold')], levels: levels([20, 80]), fills: range(20, 80) },
  atr: { series: [line('value', '', 'gold')] }, cci: { series: [line('value', '', 'blue')], levels: levels([-100, 0, 100]) },
  obv: { series: [line('value', '', 'pink')] },
};

export function indicatorColorFields(id) {
  const spec = INDICATOR_APPEARANCE[id];
  return [...spec.series.flatMap(entry => entry.key === 'histogram'
    ? [{ key: 'histogramUp', label: '히스토그램 +', color: 'up' }, { key: 'histogramDown', label: '히스토그램 −', color: 'down' }]
    : [{ ...entry, label: entry.label ? `${entry.label} 선` : '지표 선' }]), ...(spec.levels || []), ...(spec.fills || [])];
}

export function appearanceDefaults(id) {
  return { colors: {}, fills: Object.fromEntries((INDICATOR_APPEARANCE[id].fills || []).map(fill => [fill.key, { enabled: true, opacity: fill.opacity }])) };
}

export function normalizeAppearance(id, config = {}) {
  const result = appearanceDefaults(id);
  for (const { key } of indicatorColorFields(id)) {
    const color = config.colors?.[key];
    if (typeof color === 'string' && /^#[\da-f]{6}$/i.test(color)) result.colors[key] = color.toLowerCase();
  }
  for (const [key, fill] of Object.entries(result.fills)) {
    const raw = config.fills?.[key];
    if (typeof raw?.enabled === 'boolean') fill.enabled = raw.enabled;
    if (Number.isFinite(raw?.opacity)) fill.opacity = Math.round(Math.min(100, Math.max(0, raw.opacity)));
  }
  return result;
}

export function indicatorColor(id, key, config, theme = 'dark', value = 0) {
  if (key === 'histogram') key = value < 0 ? 'histogramDown' : 'histogramUp';
  const field = indicatorColorFields(id).find(field => field.key === key);
  return config?.colors?.[key] || (CHART_COLORS[theme] || CHART_COLORS.dark)[field.color];
}

export function indicatorFill(id, fill, config, theme) {
  return { ...fill, ...config.fills?.[fill.key], color: indicatorColor(id, fill.key, config, theme), visible: !config.hidden && (config.fills?.[fill.key]?.enabled ?? true) };
}
