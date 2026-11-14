export function scaleTransform(range, logarithmic) {
  if (!logarithmic) return { project: value => value, restore: value => value };
  const difference = Math.abs(range.to - range.from);
  const digits = difference >= 1 || difference < 1e-15 ? 0 : Math.ceil(Math.abs(Math.log10(difference)));
  const offset = 4 + digits, epsilon = 10 ** -offset;
  return {
    project: value => Math.abs(value) < 1e-15 ? 0 : Math.sign(value) * (Math.log10(Math.abs(value) + epsilon) + offset),
    restore: value => Math.abs(value) < 1e-15 ? 0 : Math.sign(value) * (10 ** (Math.abs(value) - offset) - epsilon),
  };
}

export function priceBarRatio(range, height, spacing, logarithmic = false) {
  if (!range || !(height > 0) || !(spacing > 0)) return null;
  const { project } = scaleTransform(range, logarithmic);
  const ratio = (project(range.to) - project(range.from)) * spacing / height;
  return Number.isFinite(ratio) && ratio > 0 ? ratio : null;
}

export function lockedScaleRange(range, ratio, height, spacing, logarithmic = false) {
  if (!range || !(ratio > 0) || !(height > 0) || !(spacing > 0)) return null;
  const { project } = scaleTransform(range, logarithmic), center = (project(range.from) + project(range.to)) / 2;
  const half = ratio * height / spacing / 2;
  const result = { from: center - half, to: center + half };
  return Number.isFinite(result.from) && Number.isFinite(result.to) && result.to > result.from ? result : null;
}

export function zoomScaleRange(range, factor, anchor = .5, logarithmic = false) {
  if (!range || !(factor > 0) || !Number.isFinite(factor) || !Number.isFinite(anchor)) return null;
  const { project } = scaleTransform(range, logarithmic);
  const from = project(range.from), to = project(range.to);
  const point = from + (to - from) * Math.max(0, Math.min(1, anchor));
  const result = { from: point + (from - point) * factor, to: point + (to - point) * factor };
  return Number.isFinite(result.from) && Number.isFinite(result.to) && result.to > result.from ? result : null;
}
