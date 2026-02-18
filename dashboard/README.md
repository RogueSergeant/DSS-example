# Dashboard Design System — Brief 3

Design system implementation for the Global Superstore analytical dashboard. This package provides all visual constants, layout primitives, and chart components needed to compose the six dashboard pages in Brief 4.

## Quick Start

```bash
cd dashboard
npm install
npm run dev      # Vite dev server on http://localhost:5173
npm run build    # Production build → dist/
```

### Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React + TypeScript | 19.x |
| Bundler | Vite | 7.x |
| Styling | Tailwind CSS v4 (`@theme` tokens) | 4.x |
| Charts | Recharts | 3.x |

---

## Architecture

```
src/
├── lib/
│   └── theme.ts              ← All design tokens (colours, typography, spacing, chart defaults)
├── components/
│   ├── index.ts              ← Barrel export — import everything from here
│   ├── HatchPattern.tsx      ← SVG <defs> for diagonal hatch overlays
│   ├── ChartWrapper.tsx      ← Card wrapper + standard Recharts grid/tooltip
│   ├── KpiCard.tsx           ← KPI value cards (neutral + loss variants)
│   ├── StripPlot.tsx         ← Scatter with jitter + diamond shapes (Page 2)
│   ├── WaterfallChart.tsx    ← Stacked bar waterfall with hatch fills (Page 2)
│   ├── ButterflyChart.tsx    ← Diverging paired horizontal bars (Page 4)
│   ├── DumbbellChart.tsx     ← Paired dot chart with connecting lines (Page 4)
│   ├── InteractiveSlider.tsx ← Range input + line chart with zone fills (Page 5)
│   ├── ScenarioMatrix.tsx    ← Heatmap table with blue intensity scale (Page 5)
│   ├── Caveats.tsx           ← Warning banner, footnote, callout, flag
│   └── DashboardLayout.tsx   ← Page shell, section headings, 12-column grid
├── index.css                 ← Tailwind import + @theme tokens + global styles
├── App.tsx                   ← Entry point (renders HatchPatternDefs)
└── main.tsx                  ← React root mount
```

All components import tokens from `lib/theme.ts`. No magic numbers exist in component files.

---

## Design Tokens (`lib/theme.ts`)

### Colour Palette

Colourblind-safe throughout. No green. No red-green pairing. Blue and orange remain discriminable under deuteranopia, protanopia, and tritanopia.

| Export key | Hex | Role |
|------------|-----|------|
| `colors.highlight` | `#f97316` | Loss, problems, fixed-regime clusters |
| `colors.selection` | `#3b82f6` | Slider handles, active states, reference lines |
| `colors.neutral` | `#64748b` | Default fill for everything not argued about |
| `colors.muted` | `#334155` | Grid lines, borders, unselected states |
| `colors.emphasisText` | `#f1f5f9` | Headlines, KPI values, annotations |
| `colors.secondaryText` | `#94a3b8` | Axis labels, subtitles, footnotes |
| `colors.surface` | `#1e293b` | Card backgrounds |
| `colors.pageBg` | `#0f172a` | Page canvas |
| `colors.warning` | `#f59e0b` | Data-completeness banners only |
| `colors.hatchStroke` | `#c2410c` | Diagonal hatch line colour |

These same values are available as Tailwind utilities via `@theme` in `index.css`:
`bg-highlight`, `text-selection`, `border-muted`, etc.

### Typography

```ts
import { typography } from './lib/theme';
// typography.chartTitle → { size: 14, weight: 500, color: '#f1f5f9' }
```

| Role | Size | Weight | Colour |
|------|------|--------|--------|
| `pageTitle` | 24px | 600 | emphasis |
| `sectionHeading` | 16px | 600 | emphasis |
| `chartTitle` | 14px | 500 | emphasis |
| `chartSubtitle` | 13px | 400 | secondary |
| `axisLabel` | 12px | 400 | secondary |
| `kpiValue` | 36px | 700 | white |
| `kpiLabel` | 12px | 400 | secondary |
| `tooltipValue` | 14px | 600 | emphasis |
| `tooltipLabel` | 12px | 400 | secondary |
| `annotation` | 12px | 500 | emphasis |
| `footnote` | 11px | 400 | secondary |
| `tableCell` | 13px | 400 | emphasis |
| `tableHeader` | 12px | 600 | secondary |

Font: `system-ui, sans-serif`. No external dependencies.

### Spacing & Grid

| Token | Value |
|-------|-------|
| `spacing.pagePadding` | 24px |
| `spacing.cardPadding` | 20px |
| `spacing.cardGap` | 16px |
| `spacing.minChartHeight` | 240px |
| `spacing.kpiCardHeight` | 100px |
| `grid.columns` | 12 |

### Chart Defaults

Applied automatically by `ChartWrapper`. Override per-component when needed.

```ts
import { chartDefaults } from './lib/theme';
// chartDefaults.margin → { top: 8, right: 24, bottom: 8, left: 24 }
// chartDefaults.defaultFill → '#64748b' (slate)
```

- Grid: horizontal only, `#334155` dashed `3 3`
- Axis lines: suppressed
- Tooltip: `#1e293b` bg, `#334155` border, 6px radius, `10px 14px` padding
- Animation: disabled on all components (`isAnimationActive={false}`)

### Secondary Encodings

```ts
import { shapes, dotSize, hatch, opacity } from './lib/theme';
```

| Token | Value | Usage |
|-------|-------|-------|
| `shapes.variable` | circle, 5px radius | Variable-regime countries |
| `shapes.fixed` | diamond, 7px radius | Fixed-regime countries (larger + different shape) |
| `dotSize.minRadius` | 4px | Scatter dot minimum (square-root scale) |
| `dotSize.maxRadius` | 12px | Scatter dot maximum |
| `hatch.angle` | 45° | Diagonal line rotation |
| `hatch.lineWidth` | 3px | Hatch line thickness |
| `hatch.spacing` | 6px | Gap between hatch lines |
| `hatch.stroke` | `#c2410c` | Hatch line colour |
| `opacity.filteredOut` | 0.25 | Cross-filtered-out elements |
| `opacity.active` | 1.0 | All other elements |

---

## Components

All components are available from a single import:

```tsx
import {
  HatchPatternDefs,
  ChartWrapper, tooltipStyle, gridProps,
  KpiCard,
  StripPlot,
  WaterfallChart,
  ButterflyChart,
  DumbbellChart,
  InteractiveSlider,
  ScenarioMatrix,
  WarningBanner, Footnote, GovernanceCallout, ReliabilityFlag,
  DashboardPage, Section, Grid, GridCell,
} from './components';
```

---

### `HatchPatternDefs`

**Must be rendered once at app root.** Already placed in `App.tsx`.

Provides two SVG `<pattern>` IDs:
- `url(#hatch-loss)` — orange fill with dark diagonal lines. Used by `WaterfallChart` and `ButterflyChart` for negative bars.
- `url(#hatch-loss-zone)` — transparent with 5% opacity lines. Used by `InteractiveSlider` for the loss zone.

No props. No children.

---

### `ChartWrapper`

Card container for any Recharts chart. Provides the surface background, border, title, subtitle, `aria-label`, and minimum height.

```tsx
<ChartWrapper
  title="Anything above ~25% discount is underwater"  // Argument, not description
  subtitle="Margin by discount band, 2011-2014"       // Optional
  ariaLabel="Bar chart showing margin turning negative above 25% discount"
  minHeight={300}                                       // Default: 240
>
  <BarChart ...>...</BarChart>
</ChartWrapper>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | required | Argument-style chart title |
| `subtitle` | `string?` | — | Framing question or descriptive subtitle |
| `ariaLabel` | `string?` | title value | Describes chart type, data, and argument |
| `minHeight` | `number` | `240` | Minimum chart area height in px |
| `children` | `ReactNode` | required | Recharts composition |

Also exports:
- `tooltipStyle` — `React.CSSProperties` for Recharts `<Tooltip contentStyle={...}>`.
- `gridProps` — spread onto `<CartesianGrid {...gridProps} />`.

---

### `KpiCard`

Two variants: neutral (white value) and loss (orange value).

```tsx
// Neutral
<KpiCard value="$4.3M" label="Total Sales 2014" detail="▲ +26% vs 2013" />

// Loss
<KpiCard value="−$413K" label="Fixed-policy loss" detail="24 countries" isLoss />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | required | Formatted value, e.g. `"$4.3M"` |
| `label` | `string` | required | Descriptive label |
| `detail` | `string?` | — | Secondary line (trend arrow, country count, etc.) |
| `isLoss` | `boolean` | `false` | Orange value + bold weight when true |
| `ariaLabel` | `string?` | auto | Override accessible label |

---

### `StripPlot`

Scatter chart for Page 2. Variable-regime = slate circles (5px). Fixed-regime = orange diamonds (7px) with deterministic jitter seeded by country name. Dashed reference lines at 40%, 50%, 60%, 70% discount tiers.

```tsx
<StripPlot
  data={[
    { country: "Germany", discount: 0.40, margin: -0.12, regime: "fixed" },
    { country: "Brazil",  discount: 0.22, margin: 0.15,  regime: "variable" },
  ]}
  onDotClick={(d) => openCountryDetail(d.country)}
  onTierClick={(tier) => crossFilterToTier(tier)}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `StripPlotDatum[]` | required | `{ country, discount, margin, regime }` |
| `width` | `number` | `720` | Chart width in px |
| `height` | `number` | `400` | Chart height in px |
| `title` | `string` | `"Fixed-regime discounts cluster at system-set tiers"` | Argument-style title |
| `subtitle` | `string?` | — | Framing subtitle |
| `onDotClick` | `(d) => void` | — | Click handler for country dot |
| `onTierClick` | `(tier: number) => void` | — | Click handler for reference line label |

**Data source:** `summary_country_regime.json` — fields `discount_avg`, `margin_avg`, `discount_regime`.

---

### `WaterfallChart`

Waterfall for Page 2. Total/result bars in slate; negative bars in orange with hatch overlay. Invisible base segments position deltas at correct elevation. Tooltip shows absolute value + % of baseline.

```tsx
<WaterfallChart
  data={[
    { name: "Baseline profit",      value: 1200000, type: "total" },
    { name: "Fixed-policy loss",    value: -500000, type: "negative" },
    { name: "Over-discount loss",   value: -312000, type: "negative" },
    { name: "Remaining profit",     value: 0,       type: "result" },
  ]}
  formatValue={(v) => `$${Math.abs(v / 1000).toFixed(0)}K`}
  onBlockClick={(d) => navigateToPage(d.name)}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `WaterfallDatum[]` | required | `{ name, value, type }` — type is `'total'`, `'negative'`, or `'result'` |
| `width` | `number` | `720` | Chart width in px |
| `height` | `number` | `400` | Chart height in px |
| `title` | `string` | `"Two blocks of erasure reduce profit"` | Argument-style title |
| `subtitle` | `string?` | — | Framing subtitle |
| `formatValue` | `(v: number) => string` | `$…K` | Value label formatter |
| `onBlockClick` | `(d) => void` | — | Click handler for loss blocks |

The `result` row's value field is ignored — remaining profit is auto-calculated from total minus negatives.

**Data source:** Derived from `summary_overview.json` aggregates.

---

### `ButterflyChart`

Diverging horizontal bars for Page 4. Auto-sorts by absolute swing (largest gap at top). Top N rows rendered in bold weight to reinforce the argument.

```tsx
<ButterflyChart
  data={[
    { subCategory: "Tables",  undiscountedMargin: 0.18, discountedMargin: -0.12 },
    { subCategory: "Storage", undiscountedMargin: 0.15, discountedMargin: -0.05 },
    { subCategory: "Chairs",  undiscountedMargin: 0.22, discountedMargin: 0.08 },
  ]}
  boldTop={2}
  onRowClick={(d) => crossFilterBreakeven(d.subCategory)}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `ButterflyDatum[]` | required | `{ subCategory, undiscountedMargin, discountedMargin }` |
| `width` | `number` | `720` | Chart width in px |
| `height` | `number` | `400` | Chart height in px |
| `title` | `string` | `"Tables and Storage collapse under discounting"` | Argument-style title |
| `subtitle` | `string?` | — | Framing subtitle |
| `boldTop` | `number` | `2` | How many top-swing rows to bold |
| `onRowClick` | `(d) => void` | — | Cross-filter to breakeven table |

Left bars (undiscounted) are always slate. Right bars (discounted) are orange + hatch when negative, slate when positive.

**Data source:** `summary_product.json` — fields `sub_category`, `margin_at_zero_discount`, `margin_at_avg_discount`.

---

### `DumbbellChart`

Paired dot chart for Page 4. Raw margin (slate, 8px) vs adjusted margin (blue, 8px) with a connecting line showing the gap. Managers with `noInheritedPolicy: true` get an orange annotation label.

```tsx
<DumbbellChart
  data={[
    { manager: "Sayre",      rawMargin: 0.12, adjustedMargin: 0.22 },
    { manager: "Ballentine", rawMargin: 0.05, adjustedMargin: 0.05, noInheritedPolicy: true },
  ]}
  onManagerClick={(d) => expandManagerDetail(d.manager)}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `DumbbellDatum[]` | required | `{ manager, rawMargin, adjustedMargin, noInheritedPolicy? }` |
| `width` | `number` | `720` | Chart width in px |
| `height` | `number` | `400` | Chart height in px |
| `title` | `string` | `"Most managers carry inherited policy drag — Ballentine doesn't"` | Argument-style title |
| `subtitle` | `string?` | — | Framing subtitle |
| `onManagerClick` | `(d) => void` | — | Expand inline country scatter |

**Data source:** `summary_manager.json` — fields `person`, `margin`, `adjusted_margin`.

---

### `InteractiveSlider`

Range input controlling a discount-to-margin line chart for Page 5. Fires `onChange` on every input event (not just on release). Blue zone left of slider (recovered), orange zone right (loss).

```tsx
const [threshold, setThreshold] = useState(0.30);

<InteractiveSlider
  curveData={curvePoints}  // [{ discount: 0, margin: 0.35 }, ...]
  value={threshold}
  onChange={setThreshold}
  step={0.01}
  label="Fixed-country discount ceiling"
  discountDomain={[0, 0.70]}
  marginDomain={[-0.20, 0.40]}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `curveData` | `CurvePoint[]` | required | `{ discount, margin }` — the empirical curve |
| `value` | `number` | required | Current slider position |
| `onChange` | `(v: number) => void` | required | Fires on every input change |
| `step` | `number` | `0.01` | Slider increment |
| `label` | `string?` | — | Visible label above slider |
| `discountDomain` | `[number, number]?` | auto from data | X-axis bounds |
| `marginDomain` | `[number, number]?` | auto from data | Y-axis bounds |
| `width` | `number` | `720` | Chart width in px |
| `height` | `number` | `300` | Chart height in px |
| `title` | `string` | `"Discount-to-margin response curve"` | Argument-style title |
| `subtitle` | `string?` | — | Framing subtitle |

**Data source:** `whatif_discount_curve.json` — `curve` array with `{ discount, margin }` points.

---

### `ScenarioMatrix`

CSS table heatmap for Page 5. Single-hue blue scale from surface colour to selection blue. Clicking a cell should set both sliders (wired via `onCellClick`). Keyboard accessible with Enter/Space.

```tsx
<ScenarioMatrix
  rowLabels={["25%", "30%", "35%"]}
  colLabels={["20%", "25%", "30%"]}
  cells={[
    [{ profit: "$1.8M", uplift: 54 }, { profit: "$2.0M", uplift: 62 }, ...],
    ...
  ]}
  activeCell={[1, 2]}
  minUplift={54}
  maxUplift={81}
  onCellClick={(row, col) => { setSliderA(rowValues[row]); setSliderB(colValues[col]); }}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `rowLabels` | `string[]` | required | Row header labels (Slider A values) |
| `colLabels` | `string[]` | required | Column header labels (Slider B values) |
| `cells` | `MatrixCell[][]` | required | 2D array: `{ profit: string, uplift: number }` |
| `activeCell` | `[number, number]?` | — | Currently highlighted `[row, col]` |
| `minUplift` | `number` | required | Minimum uplift value for colour scaling |
| `maxUplift` | `number` | required | Maximum uplift value for colour scaling |
| `onCellClick` | `(row, col) => void` | — | Sets both sliders to that scenario |

**Data source:** `whatif_discount_curve.json` — `matrix` object (31x31 grid).

---

### Caveat Components

Four distinct visual treatments for data caveats:

```tsx
// 1. Amber banner — top of affected section (role="alert")
<WarningBanner>Returns data covers only US, EU, LATAM, APAC — not Africa or EMEA.</WarningBanner>

// 2. Italic footnote — bottom of card, prefixed with *
<Footnote>Discount regimes are inferred from data patterns, not source ERP configuration.</Footnote>

// 3. Orange-bordered callout — governance gap highlight
<GovernanceCallout>EMEA has no assigned regional manager in the source data.</GovernanceCallout>

// 4. Inline flag — table cell icon with hover/focus tooltip
<ReliabilityFlag tooltip="Only 23 order lines — aggregate unreliable" />
```

| Component | Props | Appearance |
|-----------|-------|------------|
| `WarningBanner` | `children` | Amber `#f59e0b` banner with ⚠ icon |
| `Footnote` | `children` | 11px italic secondary text, prefixed `*` |
| `GovernanceCallout` | `children` | 4px orange left border, 8% orange background |
| `ReliabilityFlag` | `tooltip?: string` | ⚑ icon, tooltip on hover/focus |

---

### Layout Components

```tsx
<DashboardPage title="Executive Overview">
  <Section heading="Revenue Performance">
    <Grid>
      <GridCell span={3}><KpiCard ... /></GridCell>
      <GridCell span={3}><KpiCard ... /></GridCell>
      <GridCell span={3}><KpiCard ... /></GridCell>
      <GridCell span={3}><KpiCard ... /></GridCell>
    </Grid>
  </Section>

  <Section heading="Margin Erosion">
    <Grid>
      <GridCell span={6}><ChartWrapper ...>...</ChartWrapper></GridCell>
      <GridCell span={6}><ChartWrapper ...>...</ChartWrapper></GridCell>
    </Grid>
  </Section>
</DashboardPage>
```

| Component | Props | Description |
|-----------|-------|-------------|
| `DashboardPage` | `title: string` | Full-page wrapper: 24px padding, `<h1>` page title |
| `Section` | `heading: string` | Section group: `<h2>` heading, 16px bottom gap |
| `Grid` | `children` | 12-column CSS grid with 16px gaps |
| `GridCell` | `span: 3 \| 4 \| 6 \| 12` | Column span (quarter / third / half / full) |

---

## Data-to-Component Mapping

The data pipeline (`prepare_data.py`) outputs JSON files in `../data/`. Each dashboard page maps to specific data files and components:

| Page | Data File(s) | Components Used |
|------|-------------|-----------------|
| 1 — Executive Overview | `summary_overview.json` | `KpiCard`, `ChartWrapper` + bar charts |
| 2 — Discount Impact | `summary_discount.json`, `summary_country_regime.json` | `StripPlot`, `WaterfallChart`, `KpiCard` |
| 3 — Country Regimes | `summary_country_regime.json` | `ChartWrapper` + scatter/strip, table with `ReliabilityFlag` |
| 4 — Manager & Product | `summary_manager.json`, `summary_product.json` | `DumbbellChart`, `ButterflyChart`, `KpiCard` |
| 5 — What-If Calculator | `whatif_discount_curve.json` | `InteractiveSlider` (x2), `ScenarioMatrix`, `KpiCard` |
| 6 — Customer Analysis | `summary_customers.json` | `ChartWrapper` + scatter charts, `KpiCard` |

---

## Design Rules for Brief 4

These rules are enforced by the token system but worth restating for page composition:

1. **Grey default, one highlight at a time.** Start everything in `colors.neutral`. Apply orange or blue only where making an argument. At most two non-grey values per chart.

2. **Titles are arguments, not descriptions.** Write "Anything above ~25% discount is underwater", not "Margin by Discount Band".

3. **Colour is never alone.** Every coloured element also carries shape, texture, size, weight, or annotation. This is built into the chart components (e.g. StripPlot uses both colour + shape + size for regime encoding).

4. **No green.** The palette has no green. Positive states are communicated through position, weight, and labels.

5. **Hatch for loss.** All orange-filled bars use `url(#hatch-loss)` — the `WaterfallChart` and `ButterflyChart` do this automatically. For custom bar charts, apply the fill manually.

6. **Animation disabled.** All Recharts components use `isAnimationActive={false}`.

7. **Cross-filter opacity.** When implementing cross-filtering, set filtered-out elements to `opacity.filteredOut` (0.25). All other elements remain at `opacity.active` (1.0).

8. **Encoding hierarchy.** Position > Length > Shape > Size > Colour > Texture > Opacity. Never encode the same variable in two channels. Never use colour for a variable already encoded by position.

---

## Accessibility Checklist

- [x] Focus ring: 2px solid `#3b82f6`, 2px offset (global CSS)
- [x] All charts carry `aria-label` (via `ChartWrapper`)
- [x] KPI cards use `role="figure"` with auto-generated `aria-label`
- [x] `ScenarioMatrix` cells are keyboard navigable (Enter/Space)
- [x] `ReliabilityFlag` tooltip triggers on hover and keyboard focus
- [x] Hatch textures separate loss from neutral independently of colour
- [x] Diamond vs circle shapes distinguish regimes independently of colour
- [ ] Simulate full dashboard under deuteranopia, protanopia, tritanopia before shipping
- [ ] Verify 4.5:1 text contrast and 3:1 graphical contrast (WCAG AA)
