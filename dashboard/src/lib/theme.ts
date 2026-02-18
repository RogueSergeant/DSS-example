/**
 * Design System Tokens — Brief 3
 *
 * Grey default. One highlight at a time.
 * Colour is never used alone — always paired with shape, texture, size, weight, or position.
 */

// ─── §2 Colour Palette ───────────────────────────────────────────────────────

export const colors = {
  /** The problem: loss-making countries, negative margin bars, fixed-policy clusters */
  highlight: '#f97316',
  /** Slider handles, active cells, cross-filter selections, reference lines */
  selection: '#3b82f6',
  /** Everything not being argued about — majority of bars, dots, cells */
  neutral: '#64748b',
  /** Unselected states, grid lines, chart borders */
  muted: '#334155',
  /** Headlines, KPI values, key annotations */
  emphasisText: '#f1f5f9',
  /** Axis labels, footnotes, table headers, subtitles */
  secondaryText: '#94a3b8',
  /** Card backgrounds */
  surface: '#1e293b',
  /** Page canvas */
  pageBg: '#0f172a',
  /** Data completeness banners and governance gap callouts only */
  warning: '#f59e0b',
  /** Hatch stroke for loss bars */
  hatchStroke: '#c2410c',
} as const;

// ─── §4 Typography ───────────────────────────────────────────────────────────

export const typography = {
  fontFamily: 'system-ui, sans-serif',
  pageTitle:       { size: 24, weight: 600, color: colors.emphasisText },
  sectionHeading:  { size: 16, weight: 600, color: colors.emphasisText },
  chartTitle:      { size: 14, weight: 500, color: colors.emphasisText },
  chartSubtitle:   { size: 13, weight: 400, color: colors.secondaryText },
  axisLabel:       { size: 12, weight: 400, color: colors.secondaryText },
  kpiValue:        { size: 36, weight: 700, color: '#ffffff' },
  kpiLabel:        { size: 12, weight: 400, color: colors.secondaryText },
  tooltipValue:    { size: 14, weight: 600, color: colors.emphasisText },
  tooltipLabel:    { size: 12, weight: 400, color: colors.secondaryText },
  annotation:      { size: 12, weight: 500, color: colors.emphasisText },
  footnote:        { size: 11, weight: 400, color: colors.secondaryText },
  tableCell:       { size: 13, weight: 400, color: colors.emphasisText },
  tableHeader:     { size: 12, weight: 600, color: colors.secondaryText },
} as const;

// ─── §5 Spacing & Layout ────────────────────────────────────────────────────

export const spacing = {
  pagePadding: 24,
  cardPadding: 20,
  cardGap: 16,
  chartTitleMb: 4,
  chartSubtitleMb: 12,
  legendMt: 8,
  minChartHeight: 240,
  kpiCardHeight: 100,
} as const;

export const grid = {
  columns: 12,
  quarter: 3,
  third: 4,
  half: 6,
  full: 12,
} as const;

// ─── §9 Standard Chart Defaults ─────────────────────────────────────────────

export const chartDefaults = {
  margin: { top: 8, right: 24, bottom: 8, left: 24 },
  gridStroke: colors.muted,
  gridStrokeDasharray: '3 3',
  axisTickColor: colors.secondaryText,
  tooltip: {
    background: colors.surface,
    border: `1px solid ${colors.muted}`,
    borderRadius: 6,
    padding: '10px 14px',
  },
  defaultFill: colors.neutral,
} as const;

// ─── §3 Secondary Encodings — Shape & Size ──────────────────────────────────

export const shapes = {
  /** Variable-regime countries */
  variable: { type: 'circle' as const, radius: 5 },
  /** Fixed-regime countries — larger + different shape */
  fixed: { type: 'diamond' as const, radius: 7 },
} as const;

export const dotSize = {
  /** Scatter chart dot sizing by order volume (square-root scale) */
  minRadius: 4,
  maxRadius: 12,
} as const;

// ─── §3 Secondary Encodings — Hatching ──────────────────────────────────────

export const hatch = {
  angle: 45,
  lineWidth: 3,
  spacing: 6,
  stroke: colors.hatchStroke,
} as const;

// ─── §8 Accessibility ───────────────────────────────────────────────────────

export const accessibility = {
  focusRing: {
    color: colors.selection,
    width: 2,
    offset: 2,
  },
  /** Minimum text contrast ratio (WCAG AA) */
  minTextContrast: 4.5,
  /** Minimum graphical element contrast ratio (WCAG AA) */
  minGraphicalContrast: 3,
} as const;

// ─── §3 Opacity ─────────────────────────────────────────────────────────────

export const opacity = {
  /** Cross-filtered-out elements */
  filteredOut: 0.25,
  /** All other elements */
  active: 1,
} as const;

// ─── §10 KPI Card ───────────────────────────────────────────────────────────

export const kpiCard = {
  background: colors.surface,
  border: `1px solid ${colors.muted}`,
  borderRadius: 8,
  padding: '20px 24px',
} as const;
