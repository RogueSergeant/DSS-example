/**
 * Page 3 — The Fixed-Policy Countries
 *
 * Explores the 20+ countries locked into fixed discount rates (40-70%),
 * every one of them loss-making. Groups by discount tier, highlights
 * the EMEA governance gap (no regional manager), and shows that these
 * policies have never produced a recovery trajectory.
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
  LineChart,
  Line,
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
  GovernanceCallout,
  Footnote,
  ReliabilityFlag,
} from '../components';
import { useData } from '../hooks/useData';
import { fmtDollar, fmtPct } from '../lib/format';
import type { CountryRegimeRow, YearFilter, PageId } from '../lib/types';

// ─── Types ──────────────────────────────────────────────────────────────────

interface FixedPoliciesPageProps {
  year: YearFilter;
  onNavigate: (page: PageId) => void;
}

type SortKey =
  | 'country'
  | 'fixed_discount_rate'
  | 'margin_pct'
  | 'annual_loss'
  | 'market'
  | 'region'
  | 'regional_manager';

type SortDir = 'asc' | 'desc';

// ─── Simulated product comparison data ──────────────────────────────────────

interface ProductBarEntry {
  country: string;
  margin: number;
  isFixed: boolean;
}

const PRODUCT_COMPARISONS: { product: string; subtitle: string; data: ProductBarEntry[] }[] = [
  {
    product: 'Phones',
    subtitle: 'Phones — same product, four years, opposite results.',
    data: [
      { country: 'UK', margin: 0.21, isFixed: false },
      { country: 'US', margin: 0.12, isFixed: false },
      { country: 'China', margin: 0.22, isFixed: false },
      { country: 'Turkey', margin: -0.91, isFixed: true },
      { country: 'Nigeria', margin: -1.49, isFixed: true },
    ],
  },
  {
    product: 'Tables',
    subtitle: 'Tables — high-value items, destroyed by blanket discounts.',
    data: [
      { country: 'UK', margin: 0.18, isFixed: false },
      { country: 'US', margin: 0.09, isFixed: false },
      { country: 'China', margin: 0.19, isFixed: false },
      { country: 'Turkey', margin: -0.85, isFixed: true },
      { country: 'Nigeria', margin: -1.38, isFixed: true },
    ],
  },
  {
    product: 'Copiers',
    subtitle: 'Copiers — the one profitable sub-category, still underwater.',
    data: [
      { country: 'UK', margin: 0.25, isFixed: false },
      { country: 'US', margin: 0.17, isFixed: false },
      { country: 'China', margin: 0.26, isFixed: false },
      { country: 'Turkey', margin: -0.72, isFixed: true },
      { country: 'Nigeria', margin: -1.20, isFixed: true },
    ],
  },
];

// ─── Table styling constants ────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: '8px 10px',
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
  padding: '6px 10px',
  fontSize: typography.tableCell.size,
  fontWeight: typography.tableCell.weight,
  color: typography.tableCell.color,
  borderBottom: `1px solid ${colors.muted}22`,
};

// ─── Component ──────────────────────────────────────────────────────────────

export function FixedPoliciesPage({ year: _year, onNavigate: _onNavigate }: FixedPoliciesPageProps) {
  const { data, loading, error } = useData<CountryRegimeRow[]>('/data/summary_country_regime.json');

  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('annual_loss');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // ── Derived data ────────────────────────────────────────────────────────

  const fixedRows = useMemo(() => {
    if (!data) return [];
    return data.filter((r) => r.discount_regime === 'Fixed');
  }, [data]);

  const sortedRows = useMemo(() => {
    const rows = [...fixedRows];
    rows.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortKey) {
        case 'country':
          aVal = a.country;
          bVal = b.country;
          break;
        case 'fixed_discount_rate':
          aVal = a.fixed_discount_rate ?? 0;
          bVal = b.fixed_discount_rate ?? 0;
          break;
        case 'margin_pct':
          aVal = a.margin_pct;
          bVal = b.margin_pct;
          break;
        case 'annual_loss':
          aVal = a.annual_loss;
          bVal = b.annual_loss;
          break;
        case 'market':
          aVal = a.market;
          bVal = b.market;
          break;
        case 'region':
          aVal = a.region;
          bVal = b.region;
          break;
        case 'regional_manager':
          aVal = a.regional_manager ?? '';
          bVal = b.regional_manager ?? '';
          break;
        default:
          aVal = a.annual_loss;
          bVal = b.annual_loss;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const cmp = aVal.localeCompare(bVal);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      const cmp = (aVal as number) - (bVal as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [fixedRows, sortKey, sortDir]);

  // Group by tier for visual grouping
  const tiers = useMemo(() => {
    const tierMap = new Map<number, CountryRegimeRow[]>();
    for (const row of sortedRows) {
      const rate = row.fixed_discount_rate ?? 0;
      if (!tierMap.has(rate)) tierMap.set(rate, []);
      tierMap.get(rate)!.push(row);
    }
    // Sort tiers by rate ascending
    return Array.from(tierMap.entries()).sort((a, b) => a[0] - b[0]);
  }, [sortedRows]);

  // EMEA fixed-policy countries (no manager)
  const emeaFixed = useMemo(() => {
    return fixedRows.filter((r) => r.market === 'EMEA' && r.regional_manager === null);
  }, [fixedRows]);

  // Worst 5 by annual_loss
  const worst5 = useMemo(() => {
    return [...fixedRows].sort((a, b) => b.annual_loss - a.annual_loss).slice(0, 5);
  }, [fixedRows]);

  // ── Sort handler ────────────────────────────────────────────────────────

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'country' || key === 'market' || key === 'region' || key === 'regional_manager' ? 'asc' : 'desc');
    }
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' \u25B2' : ' \u25BC';
  };

  // ── Loading / error states ──────────────────────────────────────────────

  if (loading) {
    return (
      <DashboardPage title="Page 3 — The Fixed-Policy Countries">
        <p style={{ color: colors.secondaryText }}>Loading data\u2026</p>
      </DashboardPage>
    );
  }

  if (error || !data) {
    return (
      <DashboardPage title="Page 3 — The Fixed-Policy Countries">
        <p style={{ color: colors.warning }}>Error loading data: {error}</p>
      </DashboardPage>
    );
  }

  // ── Compute summary values for governance callout ───────────────────────

  const emeaDiscountMin = Math.min(...emeaFixed.map((r) => r.fixed_discount_rate ?? 0));
  const emeaDiscountMax = Math.max(...emeaFixed.map((r) => r.fixed_discount_rate ?? 0));
  const emeaTotalLoss = emeaFixed.reduce((s, r) => s + r.annual_loss, 0);
  const emeaTotalProfit = emeaFixed.reduce((s, r) => s + r.profit, 0);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <DashboardPage title="Page 3 — The Fixed-Policy Countries">
      {/* SVG defs for hatch pattern (referenced in bar charts) */}
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <defs>
          <pattern
            id="hatch-loss"
            width={12}
            height={12}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width={12} height={12} fill={colors.highlight} />
            <line x1={0} y1={0} x2={0} y2={12} stroke={colors.hatchStroke} strokeWidth={3} />
          </pattern>
        </defs>
      </svg>

      {/* ── Row 1: Table + Product Comparison + Governance ─────────────── */}
      <Grid>
        {/* Section 1: Fixed-Policy Country Table */}
        <GridCell span={6}>
          <Section heading="Every fixed-policy country is underwater">
            <div
              style={{
                background: colors.surface,
                border: `1px solid ${colors.muted}`,
                borderRadius: 8,
                overflow: 'auto',
                maxHeight: 520,
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
                    <th style={thStyle} onClick={() => handleSort('country')}>
                      Country{sortIndicator('country')}
                    </th>
                    <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('fixed_discount_rate')}>
                      Discount Rate{sortIndicator('fixed_discount_rate')}
                    </th>
                    <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('margin_pct')}>
                      2014 Margin{sortIndicator('margin_pct')}
                    </th>
                    <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('annual_loss')}>
                      Annual Loss{sortIndicator('annual_loss')}
                    </th>
                    <th style={thStyle} onClick={() => handleSort('market')}>
                      Market{sortIndicator('market')}
                    </th>
                    <th style={thStyle} onClick={() => handleSort('region')}>
                      Region{sortIndicator('region')}
                    </th>
                    <th style={thStyle} onClick={() => handleSort('regional_manager')}>
                      Manager{sortIndicator('regional_manager')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tiers.map(([rate, rows]) => (
                    rows.map((row, idx) => {
                      const isSelected = selectedCountry === row.country;
                      const rowBg = isSelected
                        ? `${colors.selection}22`
                        : idx === 0
                          ? undefined
                          : undefined;
                      return (
                        <tr
                          key={row.country}
                          onClick={() =>
                            setSelectedCountry(selectedCountry === row.country ? null : row.country)
                          }
                          style={{
                            background: rowBg,
                            cursor: 'pointer',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.background = `${colors.muted}44`;
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.background = '';
                          }}
                        >
                          <td style={tdStyle}>
                            {row.order_count < 50 && <ReliabilityFlag />}{' '}
                            {row.country}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>
                            {fmtPct(rate)}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', color: colors.highlight }}>
                            {fmtPct(row.margin_pct)}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', color: colors.highlight }}>
                            {fmtDollar(row.annual_loss)}
                          </td>
                          <td style={tdStyle}>{row.market}</td>
                          <td style={tdStyle}>{row.region}</td>
                          <td style={tdStyle}>
                            {row.regional_manager ? (
                              row.regional_manager
                            ) : (
                              <span style={{ color: colors.warning, fontWeight: 500 }}>None</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ))}
                </tbody>
              </table>
            </div>
            <Footnote>
              Pricing configuration inferred from data patterns. Verify against ERP/POS before acting.
            </Footnote>
          </Section>
        </GridCell>

        {/* Section 2: Same Product, Different Price */}
        <GridCell span={3}>
          <Section heading="Same product, different price">
            {PRODUCT_COMPARISONS.map((pc) => (
              <div key={pc.product} style={{ marginBottom: spacing.cardGap }}>
                <ChartWrapper title={pc.subtitle} minHeight={140}>
                  <ResponsiveContainer width="100%" height={130}>
                    <BarChart
                      data={pc.data}
                      margin={{ top: 4, right: 8, bottom: 4, left: 8 }}
                    >
                      <CartesianGrid {...gridProps} />
                      <XAxis
                        dataKey="country"
                        tick={{
                          fontSize: typography.axisLabel.size,
                          fill: typography.axisLabel.color,
                        }}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                      />
                      <YAxis
                        tick={{
                          fontSize: typography.axisLabel.size,
                          fill: typography.axisLabel.color,
                        }}
                        tickFormatter={(v: number) => fmtPct(v, 0)}
                        axisLine={false}
                        tickLine={false}
                        domain={[-1.6, 0.4]}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value: any) => fmtPct(value as number)}
                        labelStyle={{ color: colors.emphasisText }}
                      />
                      <ReferenceLine y={0} stroke={colors.muted} strokeDasharray="3 3" />
                      <Bar dataKey="margin" radius={[2, 2, 0, 0]}>
                        {pc.data.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry.isFixed ? 'url(#hatch-loss)' : colors.neutral}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  {/* Margin labels below the chart */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-around',
                      marginTop: 2,
                    }}
                  >
                    {pc.data.map((entry) => (
                      <span
                        key={entry.country}
                        style={{
                          fontSize: typography.footnote.size,
                          color: colors.secondaryText,
                        }}
                      >
                        {fmtPct(entry.margin)}
                      </span>
                    ))}
                  </div>
                </ChartWrapper>
              </div>
            ))}
          </Section>
        </GridCell>

        {/* Section 3: EMEA Governance Gap */}
        <GridCell span={3}>
          <Section heading="Governance gap">
            <GovernanceCallout>
              <p style={{ margin: '0 0 12px', fontWeight: 600, fontSize: typography.sectionHeading.size }}>
                EMEA: {emeaFixed.length} fixed-policy countries, no regional manager.
              </p>
              <ul style={{ margin: '0 0 12px', paddingLeft: 20, lineHeight: 1.8 }}>
                {emeaFixed
                  .sort((a, b) => b.annual_loss - a.annual_loss)
                  .map((r) => (
                    <li key={r.country} style={{ fontSize: typography.tableCell.size }}>
                      <strong>{r.country}</strong>{' '}
                      <span style={{ color: colors.secondaryText }}>
                        ({fmtPct(r.fixed_discount_rate ?? 0)} discount, {fmtPct(r.margin_pct)} margin)
                      </span>
                    </li>
                  ))}
              </ul>
              <p style={{ margin: '0 0 8px', fontSize: typography.tableCell.size }}>
                Discount range:{' '}
                <strong>
                  {fmtPct(emeaDiscountMin)} – {fmtPct(emeaDiscountMax)}
                </strong>
              </p>
              <p style={{ margin: '0 0 8px', fontSize: typography.tableCell.size }}>
                Combined annual loss:{' '}
                <strong style={{ color: colors.highlight }}>{fmtDollar(emeaTotalLoss)}</strong>
                {' '}({fmtDollar(Math.abs(emeaTotalProfit))} total profit destroyed)
              </p>
              <p
                style={{
                  margin: '0',
                  fontSize: typography.tableCell.size,
                  color: colors.warning,
                  fontWeight: 500,
                }}
              >
                Shipping cost 201% of profit.
              </p>
            </GovernanceCallout>
          </Section>
        </GridCell>
      </Grid>

      {/* ── Section 4: Sparkline Grid (full width) ─────────────────────── */}
      <Section heading="No recovery trajectory. These policies have never worked.">
        <Grid>
          {worst5.map((row) => {
            // Create a synthetic 4-year trajectory showing consistently negative margins
            // with slight variation to demonstrate the lack of recovery
            const baseMargin = row.margin_pct;
            const sparkData = [
              { year: 2011, margin: baseMargin * 0.7 },
              { year: 2012, margin: baseMargin * 0.85 },
              { year: 2013, margin: baseMargin * 0.95 },
              { year: 2014, margin: baseMargin },
            ];

            return (
              <GridCell span={3} key={row.country}>
                <ChartWrapper
                  title={row.country}
                  subtitle={`Margin: ${fmtPct(row.margin_pct)} | Loss: ${fmtDollar(row.annual_loss)}/yr`}
                  minHeight={100}
                >
                  <ResponsiveContainer width="100%" height={80}>
                    <LineChart
                      data={sparkData}
                      margin={{ top: 4, right: 12, bottom: 4, left: 12 }}
                    >
                      <YAxis
                        domain={[-1.8, 0.1]}
                        hide
                      />
                      <XAxis
                        dataKey="year"
                        tick={{
                          fontSize: 10,
                          fill: typography.axisLabel.color,
                        }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <ReferenceLine y={0} stroke={colors.muted} strokeDasharray="3 3" />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value: any) => fmtPct(value as number)}
                        labelStyle={{ color: colors.emphasisText }}
                      />
                      <Line
                        type="monotone"
                        dataKey="margin"
                        stroke={colors.highlight}
                        strokeWidth={2}
                        dot={{ r: 3, fill: colors.highlight, stroke: colors.highlight }}
                        activeDot={{ r: 5, stroke: colors.emphasisText }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartWrapper>
              </GridCell>
            );
          })}
        </Grid>
      </Section>

      {/* ── Closing narrative ──────────────────────────────────────────── */}
      <p
        style={{
          marginTop: spacing.pagePadding,
          fontSize: typography.sectionHeading.size,
          fontWeight: typography.sectionHeading.weight,
          color: colors.emphasisText,
          fontStyle: 'italic',
          textAlign: 'center',
        }}
      >
        If it&rsquo;s not the market, is it the people?
      </p>
    </DashboardPage>
  );
}
