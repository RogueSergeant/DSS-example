/**
 * Appendix H — Customer Concentration
 *
 * Pareto curve: customers sorted by lifetime_sales descending, cumulative % of total sales.
 * Line chart with reference lines at 20%/80% and 50%/13%.
 * Line color: #94a3b8, reference lines dashed #334155.
 */

import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { colors } from '../lib/theme';
import { DashboardPage, Section, ChartWrapper, Footnote } from '../components';
import { tooltipStyle, gridProps } from '../components';
import { useData } from '../hooks/useData';
// format utilities available if needed
import type { CustomerRow } from '../lib/types';

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

interface ParetoPoint {
  cumPctCustomers: number;
  cumPctSales: number;
}

function buildPareto(customers: CustomerRow[]): ParetoPoint[] {
  const sorted = [...customers].sort((a, b) => b.lifetime_sales - a.lifetime_sales);
  const totalSales = sorted.reduce((s, c) => s + c.lifetime_sales, 0);
  const n = sorted.length;

  const points: ParetoPoint[] = [{ cumPctCustomers: 0, cumPctSales: 0 }];
  let cumSales = 0;

  for (let i = 0; i < n; i++) {
    cumSales += sorted[i].lifetime_sales;
    // Sample every ~1% to keep chart manageable
    if ((i + 1) % Math.max(1, Math.floor(n / 100)) === 0 || i === n - 1) {
      points.push({
        cumPctCustomers: ((i + 1) / n) * 100,
        cumPctSales: (cumSales / totalSales) * 100,
      });
    }
  }

  return points;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function AppendixH() {
  const { data, loading, error } = useData<CustomerRow[]>('/data/summary_customers.json');

  const paretoData = useMemo(() => {
    if (!data) return [];
    return buildPareto(data);
  }, [data]);

  // Find the actual values at 20% and 50% of customers
  const markers = useMemo(() => {
    if (!paretoData.length) return { at20: 0, at50: 0 };
    const at20 = paretoData.find(p => p.cumPctCustomers >= 20)?.cumPctSales ?? 0;
    const at50 = paretoData.find(p => p.cumPctCustomers >= 50)?.cumPctSales ?? 0;
    return { at20, at50 };
  }, [paretoData]);

  const exportCsv = () => {
    if (!paretoData.length) return;
    const header = 'Cumulative % Customers,Cumulative % Sales';
    const rows = paretoData.map(r =>
      `${r.cumPctCustomers.toFixed(2)},${r.cumPctSales.toFixed(2)}`
    );
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'appendix_h_concentration.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <DashboardPage title="Appendix H — Customer Concentration"><p style={{ color: colors.secondaryText }}>Loading...</p></DashboardPage>;
  if (error) return <DashboardPage title="Appendix H — Customer Concentration"><p style={{ color: colors.highlight }}>Error: {error}</p></DashboardPage>;

  return (
    <DashboardPage title="Appendix H — Customer Concentration">
      <Section heading="Pareto analysis of customer sales concentration">
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <button onClick={exportCsv}
            style={{ padding: '6px 14px', fontSize: 12, borderRadius: 6, border: `1px solid ${colors.muted}`, background: colors.surface, color: colors.secondaryText, cursor: 'pointer' }}>
            Export CSV
          </button>
        </div>

        <ChartWrapper
          title="Top 20% of customers drive ~80% of sales"
          subtitle="Cumulative % of customers vs cumulative % of total sales"
        >
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={paretoData} margin={{ top: 16, right: 32, bottom: 16, left: 32 }}>
              <CartesianGrid {...gridProps} />
              <XAxis
                dataKey="cumPctCustomers"
                type="number"
                domain={[0, 100]}
                tickFormatter={(v: number) => `${v}%`}
                tick={{ fill: colors.secondaryText, fontSize: 12 }}
                axisLine={{ stroke: colors.muted }}
                tickLine={false}
                label={{ value: '% of Customers', position: 'insideBottom', offset: -8, fill: colors.secondaryText, fontSize: 12 }}
              />
              <YAxis
                type="number"
                domain={[0, 100]}
                tickFormatter={(v: number) => `${v}%`}
                tick={{ fill: colors.secondaryText, fontSize: 12 }}
                axisLine={{ stroke: colors.muted }}
                tickLine={false}
                label={{ value: '% of Sales', angle: -90, position: 'insideLeft', offset: -16, fill: '#5c6470', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: colors.emphasisText, fontSize: 13, fontWeight: 600 }}
                formatter={(value: unknown, name: unknown) => [
                  `${(value as number).toFixed(1)}%`,
                  (name as string) === 'cumPctSales' ? 'Cumulative Sales' : (name as string),
                ]}
                labelFormatter={(v: unknown) => `${(v as number).toFixed(1)}% of customers`}
              />

              {/* 20%/80% reference */}
              <ReferenceLine x={20} stroke={colors.neutral} strokeDasharray="6 4" />
              <ReferenceLine y={80} stroke={colors.neutral} strokeDasharray="6 4" />

              {/* 50% reference */}
              <ReferenceLine x={50} stroke={colors.neutral} strokeDasharray="6 4" />
              <ReferenceLine y={13} stroke={colors.neutral} strokeDasharray="6 4" />

              {/* Diagonal reference (perfect equality) */}
              <Line
                data={[{ cumPctCustomers: 0, cumPctSales: 0 }, { cumPctCustomers: 100, cumPctSales: 100 }]}
                dataKey="cumPctSales"
                stroke={colors.neutral}
                strokeDasharray="3 3"
                strokeWidth={1}
                dot={false}
                isAnimationActive={false}
              />

              {/* Pareto curve */}
              <Line
                dataKey="cumPctSales"
                stroke={colors.secondaryText}
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartWrapper>

        {/* Key stats table */}
        <div style={{ background: colors.surface, border: `1px solid ${colors.muted}`, borderRadius: 8, overflow: 'auto', marginTop: 16 }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Milestone</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>% of Customers</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>% of Sales</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}>Top quintile</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>20%</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{markers.at20.toFixed(1)}%</td>
              </tr>
              <tr>
                <td style={tdStyle}>Top half</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>50%</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{markers.at50.toFixed(1)}%</td>
              </tr>
              <tr>
                <td style={tdStyle}>Total customers</td>
                <td style={{ ...tdStyle, textAlign: 'right' }} colSpan={2}>{data?.length.toLocaleString() ?? 0}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <Footnote>
          Customer concentration is calculated on lifetime sales (2011-2014). The Pareto curve shows how unevenly sales are distributed across the customer base.
        </Footnote>
      </Section>
    </DashboardPage>
  );
}
