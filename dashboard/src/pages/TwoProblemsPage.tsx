/**
 * Page 2 — The Two Discount Problems
 *
 * Argument: $813K of profit is destroyed by discounting, but the cause splits
 * into two structurally different problems — fixed-policy losses and variable
 * over-discounting — each requiring a different fix.
 */

import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { colors, typography, spacing } from '../lib/theme';
import {
  ChartWrapper,
  tooltipStyle,
  gridProps,
  DashboardPage,
  Grid,
  GridCell,
  StripPlot,
  WaterfallChart,
} from '../components';
import { useData } from '../hooks/useData';
import { fmtDollar, fmtPct, fmtNumber } from '../lib/format';
import type { DiscountRow, CountryRegimeRow, YearFilter, PageId } from '../lib/types';

// ─── Band ordering ─────────────────────────────────────────────────────────

const BAND_ORDER = ['None', '1\u201315%', '16\u201330%', '31\u201350%', '51%+'];

// ─── Helpers ───────────────────────────────────────────────────────────────

function quartersForYear(year: YearFilter): string[] | null {
  if (year === 'All') return null;
  return [`${year}-Q1`, `${year}-Q2`, `${year}-Q3`, `${year}-Q4`];
}

interface BandAgg {
  band: string;
  order_count: number;
  profit: number;
  /** Weighted margin is computed from total profit / total implied revenue */
  margin_pct: number;
}

function aggregateByBand(rows: DiscountRow[]): BandAgg[] {
  const map = new Map<string, { order_count: number; profit: number; marginWeightedSum: number; weightSum: number }>();
  for (const r of rows) {
    const existing = map.get(r.discount_band);
    if (existing) {
      existing.order_count += r.order_count;
      existing.profit += r.profit;
      existing.marginWeightedSum += r.margin_pct * r.order_count;
      existing.weightSum += r.order_count;
    } else {
      map.set(r.discount_band, {
        order_count: r.order_count,
        profit: r.profit,
        marginWeightedSum: r.margin_pct * r.order_count,
        weightSum: r.order_count,
      });
    }
  }
  return BAND_ORDER.map((band) => {
    const agg = map.get(band);
    if (!agg) return { band, order_count: 0, profit: 0, margin_pct: 0 };
    return {
      band,
      order_count: agg.order_count,
      profit: agg.profit,
      margin_pct: agg.weightSum > 0 ? agg.marginWeightedSum / agg.weightSum : 0,
    };
  });
}

// ─── Props ─────────────────────────────────────────────────────────────────

interface TwoProblemsPageProps {
  year: YearFilter;
  onNavigate: (page: PageId) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function TwoProblemsPage({ year, onNavigate }: TwoProblemsPageProps) {
  const { data: discountData, loading: dLoading } = useData<DiscountRow[]>('/data/summary_discount.json');
  const { data: countryData, loading: cLoading } = useData<CountryRegimeRow[]>('/data/summary_country_regime.json');

  const [selectedBand, setSelectedBand] = useState<string | null>(null);

  // ── Filter discount data by year ────────────────────────────────────────
  const filteredDiscount = useMemo(() => {
    if (!discountData) return [];
    const quarters = quartersForYear(year);
    if (!quarters) return discountData;
    return discountData.filter((r) => quarters.includes(r.year_quarter));
  }, [discountData, year]);

  // ── Aggregate discount bands ────────────────────────────────────────────
  const bandData = useMemo(() => aggregateByBand(filteredDiscount), [filteredDiscount]);

  // ── Fixed-policy vs variable losses ─────────────────────────────────────
  const { fixedLoss, variableLoss, totalLoss } = useMemo(() => {
    if (!countryData) return { fixedLoss: 0, variableLoss: 0, totalLoss: 0 };

    // Fixed losses: sum of annual_loss for countries with Fixed regime
    const fixed = countryData
      .filter((c) => c.discount_regime === 'Fixed')
      .reduce((sum, c) => sum + c.annual_loss, 0);

    // Total discount losses: sum of negative profits across all discount bands
    // (excluding "None" band) from filtered discount data
    const totalDiscountLoss = bandData
      .filter((b) => b.band !== 'None' && b.profit < 0)
      .reduce((sum, b) => sum + Math.abs(b.profit), 0);

    // Scale annual_loss to match the filtered year: if showing a single year, use annual_loss as-is.
    // If showing All (4 years), annual_loss is already per-year, so multiply by 4 to get total.
    const yearMultiplier = year === 'All' ? 4 : 1;
    const scaledFixed = fixed * yearMultiplier;

    // Variable loss = total discount losses minus fixed losses
    const variable = Math.max(0, totalDiscountLoss - scaledFixed);

    return {
      fixedLoss: Math.round(scaledFixed),
      variableLoss: Math.round(variable),
      totalLoss: Math.round(scaledFixed + variable),
    };
  }, [countryData, bandData, year]);

  // ── Potential profit (sum all profit) ───────────────────────────────────
  const potentialProfit = useMemo(() => {
    const total = bandData.reduce((sum, b) => sum + b.profit, 0);
    const losses = bandData
      .filter((b) => b.band !== 'None' && b.profit < 0)
      .reduce((sum, b) => sum + Math.abs(b.profit), 0);
    return Math.round(total + losses);
  }, [bandData]);

  // ── Strip plot data ─────────────────────────────────────────────────────
  const stripData = useMemo(() => {
    if (!countryData) return [];
    return countryData
      .filter((c) => c.discount_regime !== 'Zero discount')
      .map((c) => ({
        country: c.country,
        discount: c.discount_regime === 'Fixed'
          ? (c.fixed_discount_rate ?? 0)
          : 0.05 + (hashCode(c.country) % 100) / 500, // small spread near 0 for variable
        margin: c.margin_pct,
        regime: (c.discount_regime === 'Fixed' ? 'fixed' : 'variable') as 'fixed' | 'variable',
      }));
  }, [countryData]);

  // ── Waterfall data ──────────────────────────────────────────────────────
  const waterfallData = useMemo(() => [
    { name: 'Potential Profit', value: potentialProfit, type: 'total' as const },
    { name: 'Fixed-Policy Loss', value: -fixedLoss, type: 'negative' as const },
    { name: 'Variable Loss', value: -variableLoss, type: 'negative' as const },
    { name: 'Actual Profit', value: 0, type: 'result' as const },
  ], [potentialProfit, fixedLoss, variableLoss]);

  // ── Loading state ───────────────────────────────────────────────────────
  if (dLoading || cLoading) {
    return (
      <DashboardPage title="Page 2: The Two Discount Problems">
        <p style={{ color: colors.secondaryText }}>Loading data...</p>
      </DashboardPage>
    );
  }

  // ── Compute split bar proportions ───────────────────────────────────────
  const fixedPct = totalLoss > 0 ? (fixedLoss / totalLoss) * 100 : 50;
  const variablePct = 100 - fixedPct;

  // ── Margin chart title ──────────────────────────────────────────────────
  const worstBand = bandData.reduce((worst, b) =>
    b.margin_pct < worst.margin_pct ? b : worst, bandData[0]);
  const marginChartTitle = `Anything above ~25% discount is underwater (worst: ${worstBand?.band} at ${fmtPct(worstBand?.margin_pct ?? 0)} margin)`;

  return (
    <DashboardPage title="Page 2: The Two Discount Problems">
      {/* ── Row 1: Split bar + Margin by discount band ─────────────────── */}
      <Grid>
        {/* Section 1: The Split (50% width) */}
        <GridCell span={6}>
          <ChartWrapper
            title="Two problems. One number hides them both."
            minHeight={80}
          >
            {/* Total label */}
            <p style={{
              margin: 0,
              marginBottom: 8,
              fontSize: typography.annotation.size,
              fontWeight: typography.annotation.weight,
              color: colors.emphasisText,
            }}>
              {fmtDollar(totalLoss)} destroyed by discounting.
            </p>

            {/* Proportional bar via CSS flexbox */}
            <div style={{ display: 'flex', height: 36, borderRadius: 4, overflow: 'hidden' }}>
              {/* Fixed-policy loss segment with hatch pattern */}
              <div
                style={{
                  width: `${fixedPct}%`,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* SVG hatch background */}
                <svg
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <pattern
                      id="split-hatch"
                      width={12}
                      height={12}
                      patternUnits="userSpaceOnUse"
                      patternTransform="rotate(45)"
                    >
                      <rect width={12} height={12} fill={colors.highlight} />
                      <line x1={0} y1={0} x2={0} y2={12} stroke={colors.hatchStroke} strokeWidth={3} />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#split-hatch)" />
                </svg>
                <div style={{
                  position: 'relative',
                  zIndex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  fontSize: typography.footnote.size,
                  fontWeight: 600,
                  color: '#fff',
                  textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                  whiteSpace: 'nowrap',
                  padding: '0 6px',
                }}>
                  Fixed: {fmtDollar(fixedLoss)}
                </div>
              </div>

              {/* Variable over-discount loss segment */}
              <div
                style={{
                  width: `${variablePct}%`,
                  background: '#f97316',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: typography.footnote.size,
                  fontWeight: 600,
                  color: '#fff',
                  textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                  whiteSpace: 'nowrap',
                  padding: '0 6px',
                }}
              >
                Variable: {fmtDollar(variableLoss)}
              </div>
            </div>

            {/* Legend */}
            <div style={{
              display: 'flex',
              gap: 16,
              marginTop: 8,
              fontSize: typography.footnote.size,
              color: colors.secondaryText,
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{
                  display: 'inline-block', width: 12, height: 12,
                  background: `repeating-linear-gradient(45deg, ${colors.highlight}, ${colors.highlight} 2px, ${colors.hatchStroke} 2px, ${colors.hatchStroke} 4px)`,
                  borderRadius: 2,
                }} />
                Fixed-policy loss
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{
                  display: 'inline-block', width: 12, height: 12,
                  background: '#f97316',
                  borderRadius: 2,
                }} />
                Variable over-discount loss
              </span>
            </div>
          </ChartWrapper>
        </GridCell>

        {/* Section 2: Margin by Discount Band (diverging horizontal bar) */}
        <GridCell span={6}>
          <ChartWrapper
            title={marginChartTitle}
            subtitle={year === 'All' ? 'Margin by discount band, 2011\u20132014' : `Margin by discount band, ${year}`}
            minHeight={240}
          >
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={bandData}
                layout="vertical"
                margin={{ top: 8, right: 60, bottom: 8, left: 60 }}
              >
                <CartesianGrid {...gridProps} horizontal={false} vertical={true} />
                <XAxis
                  type="number"
                  tick={{ fill: typography.axisLabel.color, fontSize: typography.axisLabel.size }}
                  axisLine={false}
                  tickFormatter={(v: number) => fmtPct(v)}
                />
                <YAxis
                  type="category"
                  dataKey="band"
                  tick={{ fill: typography.axisLabel.color, fontSize: typography.axisLabel.size }}
                  axisLine={false}
                  width={60}
                />
                <ReferenceLine x={0} stroke={colors.muted} strokeDasharray="3 3" />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: typography.tooltipLabel.color, fontSize: typography.tooltipLabel.size }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(_value: any, _name: any, props: any) => {
                    const entry = props.payload as BandAgg;
                    return [
                      `${fmtPct(entry.margin_pct)} margin | ${fmtDollar(entry.profit)} profit | ${fmtNumber(entry.order_count)} orders`,
                      entry.band,
                    ];
                  }}
                />
                <Bar
                  dataKey="margin_pct"
                  isAnimationActive={false}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onClick={(entry: any) => {
                    const band = (entry as BandAgg).band;
                    setSelectedBand(selectedBand === band ? null : band);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {bandData.map((entry, i) => {
                    const isSelected = selectedBand === null || selectedBand === entry.band;
                    const fill = entry.margin_pct < 0 ? 'url(#hatch-loss)' : colors.neutral;
                    return (
                      <Cell
                        key={i}
                        fill={selectedBand !== null && selectedBand === entry.band ? colors.selection : fill}
                        opacity={isSelected ? 1 : 0.25}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* Annotation at the 31-50% band */}
            <p style={{
              margin: 0,
              marginTop: 4,
              fontSize: typography.footnote.size,
              fontWeight: typography.annotation.weight,
              color: colors.secondaryText,
              fontStyle: 'italic',
            }}>
              Breakeven cliff: anything above ~25% discount is underwater.
            </p>
          </ChartWrapper>
        </GridCell>
      </Grid>

      {/* ── Row 2: Country Regime Strip Plot (full width) ──────────────── */}
      <div style={{ marginTop: spacing.cardGap }}>
        <Grid>
          <GridCell span={12}>
            <ChartWrapper
              title="No human sets exactly 60% on 1,378 consecutive orders. These are system configurations."
              subtitle="Each dot is a country. X = discount rate, Y = margin. Diamonds = fixed regime."
              minHeight={320}
            >
              <ResponsiveContainer width="100%" height={320}>
                <StripPlot
                  data={stripData}
                  width={720}
                  height={320}
                  title=""
                />
              </ResponsiveContainer>
            </ChartWrapper>
          </GridCell>
        </Grid>
      </div>

      {/* ── Row 3: Profit Waterfall (full width) ───────────────────────── */}
      <div style={{ marginTop: spacing.cardGap }}>
        <Grid>
          <GridCell span={12}>
            <WaterfallChart
              data={waterfallData}
              width={900}
              height={280}
              title="Two distinct blocks of erasure."
              subtitle={`Potential profit reduced by ${fmtDollar(totalLoss)} across two structurally different discount problems`}
              formatValue={(v) => fmtDollar(v)}
              onBlockClick={(d) => {
                if (d.name === 'Fixed-Policy Loss') onNavigate('fixed-policies');
                if (d.name === 'Variable Loss') onNavigate('products-people');
              }}
            />
          </GridCell>
        </Grid>
      </div>

      {/* ── Narrative footer ───────────────────────────────────────────── */}
      <div style={{ marginTop: spacing.cardGap }}>
        <p style={{
          color: colors.secondaryText,
          fontSize: typography.chartSubtitle.size,
          fontWeight: typography.chartSubtitle.weight,
          lineHeight: 1.6,
          maxWidth: 720,
        }}>
          Where are the fixed-policy countries, and why does this look like a configuration,
          not a strategy?
        </p>
      </div>
    </DashboardPage>
  );
}

// ─── Deterministic hash (mirrors StripPlot) ─────────────────────────────────

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
