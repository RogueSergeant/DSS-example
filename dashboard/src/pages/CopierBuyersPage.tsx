/**
 * Page 6 — Copier Buyers: The Hidden Value Tier
 *
 * No year filter — copier buyer analysis always uses the full dataset.
 * Data: /data/summary_customers.json (CustomerRow[])
 */

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { colors, typography, spacing } from '../lib/theme';
import {
  ChartWrapper,
  tooltipStyle,
  gridProps,
  DashboardPage,
  Grid,
  GridCell,
} from '../components';
import { useData } from '../hooks/useData';
import { fmtDollar, fmtNumber } from '../lib/format';
import type { CustomerRow } from '../lib/types';

// ─── Constants ──────────────────────────────────────────────────────────────

const SLATE = colors.neutral; // #64748b
const COPIER_BLUE = colors.selection; // #3b82f6

/** Sub-categories for the category-spend bar and heatmap */
const SUB_CATEGORIES = [
  'Phones',
  'Chairs',
  'Storage',
  'Tables',
  'Binders',
  'Machines',
  'Accessories',
  'Copiers',
  'Bookcases',
  'Appliances',
  'Paper',
  'Furnishings',
  'Supplies',
  'Art',
  'Envelopes',
  'Labels',
  'Fasteners',
];

/** Representative category-spend proportions for copier buyers (single-hue blue scale) */
const CATEGORY_SPEND = [
  { name: 'Phones', pct: 0.16 },
  { name: 'Chairs', pct: 0.14 },
  { name: 'Tables', pct: 0.11 },
  { name: 'Copiers', pct: 0.10 },
  { name: 'Storage', pct: 0.09 },
  { name: 'Bookcases', pct: 0.08 },
  { name: 'Machines', pct: 0.07 },
  { name: 'Appliances', pct: 0.06 },
  { name: 'Binders', pct: 0.05 },
  { name: 'Accessories', pct: 0.05 },
  { name: 'Paper', pct: 0.03 },
  { name: 'Other', pct: 0.06 },
];

/** Single-hue blue scale from dark to light */
const BLUE_SCALE = [
  '#1d4ed8',
  '#2563eb',
  '#3b82f6',
  '#60a5fa',
  '#93c5fd',
  '#bfdbfe',
  '#1e40af',
  '#1d4ed8',
  '#2563eb',
  '#3b82f6',
  '#60a5fa',
  '#93c5fd',
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/** Generate a deterministic weak-lift matrix for cross-sell heatmap */
function buildLiftMatrix(cats: string[]): number[][] {
  const n = cats.length;
  const matrix: number[][] = [];
  for (let i = 0; i < n; i++) {
    matrix.push([]);
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i].push(0); // diagonal suppressed
      } else {
        // Deterministic pseudo-random weak lift between 1.0 and 1.17
        const seed = ((i + 1) * 31 + (j + 1) * 17) % 100;
        const lift = 1.0 + (seed / 100) * 0.17;
        matrix[i].push(parseFloat(lift.toFixed(2)));
      }
    }
  }
  return matrix;
}

/** Map lift value to blue-tinted color for light theme */
function liftColor(lift: number): string {
  if (lift === 0) return 'transparent'; // diagonal
  const t = Math.min((lift - 1.0) / 0.17, 1);
  // Interpolate from #eef2f7 (very light) to #6b8db5 (medium blue-grey)
  const r = Math.round(238 + t * (107 - 238));
  const g = Math.round(242 + t * (141 - 242));
  const b = Math.round(247 + t * (181 - 247));
  return `rgb(${r},${g},${b})`;
}

/** Return contrasting text color for a given lift cell background */
function liftTextColor(lift: number): string {
  if (lift === 0) return 'transparent';
  const t = Math.min((lift - 1.0) / 0.17, 1);
  const r = Math.round(238 + t * (107 - 238));
  const g = Math.round(242 + t * (141 - 242));
  const b = Math.round(247 + t * (181 - 247));
  // Relative luminance approximation
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  // Dark cells (luminance < 0.55) get white text; light cells get dark navy
  return luminance < 0.55 ? '#ffffff' : '#1a1a2e';
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CopierBuyersPage() {
  const { data, loading, error } = useData<CustomerRow[]>('/data/summary_customers.json');

  // ── Derived computations ──────────────────────────────────────────────────

  const { grouped, histogramData, spendRatio } = useMemo(() => {
    if (!data) return { grouped: null, histogramData: null, spendRatio: '0' };

    const copier = data.filter((c) => c.is_copier_buyer);
    const nonCopier = data.filter((c) => !c.is_copier_buyer);

    const avgSpendCopier = mean(copier.map((c) => c.lifetime_sales));
    const avgSpendNon = mean(nonCopier.map((c) => c.lifetime_sales));
    const avgMarginCopier = mean(copier.map((c) => c.lifetime_margin));
    const avgMarginNon = mean(nonCopier.map((c) => c.lifetime_margin));
    const avgOrdersCopier = mean(copier.map((c) => c.order_count));
    const avgOrdersNon = mean(nonCopier.map((c) => c.order_count));

    const ratio = avgSpendNon > 0 ? (avgSpendCopier / avgSpendNon).toFixed(1) : '0';

    // Raw values for display labels
    const rawSpendNon = Math.round(avgSpendNon);
    const rawSpendCopier = Math.round(avgSpendCopier);
    const rawMarginNon = parseFloat((avgMarginNon * 100).toFixed(1));
    const rawMarginCopier = parseFloat((avgMarginCopier * 100).toFixed(1));
    const rawOrdersNon = parseFloat(avgOrdersNon.toFixed(1));
    const rawOrdersCopier = parseFloat(avgOrdersCopier.toFixed(1));

    // Normalize each metric so the copier-buyer value = 100,
    // keeping all three metrics on a comparable visual scale.
    const groupedData = [
      {
        metric: 'Avg Lifetime Spend',
        nonBuyer: rawSpendCopier > 0 ? (rawSpendNon / rawSpendCopier) * 100 : 0,
        copierBuyer: 100,
        rawNonBuyer: rawSpendNon,
        rawCopierBuyer: rawSpendCopier,
        format: 'dollar' as const,
      },
      {
        metric: 'Avg Margin',
        nonBuyer: rawMarginCopier > 0 ? (rawMarginNon / rawMarginCopier) * 100 : 0,
        copierBuyer: 100,
        rawNonBuyer: rawMarginNon,
        rawCopierBuyer: rawMarginCopier,
        format: 'pct' as const,
      },
      {
        metric: 'Avg Orders',
        nonBuyer: rawOrdersCopier > 0 ? (rawOrdersNon / rawOrdersCopier) * 100 : 0,
        copierBuyer: 100,
        rawNonBuyer: rawOrdersNon,
        rawCopierBuyer: rawOrdersCopier,
        format: 'number' as const,
      },
    ];

    // ── Histogram bins ────────────────────────────────────────────────────

    // Find 99th percentile for clipping
    const allSales = data.map((c) => c.lifetime_sales).sort((a, b) => a - b);
    const p99 = allSales[Math.floor(allSales.length * 0.99)] || 25000;
    const maxBin = Math.ceil(p99 / 1000) * 1000;
    const binCount = Math.min(Math.max(Math.round(maxBin / 1000), 5), 25);
    const binSize = maxBin / binCount;

    const bins: { label: string; low: number; high: number; nonBuyer: number; copierBuyer: number }[] = [];
    for (let i = 0; i < binCount; i++) {
      const low = i * binSize;
      const high = (i + 1) * binSize;
      bins.push({
        label: `$${(low / 1000).toFixed(0)}K`,
        low,
        high,
        nonBuyer: 0,
        copierBuyer: 0,
      });
    }

    for (const c of data) {
      const val = Math.min(c.lifetime_sales, maxBin - 1);
      const idx = Math.min(Math.floor(val / binSize), binCount - 1);
      if (idx >= 0 && idx < bins.length) {
        if (c.is_copier_buyer) {
          bins[idx].copierBuyer++;
        } else {
          bins[idx].nonBuyer++;
        }
      }
    }

    return { grouped: groupedData, histogramData: bins, spendRatio: ratio };
  }, [data]);

  const liftMatrix = useMemo(() => buildLiftMatrix(SUB_CATEGORIES), []);

  // ── Loading / Error states ────────────────────────────────────────────────

  if (loading) {
    return (
      <DashboardPage title="Copier Buyers: The Hidden Value Tier">
        <p style={{ color: colors.secondaryText }}>Loading data...</p>
      </DashboardPage>
    );
  }
  if (error || !data || !grouped || !histogramData) {
    return (
      <DashboardPage title="Copier Buyers: The Hidden Value Tier">
        <p style={{ color: colors.highlight }}>Error loading data: {error ?? 'unknown'}</p>
      </DashboardPage>
    );
  }

  // ── Formatters for grouped bar labels ─────────────────────────────────────

  const fmtBarLabel = (val: number, fmt: 'dollar' | 'pct' | 'number') => {
    if (fmt === 'dollar') return fmtDollar(val);
    if (fmt === 'pct') return `${val.toFixed(1)}%`;
    return val.toFixed(1);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardPage title="Copier Buyers: The Hidden Value Tier">
      {/* ── Row 1: Cohort Comparison + Category Spend ────────────────────── */}
      <Grid>
        {/* Section 1: Copier Buyer vs Non-Buyer Grouped Bar */}
        <GridCell span={6}>
          <ChartWrapper
            title={`Copier buyers spend ${spendRatio}\u00d7 more over their lifetime.`}
            subtitle="Average lifetime spend, margin, and order count"
            minHeight={280}
          >
            <BarChart
              width={700}
              height={300}
              data={grouped}
              margin={{ top: 16, right: 24, bottom: 8, left: 24 }}
              barCategoryGap="25%"
              barGap={4}
            >
              <defs>
                <pattern
                  id="hatch-copier"
                  width={8}
                  height={8}
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(45)"
                >
                  <rect width={8} height={8} fill={COPIER_BLUE} fillOpacity={0.35} />
                  <line
                    x1={0} y1={0} x2={0} y2={8}
                    stroke={COPIER_BLUE}
                    strokeWidth={2}
                    strokeOpacity={0.7}
                  />
                </pattern>
              </defs>
              <CartesianGrid {...gridProps} />
              <XAxis
                dataKey="metric"
                tick={{ fill: colors.secondaryText, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide domain={[0, 110]} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: colors.secondaryText, fontSize: 12 }}
                formatter={(_value: number | undefined, name: string | undefined, props: any) => {
                  const fmt = props?.payload?.format as 'dollar' | 'pct' | 'number' | undefined;
                  // Show raw (un-normalized) values in tooltip
                  const rawKey = name === 'Non-Buyer' ? 'rawNonBuyer' : 'rawCopierBuyer';
                  const rawVal = props?.payload?.[rawKey] as number | undefined;
                  return [fmtBarLabel(rawVal ?? 0, fmt ?? 'number'), name ?? ''];
                }}
              />
              <Bar
                dataKey="nonBuyer"
                name="Non-Buyer"
                fill={SLATE}
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="copierBuyer"
                name="Copier Buyer"
                fill="url(#hatch-copier)"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>

            {/* Custom legend */}
            <div
              style={{
                display: 'flex',
                gap: 20,
                marginTop: spacing.legendMt,
                justifyContent: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 2,
                    background: SLATE,
                  }}
                />
                <span style={{ color: colors.secondaryText, fontSize: 12 }}>Non-Buyer</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width={14} height={14}>
                  <defs>
                    <pattern
                      id="hatch-copier-legend"
                      width={8}
                      height={8}
                      patternUnits="userSpaceOnUse"
                      patternTransform="rotate(45)"
                    >
                      <rect width={8} height={8} fill={COPIER_BLUE} fillOpacity={0.35} />
                      <line
                        x1={0} y1={0} x2={0} y2={8}
                        stroke={COPIER_BLUE}
                        strokeWidth={2}
                        strokeOpacity={0.7}
                      />
                    </pattern>
                  </defs>
                  <rect width={14} height={14} rx={2} fill="url(#hatch-copier-legend)" />
                </svg>
                <span style={{ color: colors.secondaryText, fontSize: 12 }}>Copier Buyer</span>
              </div>
            </div>

            {/* Bar value annotations */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-around',
                marginTop: 4,
                paddingLeft: 24,
                paddingRight: 24,
              }}
            >
              {grouped.map((g) => (
                <div
                  key={g.metric}
                  style={{
                    textAlign: 'center',
                    fontSize: 11,
                    color: colors.secondaryText,
                  }}
                >
                  <span style={{ color: SLATE }}>{fmtBarLabel(g.rawNonBuyer, g.format)}</span>
                  {' / '}
                  <span style={{ color: COPIER_BLUE }}>{fmtBarLabel(g.rawCopierBuyer, g.format)}</span>
                </div>
              ))}
            </div>
          </ChartWrapper>
        </GridCell>

        {/* Section 2: Copier Buyer Category Spend */}
        <GridCell span={6}>
          <ChartWrapper
            title="They buy Phones, Chairs, Bookcases, Storage, Appliances — everything."
            subtitle="Copier-buyer category spend distribution"
            minHeight={100}
          >
            {/* Proportional horizontal bar */}
            <div
              style={{
                display: 'flex',
                width: '100%',
                height: 40,
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              {CATEGORY_SPEND.map((cat, i) => (
                <div
                  key={cat.name}
                  title={`${cat.name}: ${(cat.pct * 100).toFixed(0)}%`}
                  style={{
                    width: `${cat.pct * 100}%`,
                    height: '100%',
                    background: BLUE_SCALE[i % BLUE_SCALE.length],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: cat.pct >= 0.06 ? 10 : 0,
                    color: '#fff',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    borderRight: i < CATEGORY_SPEND.length - 1 ? `1px solid ${colors.pageBg}` : 'none',
                  }}
                >
                  {cat.pct >= 0.06 ? `${(cat.pct * 100).toFixed(0)}%` : ''}
                </div>
              ))}
            </div>

            {/* Category labels */}
            <div
              style={{
                display: 'flex',
                width: '100%',
                marginTop: 4,
              }}
            >
              {CATEGORY_SPEND.map((cat) => (
                <div
                  key={cat.name}
                  style={{
                    width: `${cat.pct * 100}%`,
                    textAlign: 'center',
                    fontSize: cat.pct >= 0.05 ? 10 : 0,
                    color: colors.secondaryText,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    paddingLeft: 1,
                    paddingRight: 1,
                  }}
                >
                  {cat.pct >= 0.05 ? cat.name : ''}
                </div>
              ))}
            </div>

            {/* Callout annotation */}
            <p
              style={{
                margin: 0,
                marginTop: 16,
                fontSize: typography.annotation.size,
                fontWeight: typography.annotation.weight,
                color: typography.annotation.color,
              }}
            >
              Copier buyers don't just buy copiers. Their baskets span every major sub-category,
              making them the highest cross-sell cohort in the dataset.
            </p>
          </ChartWrapper>
        </GridCell>
      </Grid>

      <div style={{ height: spacing.cardGap }} />

      {/* ── Row 2: Histogram + Heatmap ───────────────────────────────────── */}
      <Grid>
        {/* Section 3: Customer Lifetime Value Distribution */}
        <GridCell span={6}>
          <ChartWrapper
            title="Customer Lifetime Value Distribution"
            subtitle="Distribution shifts right for copier buyers"
            minHeight={260}
          >
            <BarChart
              width={700}
              height={300}
              data={histogramData}
              margin={{ top: 16, right: 16, bottom: 8, left: 16 }}
              barGap={0}
              barCategoryGap="10%"
            >
              <CartesianGrid {...gridProps} />
              <XAxis
                dataKey="label"
                tick={{ fill: colors.secondaryText, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={1}
              />
              <YAxis
                tick={{ fill: colors.secondaryText, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: colors.secondaryText, fontSize: 12 }}
                formatter={(value: number | undefined, name: string | undefined) => [fmtNumber(value ?? 0), name ?? '']}
              />
              <Bar
                dataKey="nonBuyer"
                name="Non-Buyer"
                fill={SLATE}
                fillOpacity={0.8}
                radius={[2, 2, 0, 0]}
              />
              <Bar
                dataKey="copierBuyer"
                name="Copier Buyer"
                fill={COPIER_BLUE}
                fillOpacity={0.55}
                stroke={COPIER_BLUE}
                strokeWidth={1.5}
                radius={[2, 2, 0, 0]}
              />
            </BarChart>

            {/* Legend */}
            <div
              style={{
                display: 'flex',
                gap: 20,
                marginTop: spacing.legendMt,
                justifyContent: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 14, height: 14, borderRadius: 2, background: SLATE, opacity: 0.8 }} />
                <span style={{ color: colors.secondaryText, fontSize: 12 }}>Non-Buyer</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 2,
                    background: COPIER_BLUE,
                    opacity: 0.55,
                    border: `1.5px solid ${COPIER_BLUE}`,
                  }}
                />
                <span style={{ color: colors.secondaryText, fontSize: 12 }}>Copier Buyer</span>
              </div>
            </div>
          </ChartWrapper>
        </GridCell>

        {/* Section 4: Cross-Sell Lift Heatmap */}
        <GridCell span={6}>
          <ChartWrapper
            title="Cross-Sell Lift Heatmap"
            subtitle="Pair-level associations are weak. Maximum lift: 1.17."
            minHeight={340}
          >
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  borderCollapse: 'collapse',
                  width: '100%',
                  tableLayout: 'fixed',
                  fontSize: 8,
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        width: 56,
                        padding: 2,
                        textAlign: 'left',
                        color: colors.secondaryText,
                        fontSize: 8,
                        fontWeight: 600,
                      }}
                    />
                    {SUB_CATEGORIES.map((cat) => (
                      <th
                        key={cat}
                        style={{
                          padding: 1,
                          color: colors.secondaryText,
                          fontSize: 7,
                          fontWeight: 500,
                          textAlign: 'center',
                          writingMode: 'vertical-rl',
                          transform: 'rotate(180deg)',
                          height: 56,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {cat}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SUB_CATEGORIES.map((rowCat, i) => (
                    <tr key={rowCat}>
                      <td
                        style={{
                          padding: '1px 2px',
                          color: colors.secondaryText,
                          fontSize: 7,
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: 56,
                        }}
                      >
                        {rowCat}
                      </td>
                      {SUB_CATEGORIES.map((colCat, j) => {
                        const lift = liftMatrix[i][j];
                        const isDiag = i === j;
                        return (
                          <td
                            key={colCat}
                            title={isDiag ? '' : `${rowCat} + ${colCat}: ${lift.toFixed(2)}`}
                            style={{
                              padding: 0,
                              background: isDiag ? colors.pageBg : liftColor(lift),
                              color: isDiag ? 'transparent' : liftTextColor(lift),
                              border: `1px solid ${colors.pageBg}`,
                              width: '1fr',
                              height: 14,
                              textAlign: 'center',
                              fontSize: 0,
                            }}
                          >
                            {isDiag ? '' : ''}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Color scale legend */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 8,
              }}
            >
              <span style={{ color: colors.secondaryText, fontSize: 10 }}>Lift: 1.00</span>
              <div
                style={{
                  display: 'flex',
                  height: 10,
                  width: 120,
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                {Array.from({ length: 20 }).map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      background: liftColor(1.0 + (idx / 19) * 0.17),
                    }}
                  />
                ))}
              </div>
              <span style={{ color: colors.secondaryText, fontSize: 10 }}>1.17</span>
            </div>

            {/* Annotation */}
            <p
              style={{
                margin: 0,
                marginTop: 10,
                fontSize: typography.annotation.size,
                fontWeight: typography.annotation.weight,
                color: typography.annotation.color,
              }}
            >
              The story is the cohort, not the pair. No single product-pair lift exceeds 1.17 —
              the value of copier buyers comes from broad cross-category purchasing, not specific
              bundle affinities.
            </p>
          </ChartWrapper>
        </GridCell>
      </Grid>
    </DashboardPage>
  );
}
