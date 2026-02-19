/**
 * Design System Tokens — Warm Editorial Light Theme
 *
 * Grey default. One highlight at a time.
 * Colour is never used alone — always paired with shape, texture, size, weight, or position.
 */

// ─── §2 Colour Palette ───────────────────────────────────────────────────────

export const colors = {
  /** The problem: loss-making countries, negative margin bars, fixed-policy clusters */
  highlight: '#d94f00',
  /** Slider handles, active cells, cross-filter selections, reference lines */
  selection: '#2563eb',
  /** Everything not being argued about — majority of bars, dots, cells */
  neutral: '#94a0b0',
  /** Unselected states, grid lines, chart borders */
  muted: '#e5e1dc',
  /** Headlines, KPI values, key annotations */
  emphasisText: '#1a1a2e',
  /** Axis labels, footnotes, table headers, subtitles */
  secondaryText: '#5c6470',
  /** Card backgrounds */
  surface: '#ffffff',
  /** Very subtle warm hover */
  surfaceHover: '#faf8f6',
  /** Page canvas */
  pageBg: '#f8f5f1',
  /** Dark nav bar */
  navBg: '#1a1a2e',
  /** Elevated nav elements */
  navSurface: '#252540',
  /** Data completeness banners and governance gap callouts only */
  warning: '#d97706',
  /** Hatch stroke for loss bars */
  hatchStroke: '#b83c00',
  /** Decorative accents */
  accent: '#7c3aed',
} as const;

// ─── §4 Typography ───────────────────────────────────────────────────────────

export const typography = {
  fontFamily: "'Outfit', sans-serif",
  displayFont: "'Newsreader', serif",
  monoFont: "'JetBrains Mono', monospace",
  pageTitle:       { size: 28, weight: 500, color: colors.emphasisText },
  sectionHeading:  { size: 18, weight: 500, color: colors.emphasisText },
  chartTitle:      { size: 15, weight: 500, color: colors.emphasisText },
  chartSubtitle:   { size: 13, weight: 400, color: colors.secondaryText },
  axisLabel:       { size: 12, weight: 400, color: colors.secondaryText },
  kpiValue:        { size: 36, weight: 700, color: colors.emphasisText },
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
  chartSubtitleMb: 20,
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

// ─── Shadows ────────────────────────────────────────────────────────────────

export const shadows = {
  card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  elevated: '0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
  hover: '0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)',
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
  borderRadius: 10,
  padding: '20px 24px',
  boxShadow: shadows.card,
} as const;
