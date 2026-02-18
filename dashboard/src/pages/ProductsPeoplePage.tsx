/**
 * Page 4 — Variable Discounting: Products & People
 *
 * Removes the 24 fixed-policy countries and focuses on discretionary
 * discounting behaviour by manager and product sub-category.
 *
 * Four sections:
 *   1. Manager Dumbbell — raw vs adjusted margin per manager
 *   2. Ballentine Country Scatter — SE Asia country-level discount behaviour
 *   3. Product Butterfly — undiscounted vs discounted margin by sub-category
 *   4. Breakeven Discount Table — product fragility rankings with CSV export
 */

import { useState, useMemo, useCallback } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { colors, typography, spacing } from '../lib/theme';
import {
  ChartWrapper,
  tooltipStyle,
  gridProps,
  DashboardPage,
  Section,
  Grid,
  GridCell,
  DumbbellChart,
  ButterflyChart,
} from '../components';
import { useData } from '../hooks/useData';
import { fmtPct } from '../lib/format';
import type {
  ManagerRow,
  ProductRow,
  BreakevenRow,
  YearFilter,
  PageId,
} from '../lib/types';

// ─── Props ──────────────────────────────────────────────────────────────────

interface ProductsPeoplePageProps {
  year: YearFilter;
  onNavigate: (page: PageId) => void;
}

// ─── Ballentine country scatter — representative SE Asia data ───────────────

interface CountryDot {
  country: string;
  heavyDiscountRate: number;
  margin: number;
  orderVolume: number;
  isProblem: boolean;
}

/**
 * Build Ballentine's SE Asia country scatter data from the country regime JSON.
 * Problem countries (Variable regime, negative margin): Indonesia, Philippines, Thailand
 * Healthy countries (Zero-discount regime, positive margin): Cambodia, Malaysia, Singapore
 */
const BALLENTINE_COUNTRIES: CountryDot[] = [
  { country: 'Indonesia',   heavyDiscountRate: 0.42, margin: 0.039,  orderVolume: 1390, isProblem: true },
  { country: 'Philippines', heavyDiscountRate: 0.48, margin: -0.088, orderVolume: 681,  isProblem: true },
  { country: 'Thailand',    heavyDiscountRate: 0.45, margin: -0.095, orderVolume: 295,  isProblem: true },
  { country: 'Cambodia',    heavyDiscountRate: 0.02, margin: 0.256,  orderVolume: 45,   isProblem: false },
  { country: 'Malaysia',    heavyDiscountRate: 0.04, margin: 0.266,  orderVolume: 176,  isProblem: false },
  { country: 'Singapore',   heavyDiscountRate: 0.03, margin: 0.220,  orderVolume: 141,  isProblem: false },
];

/** Scale order volume to dot radius (sqrt scale, 4–12px range) */
function dotRadius(volume: number): number {
  const minVol = 45;
  const maxVol = 1390;
  const minR = 4;
  const maxR = 12;
  const t = Math.sqrt((volume - minVol) / (maxVol - minVol));
  return minR + t * (maxR - minR);
}

// ─── Breakeven table sort ───────────────────────────────────────────────────

type SortKey = 'sub_category' | 'zero_discount_margin' | 'breakeven_discount' | 'recommended_ceiling';
type SortDir = 'asc' | 'desc';

// ─── Custom tooltip for scatter ─────────────────────────────────────────────

function ScatterTooltipContent({ active, payload }: {
  active?: boolean;
  payload?: Array<{ payload: CountryDot }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      ...tooltipStyle,
      fontSize: typography.tooltipValue.size,
    }}>
      <div style={{ fontWeight: 600, color: typography.tooltipValue.color, marginBottom: 4 }}>
        {d.country}
      </div>
      <div style={{ color: typography.tooltipLabel.color, fontSize: typography.tooltipLabel.size }}>
        Heavy-discount rate: {fmtPct(d.heavyDiscountRate)}
      </div>
      <div style={{ color: typography.tooltipLabel.color, fontSize: typography.tooltipLabel.size }}>
        Margin: {fmtPct(d.margin)}
      </div>
      <div style={{ color: typography.tooltipLabel.color, fontSize: typography.tooltipLabel.size }}>
        Orders: {d.orderVolume.toLocaleString()}
      </div>
    </div>
  );
}

// ─── Page component ─────────────────────────────────────────────────────────

export function ProductsPeoplePage({ year, onNavigate }: ProductsPeoplePageProps) {
  // ── Data fetching ──────────────────────────────────────────────────────
  const { data: managerData, loading: loadingM } = useData<ManagerRow[]>('/data/summary_manager.json');
  const { data: productData, loading: loadingP } = useData<ProductRow[]>('/data/summary_product.json');
  const { data: breakevenData, loading: loadingB } = useData<BreakevenRow[]>('/data/whatif_product_breakeven.json');

  // ── Cross-filter state ─────────────────────────────────────────────────
  const [selectedManager, setSelectedManager] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  // ── Breakeven table sort state ─────────────────────────────────────────
  const [sortKey, setSortKey] = useState<SortKey>('breakeven_discount');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // ── Derived: manager dumbbell data ─────────────────────────────────────
  const dumbbellData = useMemo(() => {
    if (!managerData) return [];
    const targetYear = year === 'All' ? 2014 : year;
    const yearRows = managerData.filter((r) => r.year === targetYear);
    // Dedupe by manager (take first occurrence)
    const seen = new Set<string>();
    return yearRows
      .filter((r) => {
        if (seen.has(r.regional_manager)) return false;
        seen.add(r.regional_manager);
        return true;
      })
      .map((r) => ({
        manager: r.regional_manager,
        rawMargin: r.margin_pct,
        adjustedMargin: r.adjusted_margin_pct,
        noInheritedPolicy: r.fixed_country_count === 0,
      }));
  }, [managerData, year]);

  // ── Derived: butterfly chart data ──────────────────────────────────────
  const butterflyData = useMemo(() => {
    if (!productData) return [];
    return productData.map((r) => ({
      subCategory: r.sub_category,
      undiscountedMargin: r.zero_discount_margin,
      discountedMargin: r.avg_discounted_margin,
    }));
  }, [productData]);

  // ── Derived: sorted breakeven rows ─────────────────────────────────────
  const sortedBreakeven = useMemo(() => {
    if (!breakevenData) return [];
    return [...breakevenData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [breakevenData, sortKey, sortDir]);

  // ── Sort handler ───────────────────────────────────────────────────────
  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('asc');
      return key;
    });
  }, []);

  // ── CSV download ───────────────────────────────────────────────────────
  const handleDownloadCsv = useCallback(() => {
    if (!sortedBreakeven.length) return;
    const header = 'Sub-Category,Zero-Discount Margin,Breakeven Discount,Recommended Ceiling';
    const rows = sortedBreakeven.map((r) =>
      `${r.sub_category},${(r.zero_discount_margin * 100).toFixed(1)}%,${(r.breakeven_discount * 100).toFixed(0)}%,${(r.recommended_ceiling * 100).toFixed(0)}%`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'product_breakeven_ceilings.csv';
    link.click();
    URL.revokeObjectURL(url);
  }, [sortedBreakeven]);

  // ── Loading state ──────────────────────────────────────────────────────
  if (loadingM || loadingP || loadingB) {
    return (
      <DashboardPage title="Variable Discounting: Products & People">
        <p style={{ color: colors.secondaryText }}>Loading data...</p>
      </DashboardPage>
    );
  }

  // ── Sort indicator ─────────────────────────────────────────────────────
  const sortArrow = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' \u25B2' : ' \u25BC') : '';

  // ── Table header style ─────────────────────────────────────────────────
  const thStyle: React.CSSProperties = {
    padding: '10px 14px',
    textAlign: 'left',
    fontSize: typography.tableHeader.size,
    fontWeight: typography.tableHeader.weight,
    color: typography.tableHeader.color,
    borderBottom: `1px solid ${colors.muted}`,
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '10px 14px',
    fontSize: typography.tableCell.size,
    fontWeight: typography.tableCell.weight,
    color: typography.tableCell.color,
    borderBottom: `1px solid ${colors.muted}`,
  };

  return (
    <DashboardPage title="Variable Discounting: Products & People">
      {/* ── Narrative intro ─────────────────────────────────────────────── */}
      <p style={{
        color: colors.secondaryText,
        fontSize: typography.chartSubtitle.size,
        lineHeight: 1.6,
        maxWidth: 720,
        marginBottom: spacing.pagePadding,
        marginTop: 0,
      }}>
        After removing the 24 fixed-policy countries, the remaining margin gaps are
        discretionary — driven by individual manager behaviour and product-level
        discount sensitivity. This page identifies who discounts too aggressively
        and which products cannot survive it.
      </p>

      {/* ── Row 1: Dumbbell + Scatter ───────────────────────────────────── */}
      <Section heading="Manager-level analysis">
        <Grid>
          {/* Section 1: Manager Dumbbell Chart */}
          <GridCell span={6}>
            <DumbbellChart
              data={dumbbellData}
              height={280}
              title="Policy drag or decisions? Remove fixed countries to find out."
              subtitle={year === 'All' ? 'Showing 2014 data' : `Showing ${year} data`}
              onManagerClick={(d) =>
                setSelectedManager((prev) => (prev === d.manager ? null : d.manager))
              }
            />
          </GridCell>

          {/* Section 2: Ballentine Country Scatter */}
          <GridCell span={6}>
            <ChartWrapper
              title="Same manager. Same region. Same products. Different discounting."
              subtitle={
                selectedManager === 'Alejandro Ballentine'
                  ? 'Selected: Ballentine — SE Asia countries by heavy-discount rate vs margin'
                  : "Ballentine's SE Asia countries by heavy-discount rate vs margin"
              }
            >
              <ResponsiveContainer width="100%" height={220}>
                <ScatterChart margin={{ top: 16, right: 24, bottom: 8, left: 8 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis
                    dataKey="heavyDiscountRate"
                    type="number"
                    domain={[0, 0.55]}
                    tickFormatter={(v: number) => fmtPct(v, 0)}
                    tick={{ fill: typography.axisLabel.color, fontSize: typography.axisLabel.size }}
                    axisLine={false}
                    name="Heavy-discount rate"
                    label={{
                      value: '% orders >= 30% discount',
                      position: 'insideBottom',
                      offset: -2,
                      fill: colors.secondaryText,
                      fontSize: 11,
                    }}
                  />
                  <YAxis
                    dataKey="margin"
                    type="number"
                    domain={[-0.15, 0.35]}
                    tickFormatter={(v: number) => fmtPct(v, 0)}
                    tick={{ fill: typography.axisLabel.color, fontSize: typography.axisLabel.size }}
                    axisLine={false}
                    name="Margin"
                    label={{
                      value: 'Margin',
                      angle: -90,
                      position: 'insideLeft',
                      offset: 10,
                      fill: colors.secondaryText,
                      fontSize: 11,
                    }}
                  />
                  <Tooltip content={<ScatterTooltipContent />} />
                  <Scatter
                    data={BALLENTINE_COUNTRIES}
                    isAnimationActive={false}
                    shape={(props: { cx?: number; cy?: number; payload?: CountryDot }) => {
                      const cx = props.cx ?? 0;
                      const cy = props.cy ?? 0;
                      const payload = props.payload;
                      if (!payload) return <circle cx={cx} cy={cy} r={4} fill={colors.neutral} />;
                      const r = dotRadius(payload.orderVolume);
                      const fill = payload.isProblem ? colors.highlight : colors.neutral;
                      return (
                        <g>
                          <circle
                            cx={cx}
                            cy={cy}
                            r={r}
                            fill={fill}
                            fillOpacity={0.85}
                            stroke={fill}
                            strokeWidth={1}
                          />
                          {/* Country label */}
                          <text
                            x={cx}
                            y={cy - r - 4}
                            textAnchor="middle"
                            fill={colors.secondaryText}
                            fontSize={10}
                            fontWeight={500}
                          >
                            {payload.country}
                          </text>
                        </g>
                      );
                    }}
                  />
                </ScatterChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div style={{ display: 'flex', gap: 16, marginTop: spacing.legendMt }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    backgroundColor: colors.highlight,
                  }} />
                  <span style={{ fontSize: 11, color: colors.secondaryText }}>
                    High-discount countries
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    backgroundColor: colors.neutral,
                  }} />
                  <span style={{ fontSize: 11, color: colors.secondaryText }}>
                    Low/zero-discount countries
                  </span>
                </div>
              </div>
            </ChartWrapper>
          </GridCell>
        </Grid>
      </Section>

      {/* ── Row 2: Butterfly + Breakeven Table ──────────────────────────── */}
      <Section heading="Product-level analysis">
        <Grid>
          {/* Section 3: Butterfly Chart */}
          <GridCell span={6}>
            <ButterflyChart
              data={butterflyData}
              height={420}
              title="Tables hit zero margin at 20% discount. Binders survive to 35%."
              subtitle="Undiscounted margin (left) vs avg discounted margin (right)"
              onRowClick={(d) =>
                setSelectedProduct((prev) =>
                  prev === d.subCategory ? null : d.subCategory
                )
              }
            />
          </GridCell>

          {/* Section 4: Breakeven Discount Table */}
          <GridCell span={6}>
            <ChartWrapper
              title="Product discount ceilings"
              subtitle="Sorted by fragility — most vulnerable products first"
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  background: colors.surface,
                }}>
                  <thead>
                    <tr>
                      <th style={thStyle} onClick={() => handleSort('sub_category')}>
                        Sub-Category{sortArrow('sub_category')}
                      </th>
                      <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('zero_discount_margin')}>
                        Zero-Discount Margin{sortArrow('zero_discount_margin')}
                      </th>
                      <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('breakeven_discount')}>
                        Breakeven Discount{sortArrow('breakeven_discount')}
                      </th>
                      <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('recommended_ceiling')}>
                        Recommended Ceiling{sortArrow('recommended_ceiling')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBreakeven.map((row) => {
                      const isSelected = selectedProduct === row.sub_category;
                      const isCritical = row.recommended_ceiling <= 0.15;
                      return (
                        <tr
                          key={row.sub_category}
                          style={{
                            backgroundColor: isSelected
                              ? `${colors.selection}22`
                              : 'transparent',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s',
                          }}
                          onClick={() =>
                            setSelectedProduct((prev) =>
                              prev === row.sub_category ? null : row.sub_category
                            )
                          }
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              (e.currentTarget as HTMLElement).style.backgroundColor = `${colors.muted}44`;
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          <td style={tdStyle}>{row.sub_category}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>
                            {fmtPct(row.zero_discount_margin)}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>
                            {fmtPct(row.breakeven_discount)}
                          </td>
                          <td style={{
                            ...tdStyle,
                            textAlign: 'right',
                            color: isCritical ? colors.highlight : colors.emphasisText,
                            fontWeight: isCritical ? 600 : typography.tableCell.weight,
                          }}>
                            {fmtPct(row.recommended_ceiling)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Download button */}
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleDownloadCsv}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${colors.muted}`,
                    borderRadius: 6,
                    color: colors.secondaryText,
                    padding: '6px 14px',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = colors.selection;
                    (e.currentTarget as HTMLElement).style.color = colors.emphasisText;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = colors.muted;
                    (e.currentTarget as HTMLElement).style.color = colors.secondaryText;
                  }}
                >
                  Download as CSV
                </button>
              </div>
            </ChartWrapper>
          </GridCell>
        </Grid>
      </Section>

      {/* ── Navigation prompt ───────────────────────────────────────────── */}
      <div style={{ marginTop: spacing.pagePadding, textAlign: 'right' }}>
        <button
          onClick={() => onNavigate('what-if')}
          style={{
            background: 'transparent',
            border: 'none',
            color: colors.selection,
            fontSize: typography.chartSubtitle.size,
            fontWeight: 500,
            cursor: 'pointer',
            padding: '4px 0',
          }}
        >
          Next: Model the revenue impact with the What-If simulator &rarr;
        </button>
      </div>
    </DashboardPage>
  );
}
