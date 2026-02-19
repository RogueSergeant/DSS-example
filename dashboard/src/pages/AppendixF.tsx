/**
 * Appendix F — Shipping & Priority
 *
 * Bar chart showing profit margin by market as a proxy for shipping cost impact.
 * All bars slate, EMEA bar orange. Note: "EMEA shipping cost 201% of profit"
 */

import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { colors } from '../lib/theme';
import { DashboardPage, Section, ChartWrapper, GovernanceCallout, Footnote } from '../components';
import { tooltipStyle, gridProps } from '../components';
import { useData } from '../hooks/useData';
import { fmtDollar, fmtPct } from '../lib/format';
import type { OverviewRow } from '../lib/types';

// ─── Table styles ──────────────────────────────────────────────────────────

const tableStyle: React.CSSProperties = {
  width: '100%', borderCollapse: 'collapse', fontSize: 13,
};
const thStyle: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left', borderBottom: `1px solid ${colors.muted}`,
  fontSize: 12, fontWeight: 600, color: colors.secondaryText,
};
const tdStyle: React.CSSProperties = {
  padding: '6px 12px', borderBottom: `1px solid ${colors.muted}`,
  fontSize: 13, color: colors.emphasisText,
};

// ─── Helpers ───────────────────────────────────────────────────────────────

interface MarketAgg {
  market: string;
  sales: number;
  profit: number;
  margin: number;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function AppendixF() {
  const { data, loading, error } = useData<OverviewRow[]>('/data/summary_overview.json');

  const marketData = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { sales: number; profit: number }>();
    for (const row of data) {
      const existing = map.get(row.market) ?? { sales: 0, profit: 0 };
      existing.sales += row.sales;
      existing.profit += row.profit;
      map.set(row.market, existing);
    }
    const result: MarketAgg[] = [];
    for (const [market, agg] of map) {
      result.push({
        market,
        sales: agg.sales,
        profit: agg.profit,
        margin: agg.sales > 0 ? agg.profit / agg.sales : 0,
      });
    }
    return result.sort((a, b) => b.margin - a.margin);
  }, [data]);

  const exportCsv = () => {
    if (!marketData.length) return;
    const header = 'Market,Sales,Profit,Margin';
    const rows = marketData.map(r =>
      `"${r.market}",${r.sales.toFixed(2)},${r.profit.toFixed(2)},${r.margin.toFixed(4)}`
    );
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'appendix_f_shipping.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <DashboardPage title="Appendix F — Shipping & Priority"><p style={{ color: colors.secondaryText }}>Loading...</p></DashboardPage>;
  if (error) return <DashboardPage title="Appendix F — Shipping & Priority"><p style={{ color: colors.highlight }}>Error: {error}</p></DashboardPage>;

  return (
    <DashboardPage title="Appendix F — Shipping & Priority">
      <div style={{ marginBottom: 16 }}>
        <GovernanceCallout>
          EMEA shipping cost 201% of profit — the only market where shipping overhead exceeds profit contribution.
        </GovernanceCallout>
      </div>

      <Section heading="Profit margin by market">
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <button onClick={exportCsv}
            style={{ padding: '6px 14px', fontSize: 12, borderRadius: 6, border: `1px solid ${colors.muted}`, background: colors.surface, color: colors.secondaryText, cursor: 'pointer' }}>
            Export CSV
          </button>
        </div>

        <ChartWrapper
          title="Profit margin varies sharply across markets"
          subtitle="Net margin by market, all years combined"
        >
          {/* SVG hatch pattern for EMEA */}
          <svg width={0} height={0} style={{ position: 'absolute' }}>
            <defs>
              <pattern id="emea-hatch" patternUnits="userSpaceOnUse" width={6} height={6} patternTransform="rotate(45)">
                <rect width={6} height={6} fill={colors.highlight} />
                <line x1={0} y1={0} x2={0} y2={6} stroke={colors.hatchStroke} strokeWidth={3} />
              </pattern>
            </defs>
          </svg>
          <BarChart width={700} height={320} data={marketData} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
              <CartesianGrid {...gridProps} />
              <XAxis
                dataKey="market"
                tick={{ fill: colors.secondaryText, fontSize: 12 }}
                axisLine={{ stroke: colors.muted }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => fmtPct(v)}
                tick={{ fill: colors.secondaryText, fontSize: 12 }}
                axisLine={{ stroke: colors.muted }}
                tickLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: colors.emphasisText, fontSize: 13, fontWeight: 600 }}
                formatter={(value: unknown) => [fmtPct(value as number), 'Margin']}
              />
              <Bar dataKey="margin" radius={[4, 4, 0, 0]}>
                {marketData.map((entry) => (
                  <Cell
                    key={entry.market}
                    fill={entry.market === 'EMEA' ? colors.highlight : colors.neutral}
                  />
                ))}
              </Bar>
            </BarChart>
        </ChartWrapper>
      </Section>

      <Section heading="Market detail">
        <div style={{ background: colors.surface, border: `1px solid ${colors.muted}`, borderRadius: 8, overflow: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Market</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Total Sales</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Total Profit</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Net Margin</th>
              </tr>
            </thead>
            <tbody>
              {marketData.map(r => (
                <tr key={r.market}>
                  <td style={{ ...tdStyle, color: r.market === 'EMEA' ? colors.highlight : colors.emphasisText, fontWeight: r.market === 'EMEA' ? 600 : 400 }}>
                    {r.market}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtDollar(r.sales)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtDollar(r.profit)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: r.market === 'EMEA' ? colors.highlight : colors.emphasisText }}>
                    {fmtPct(r.margin)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Footnote>
          Shipping priority data is not available in the summary dataset. Margin shown here is net profit / sales as a proxy for cost structure differences across markets.
        </Footnote>
      </Section>
    </DashboardPage>
  );
}
