export const WINDOW_LIMITS = {
  compact: { minWidth: 168, minHeight: 84, maxWidth: 560, maxHeight: 180 },
  expanded: { minWidth: 392, minHeight: 420, maxWidth: 3840, maxHeight: 2160 },
};

export function normalizeWindowSize(size, expanded = false) {
  const limit = WINDOW_LIMITS[expanded ? 'expanded' : 'compact'];
  return {
    width: Math.round(Math.max(limit.minWidth, Math.min(limit.maxWidth, size.width))),
    height: Math.round(Math.max(limit.minHeight, Math.min(limit.maxHeight, size.height))),
  };
}

export function rememberWindowGeometry(settings, bounds, expanded) {
  settings[expanded ? 'expandedSize' : 'compactSize'] = normalizeWindowSize(bounds, expanded);
  if (!expanded) {
    const position = { x: Math.round(bounds.x), y: Math.round(bounds.y) };
    settings.compactBounds = position;
    settings.bounds = position;
  }
  delete settings.expandedBounds;
}

export function windowPosition(settings, current, expanded, nextExpanded) {
  const saved = settings.compactBounds || settings.bounds;
  return expanded === nextExpanded || !saved ? { x: current.x, y: current.y } : { ...saved };
}

export function expandedMinimumHeight(positionHeight = 0, workAreaHeight = WINDOW_LIMITS.expanded.maxHeight) {
  const extra = Number.isFinite(positionHeight) ? Math.max(0, positionHeight) : 0;
  return Math.min(workAreaHeight, WINDOW_LIMITS.expanded.maxHeight, Math.ceil(WINDOW_LIMITS.expanded.minHeight + extra));
}

export function applyWindowLimits(win, expanded, platform = '', minimumHeight = WINDOW_LIMITS.expanded.minHeight) {
  const limit = WINDOW_LIMITS[expanded ? 'expanded' : 'compact'];
  // Release the compact cap before applying the expanded minimum, and vice versa.
  // macOS keeps the NSWindow maximum when Electron receives an empty size.
  // Explicit bounds release its old compact height limit for native dragging.
  const release = WINDOW_LIMITS.expanded;
  win.setMaximumSize(platform === 'darwin' ? release.maxWidth : 0, platform === 'darwin' ? release.maxHeight : 0);
  win.setMinimumSize(limit.minWidth, expanded ? minimumHeight : limit.minHeight);
  if (!expanded) win.setMaximumSize(limit.maxWidth, limit.maxHeight);
}
