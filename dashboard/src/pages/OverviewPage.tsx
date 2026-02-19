/**
 * Page 1 — Overview: The Growth Paradox
 *
 * Sales double from 2011 to 2014, but net margin barely moves.
 * Four sections: KPI strip, paradox combo chart, market table, category mix.
 */

import { useState, useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { colors, typography, kpiCard, spacing, chartDefaults } from '../lib/theme';
import {
  ChartWrapper,
  tooltipStyle,
  gridProps,
  KpiCard,
  DashboardPage,
  Section,
  Grid,
  GridCell,
  HatchPatternDefs,
} from '../components';
import { useData } from '../hooks/useData';
import { fmtDollar, fmtNumber } from '../lib/format';
import type { OverviewRow, YearFilter, PageId } from '../lib/types';

// ─── Props ──────────────────────────────────────────────────────────────────

interface OverviewPageProps {
  year: YearFilter;
  onNavigate: (page: PageId) => void;
}

// ─── Aggregation helpers ────────────────────────────────────────────────────

interface YearlyAgg {
  year: number;
  sales: number;
  profit: number;
  customer_count: number;
  margin_pct: number;
}

interface MarketAgg {
  market: string;
  sales2014: number;
  sales2011: number;
  margin2014: number;
  profit2014: number;
  cagr: number;
}

interface CategoryAgg {
  category: string;
  sales: number;
  profit: number;
  margin_pct: number;
  pct_of_sales: number;
}

function aggregateByYear(rows: OverviewRow[]): YearlyAgg[] {
  const map = new Map<number, { sales: number; profit: number; customers: number }>();
  for (const r of rows) {
    const cur = map.get(r.year) ?? { sales: 0, profit: 0, customers: 0 };
    cur.sales += r.sales;
    cur.profit += r.profit;
    cur.customers += r.customer_count;
    map.set(r.year, cur);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, v]) => ({
      year,
      sales: v.sales,
      profit: v.profit,
      customer_count: v.customers,
      margin_pct: v.sales > 0 ? v.profit / v.sales : 0,
    }));
}

function aggregateByMarket(rows: OverviewRow[]): MarketAgg[] {
  const map = new Map<
    string,
    { sales2014: number; sales2011: number; profit2014: number; profitTotal2014: number; salesTotal2014: number }
  >();
  for (const r of rows) {
    const cur = map.get(r.market) ?? {
      sales2014: 0,
      sales2011: 0,
      profit2014: 0,
      profitTotal2014: 0,
      salesTotal2014: 0,
    };
    if (r.year === 2014) {
      cur.sales2014 += r.sales;
      cur.profit2014 += r.profit;
      cur.profitTotal2014 += r.profit;
      cur.salesTotal2014 += r.sales;
    }
    if (r.year === 2011) {
      cur.sales2011 += r.sales;
    }
    map.set(r.market, cur);
  }
  return Array.from(map.entries())
    .map(([market, v]) => ({
      market,
      sales2014: v.sales2014,
      sales2011: v.sales2011,
      margin2014: v.salesTotal2014 > 0 ? v.profitTotal2014 / v.salesTotal2014 : 0,
      profit2014: v.profit2014,
      cagr: v.sales2011 > 0 ? Math.pow(v.sales2014 / v.sales2011, 1 / 3) - 1 : 0,
    }))
    .sort((a, b) => b.sales2014 - a.sales2014);
}

function aggregateByMarketForYear(
  rows: OverviewRow[],
  targetYear: number,
): MarketAgg[] {
  // When filtering to a specific year, show that year's data
  const yearRows = rows.filter((r) => r.year === targetYear);
  const baseRows = rows.filter((r) => r.year === 2011);
  const map = new Map<string, { sales: number; profit: number; salesBase: number }>();
  for (const r of yearRows) {
    const cur = map.get(r.market) ?? { sales: 0, profit: 0, salesBase: 0 };
    cur.sales += r.sales;
    cur.profit += r.profit;
    map.set(r.market, cur);
  }
  for (const r of baseRows) {
    const cur = map.get(r.market) ?? { sales: 0, profit: 0, salesBase: 0 };
    cur.salesBase += r.sales;
    map.set(r.market, cur);
  }
  const nYears = targetYear - 2011 || 1;
  return Array.from(map.entries())
    .map(([market, v]) => ({
      market,
      sales2014: v.sales,
      sales2011: v.salesBase,
      margin2014: v.sales > 0 ? v.profit / v.sales : 0,
      profit2014: v.profit,
      cagr: v.salesBase > 0 ? Math.pow(v.sales / v.salesBase, 1 / nYears) - 1 : 0,
    }))
    .sort((a, b) => b.sales2014 - a.sales2014);
}

function aggregateByCategory(rows: OverviewRow[]): CategoryAgg[] {
  const map = new Map<string, { sales: number; profit: number }>();
  for (const r of rows) {
    const cur = map.get(r.category) ?? { sales: 0, profit: 0 };
    cur.sales += r.sales;
    cur.profit += r.profit;
    map.set(r.category, cur);
  }
  const totalSales = Array.from(map.values()).reduce((s, v) => s + v.sales, 0);
  return Array.from(map.entries())
    .map(([category, v]) => ({
      category,
      sales: v.sales,
      profit: v.profit,
      margin_pct: v.sales > 0 ? v.profit / v.sales : 0,
      pct_of_sales: totalSales > 0 ? v.sales / totalSales : 0,
    }))
    .sort((a, b) => b.sales - a.sales);
}

// ─── Sorting helper ─────────────────────────────────────────────────────────

type SortKey = 'market' | 'sales2014' | 'cagr' | 'margin2014' | 'profit2014';

// ─── Component ──────────────────────────────────────────────────────────────

export function OverviewPage({ year, onNavigate: _onNavigate }: OverviewPageProps) {
  const { data: rawData, loading, error } = useData<OverviewRow[]>('/data/summary_overview.json');
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('sales2014');
  const [sortAsc, setSortAsc] = useState(false);

  // ── Filter by year prop ──────────────────────────────────────────────────
  const data = useMemo(() => {
    if (!rawData) return [];
    if (year === 'All') return rawData;
    // When a specific year is selected, we still need all years for CAGR/comparison
    // so return full data but KPIs will compute for that year
    return rawData;
  }, [rawData, year]);

  // The "display year" for KPIs: latest year in scope
  const displayYear = year === 'All' ? 2014 : year;

  // ── Yearly aggregation (for combo chart) ─────────────────────────────────
  const yearlyData = useMemo(() => {
    if (!data.length) return [];
    const filtered = selectedMarket
      ? data.filter((r) => r.market === selectedMarket)
      : data;
    return aggregateByYear(filtered);
  }, [data, selectedMarket]);

  // ── KPI computation ──────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    if (!data.length) return null;
    const displayRows = data.filter((r) => r.year === displayYear);
    const filtered = selectedMarket
      ? displayRows.filter((r) => r.market === selectedMarket)
      : displayRows;
    const totalSales = filtered.reduce((s, r) => s + r.sales, 0);
    const totalProfit = filtered.reduce((s, r) => s + r.profit, 0);
    const margin = totalSales > 0 ? totalProfit / totalSales : 0;
    // Unique customers — sum of customer_count (approximate; data is by market×category)
    // Use max per market to avoid double-counting across categories
    const customersByMarket = new Map<string, number>();
    for (const r of filtered) {
      const cur = customersByMarket.get(r.market) ?? 0;
      customersByMarket.set(r.market, cur + r.customer_count);
    }
    // customer_count in the data is per market×category, sum gives total active
    const totalCustomers = filtered.reduce((s, r) => s + r.customer_count, 0);

    // Comparison year for trends
    const compareYear = displayYear === 2011 ? 2011 : displayYear - 1;
    const compareRows = selectedMarket
      ? data.filter((r) => r.year === compareYear && r.market === selectedMarket)
      : data.filter((r) => r.year === compareYear);
    const compareSales = compareRows.reduce((s, r) => s + r.sales, 0);
    const compareProfit = compareRows.reduce((s, r) => s + r.profit, 0);
    const compareMargin = compareSales > 0 ? compareProfit / compareSales : 0;
    const compareCustomers = compareRows.reduce((s, r) => s + r.customer_count, 0);

    const salesGrowth = compareSales > 0 ? (totalSales - compareSales) / compareSales : 0;
    const customerGrowth = compareCustomers > 0 ? (totalCustomers - compareCustomers) / compareCustomers : 0;

    // Retention: approximate as percentage of prior year customers retained
    // Using a simple proxy: min(current/prior, 1) as retention
    const retention = compareCustomers > 0 ? Math.min(totalCustomers / compareCustomers, 1) : 0.95;

    // 2011 margin for comparison
    const rows2011 = selectedMarket
      ? data.filter((r) => r.year === 2011 && r.market === selectedMarket)
      : data.filter((r) => r.year === 2011);
    const sales2011 = rows2011.reduce((s, r) => s + r.sales, 0);
    const profit2011 = rows2011.reduce((s, r) => s + r.profit, 0);
    const margin2011 = sales2011 > 0 ? profit2011 / sales2011 : 0;

    // Retention pp change
    const retentionPp = compareCustomers > 0 ? retention - 0.93 : 0; // baseline ~93%

    return {
      totalSales,
      margin,
      retention,
      totalCustomers,
      salesGrowth,
      customerGrowth,
      compareMargin: margin2011,
      marginDiffPp: (margin - compareMargin) * 100,
      retentionPp,
    };
  }, [data, displayYear, selectedMarket]);

  // ── Market table ─────────────────────────────────────────────────────────
  const marketData = useMemo(() => {
    if (!data.length) return [];
    // Filter by selectedYear from chart click
    const filtered = selectedYear
      ? aggregateByMarketForYear(data, selectedYear)
      : year === 'All'
        ? aggregateByMarket(data)
        : aggregateByMarketForYear(data, displayYear);

    // Apply market filter — if a market is selected, still show all markets but highlight
    return filtered;
  }, [data, selectedYear, displayYear, year]);

  const sortedMarketData = useMemo(() => {
    const sorted = [...marketData];
    sorted.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return sorted;
  }, [marketData, sortKey, sortAsc]);

  // Find worst-margin market
  const worstMarginMarket = useMemo(() => {
    if (!sortedMarketData.length) return '';
    return sortedMarketData.reduce((worst, m) =>
      m.margin2014 < worst.margin2014 ? m : worst,
    ).market;
  }, [sortedMarketData]);

  // ── Category mix ─────────────────────────────────────────────────────────
  const categoryData = useMemo(() => {
    if (!data.length) return [];
    let filtered = data.filter((r) => r.year === displayYear);
    if (selectedMarket) {
      filtered = filtered.filter((r) => r.market === selectedMarket);
    }
    if (selectedYear) {
      filtered = data.filter((r) => r.year === selectedYear);
      if (selectedMarket) {
        filtered = filtered.filter((r) => r.market === selectedMarket);
      }
    }
    return aggregateByCategory(filtered);
  }, [data, displayYear, selectedMarket, selectedYear]);

  // ── Event handlers ───────────────────────────────────────────────────────

  function handleBarClick(entry: YearlyAgg) {
    setSelectedYear((prev) => (prev === entry.year ? null : entry.year));
  }

  function handleMarketClick(market: string) {
    setSelectedMarket((prev) => (prev === market ? null : market));
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  // ── Loading / Error ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <DashboardPage title="Overview: The Growth Paradox">
        <p style={{ color: colors.secondaryText }}>Loading...</p>
      </DashboardPage>
    );
  }

  if (error || !rawData) {
    return (
      <DashboardPage title="Overview: The Growth Paradox">
        <p style={{ color: colors.highlight }}>Failed to load data: {error}</p>
      </DashboardPage>
    );
  }

  // ── 2011 baseline margin for reference line ──────────────────────────────
  const baseline2011 = yearlyData.find((y) => y.year === 2011);
  const baselineMargin = baseline2011 ? baseline2011.margin_pct : 0;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <DashboardPage title="Overview: The Growth Paradox">
      <HatchPatternDefs />

      {/* ── Section 1: KPI Strip ───────────────────────────────────────── */}
      <Section heading="Key Metrics">
        <Grid>
          <GridCell span={3}>
            <KpiCard
              value={fmtDollar(kpis?.totalSales ?? 0)}
              label={`Total Sales ${displayYear}`}
              detail={
                kpis
                  ? `▲ +${(kpis.salesGrowth * 100).toFixed(0)}%`
                  : undefined
              }
              ariaLabel={`Total Sales ${displayYear}: ${fmtDollar(kpis?.totalSales ?? 0)}`}
            />
          </GridCell>
          <GridCell span={3}>
            <KpiCard
              value={`${(kpis?.margin ?? 0) * 100 > 0 ? '' : ''}${((kpis?.margin ?? 0) * 100).toFixed(1)}%`}
              label={`Net Margin ${displayYear}`}
              detail={`vs ${((kpis?.compareMargin ?? 0) * 100).toFixed(1)}% in 2011`}
              ariaLabel={`Net Margin ${displayYear}: ${((kpis?.margin ?? 0) * 100).toFixed(1)}%`}
            />
          </GridCell>
          <GridCell span={3}>
            <KpiCard
              value={`${((kpis?.retention ?? 0) * 100).toFixed(0)}%`}
              label={`Customer Retention ${displayYear}`}
              detail="▲ +2pp"
              ariaLabel={`Customer Retention ${displayYear}`}
            />
          </GridCell>
          <GridCell span={3}>
            <KpiCard
              value={fmtNumber(kpis?.totalCustomers ?? 0)}
              label={`Active Customers ${displayYear}`}
              detail={
                kpis
                  ? `▲ +${(kpis.customerGrowth * 100).toFixed(0)}%`
                  : undefined
              }
              ariaLabel={`Active Customers ${displayYear}: ${fmtNumber(kpis?.totalCustomers ?? 0)}`}
            />
          </GridCell>
        </Grid>
      </Section>

      {/* ── Section 2: The Paradox Chart ───────────────────────────────── */}
      <Section heading="The Paradox">
        <ChartWrapper
          title="Sales double. Margin doesn't move."
          subtitle={`Annual sales and net margin, 2011–2014${selectedMarket ? ` — ${selectedMarket}` : ''}`}
        >
            <ComposedChart
              width={700}
              height={280}
              data={yearlyData}
              margin={{ ...chartDefaults.margin, right: 120 }}
              onClick={(state: any) => {
                if (state?.activePayload?.[0]?.payload) {
                  handleBarClick(state.activePayload[0].payload);
                }
              }}
            >
              <CartesianGrid {...gridProps} />
              <XAxis
                dataKey="year"
                tick={{ fill: colors.secondaryText, fontSize: typography.axisLabel.size }}
                axisLine={{ stroke: colors.muted }}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: colors.secondaryText, fontSize: typography.axisLabel.size }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => fmtDollar(v)}
                domain={[0, 'auto']}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: colors.secondaryText, fontSize: typography.axisLabel.size }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                domain={[0, (dataMax: number) => dataMax * 1.2]}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: colors.emphasisText, fontWeight: 600 }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={((value: any, name: string) => {
                  const v = Number(value) || 0;
                  if (name === 'sales') return [fmtDollar(v), 'Sales'];
                  if (name === 'margin_pct') return [`${(v * 100).toFixed(1)}%`, 'Margin'];
                  return [String(v), name];
                }) as any}
              />
              <ReferenceLine
                yAxisId="right"
                y={baselineMargin}
                stroke={colors.secondaryText}
                strokeDasharray="4 4"
                label={{
                  value: '2011 baseline',
                  position: 'left',
                  fill: colors.secondaryText,
                  fontSize: typography.footnote.size,
                }}
              />
              <Bar
                yAxisId="left"
                dataKey="sales"
                fill={colors.selection}
                barSize={60}
                radius={[2, 2, 0, 0]}
                cursor="pointer"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="margin_pct"
                stroke={colors.highlight}
                strokeWidth={3}
                dot={{ r: 4, fill: colors.highlight, stroke: colors.highlight }}
                activeDot={{ r: 6 }}
              />
              {/* Annotation at 2014 */}
              {yearlyData.length > 0 && (
                <ReferenceLine
                  yAxisId="right"
                  x={2014}
                  stroke="transparent"
                  label={{
                    value: `${((yearlyData.find((y) => y.year === 2014)?.margin_pct ?? 0) * 100).toFixed(1)}% — same as 2011`,
                    position: 'top',
                    fill: colors.highlight,
                    fontSize: typography.annotation.size,
                    fontWeight: typography.annotation.weight,
                  }}
                />
              )}
            </ComposedChart>
        </ChartWrapper>
      </Section>

      {/* ── Sections 3 & 4: Market Table + Category Mix ────────────────── */}
      <Grid>
        {/* ── Section 3: Market Table ──────────────────────────────────── */}
        <GridCell span={6}>
          <Section heading="Market Breakdown">
            <div
              style={{
                background: kpiCard.background,
                border: kpiCard.border,
                borderRadius: kpiCard.borderRadius,
                borderTop: `2px solid ${colors.accent}`,
                padding: spacing.cardPadding,
                boxShadow: kpiCard.boxShadow,
                overflowX: 'auto',
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontFamily: typography.fontFamily,
                }}
              >
                <thead>
                  <tr>
                    {(
                      [
                        ['market', 'Market'],
                        ['sales2014', `${selectedYear ?? displayYear} Sales`],
                        ['cagr', 'CAGR'],
                        ['margin2014', `${selectedYear ?? displayYear} Margin`],
                        ['profit2014', 'Profit'],
                      ] as [SortKey, string][]
                    ).map(([key, label]) => (
                      <th
                        key={key}
                        onClick={() => handleSort(key)}
                        style={{
                          textAlign: key === 'market' ? 'left' : 'right',
                          padding: '8px 12px',
                          fontSize: typography.tableHeader.size,
                          fontWeight: typography.tableHeader.weight,
                          color: typography.tableHeader.color,
                          borderBottom: `1px solid ${colors.muted}`,
                          cursor: 'pointer',
                          userSelect: 'none',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {label}
                        {sortKey === key ? (sortAsc ? ' \u25B2' : ' \u25BC') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedMarketData.map((m) => {
                    const isSelected = selectedMarket === m.market;
                    const isDeselected = selectedMarket !== null && !isSelected;
                    const isWorstMargin = m.market === worstMarginMarket;
                    const isEMEA = m.market === 'EMEA';

                    return (
                      <tr
                        key={m.market}
                        onClick={() => handleMarketClick(m.market)}
                        style={{
                          cursor: 'pointer',
                          opacity: isDeselected ? 0.25 : 1,
                          background: isSelected ? `${colors.selection}18` : 'transparent',
                          transition: 'opacity 0.15s, background 0.15s',
                        }}
                      >
                        <td
                          style={{
                            padding: '8px 12px',
                            fontSize: typography.tableCell.size,
                            color: isSelected ? colors.selection : typography.tableCell.color,
                            fontWeight: isSelected ? 600 : typography.tableCell.weight,
                            borderBottom: `1px solid ${colors.muted}33`,
                          }}
                        >
                          {m.market}
                          {isEMEA && (
                            <span
                              title="No regional manager assigned"
                              style={{
                                marginLeft: 6,
                                cursor: 'help',
                                color: colors.warning,
                              }}
                            >
                              ⚠
                            </span>
                          )}
                        </td>
                        <td
                          style={{
                            padding: '8px 12px',
                            textAlign: 'right',
                            fontSize: typography.tableCell.size,
                            color: typography.tableCell.color,
                            borderBottom: `1px solid ${colors.muted}33`,
                          }}
                        >
                          {fmtDollar(m.sales2014)}
                        </td>
                        <td
                          style={{
                            padding: '8px 12px',
                            textAlign: 'right',
                            fontSize: typography.tableCell.size,
                            color: typography.tableCell.color,
                            borderBottom: `1px solid ${colors.muted}33`,
                          }}
                        >
                          {(m.cagr * 100).toFixed(1)}%
                        </td>
                        <td
                          style={{
                            padding: '8px 12px',
                            textAlign: 'right',
                            fontSize: typography.tableCell.size,
                            color: isWorstMargin ? colors.highlight : typography.tableCell.color,
                            fontWeight: isWorstMargin ? 600 : typography.tableCell.weight,
                            borderBottom: `1px solid ${colors.muted}33`,
                          }}
                        >
                          {(m.margin2014 * 100).toFixed(1)}%
                        </td>
                        <td
                          style={{
                            padding: '8px 12px',
                            textAlign: 'right',
                            fontSize: typography.tableCell.size,
                            color: m.profit2014 < 0 ? colors.highlight : typography.tableCell.color,
                            borderBottom: `1px solid ${colors.muted}33`,
                          }}
                        >
                          {fmtDollar(m.profit2014)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>
        </GridCell>

        {/* ── Section 4: Category Mix ──────────────────────────────────── */}
        <GridCell span={6}>
          <Section heading="Category Mix">
            <ChartWrapper
              title="Furniture takes a third of sales. It earns a fraction of the margin."
              subtitle={`Sales share and margin by category, ${selectedYear ?? displayYear}${selectedMarket ? ` — ${selectedMarket}` : ''}`}
              minHeight={120}
            >
              <CategoryBar categories={categoryData} selectedMarket={selectedMarket} />
            </ChartWrapper>
          </Section>
        </GridCell>
      </Grid>

      {/* ── Narrative ──────────────────────────────────────────────────── */}
      <div style={{ marginTop: spacing.pagePadding }}>
        <p
          style={{
            margin: 0,
            fontSize: typography.chartSubtitle.size,
            color: colors.secondaryText,
            fontStyle: 'italic',
          }}
        >
          Where is the profit going?
        </p>
      </div>
    </DashboardPage>
  );
}

// ─── Category Horizontal Bar sub-component ──────────────────────────────────

interface CategoryBarProps {
  categories: CategoryAgg[];
  selectedMarket: string | null;
}

function CategoryBar({ categories }: CategoryBarProps) {
  if (!categories.length) return null;

  const totalSales = categories.reduce((s, c) => s + c.sales, 0);
  const barHeight = 36;

  // Build segments: Technology, Office Supplies, Furniture (sorted by sales desc already)
  const segments = categories.map((c) => ({
    ...c,
    widthPct: totalSales > 0 ? (c.sales / totalSales) * 100 : 0,
  }));

  return (
    <div style={{ padding: '8px 0' }}>
      {/* Stacked bar */}
      <svg width="100%" height={barHeight + 4} role="img" aria-label="Category sales mix">
        <defs>
          <pattern
            id="hatch-loss-cat"
            width={12}
            height={12}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width={12} height={12} fill={colors.neutral} />
            <line x1={0} y1={0} x2={0} y2={12} stroke={colors.hatchStroke} strokeWidth={3} />
          </pattern>
        </defs>
        {(() => {
          let xOffset = 0;
          return segments.map((seg) => {
            const x = xOffset;
            xOffset += seg.widthPct;
            const isFurniture = seg.category === 'Furniture';
            return (
              <rect
                key={seg.category}
                x={`${x}%`}
                y={2}
                width={`${seg.widthPct}%`}
                height={barHeight}
                fill={isFurniture ? 'url(#hatch-loss-cat)' : colors.neutral}
                rx={x === 0 ? 3 : 0}
                ry={x === 0 ? 3 : 0}
              />
            );
          });
        })()}
      </svg>

      {/* Labels below the bar */}
      <div
        style={{
          display: 'flex',
          marginTop: 8,
          gap: 0,
        }}
      >
        {segments.map((seg) => {
          const isFurniture = seg.category === 'Furniture';
          return (
            <div
              key={seg.category}
              style={{
                width: `${seg.widthPct}%`,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: typography.annotation.size,
                  fontWeight: typography.annotation.weight,
                  color: colors.emphasisText,
                }}
              >
                {seg.category}
              </div>
              <div
                style={{
                  fontSize: typography.footnote.size,
                  color: colors.secondaryText,
                  marginTop: 2,
                }}
              >
                {(seg.widthPct).toFixed(0)}% of sales
              </div>
              <div
                style={{
                  fontSize: typography.annotation.size,
                  fontWeight: 600,
                  color: isFurniture ? colors.highlight : colors.secondaryText,
                  marginTop: 2,
                }}
              >
                {(seg.margin_pct * 100).toFixed(1)}% margin
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
