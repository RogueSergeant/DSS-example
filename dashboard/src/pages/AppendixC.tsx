/**
 * Appendix C — Product x Market Coverage
 *
 * 3 categories x 7 markets heatmap showing order coverage (customer_count as proxy).
 * Single-hue blue intensity. Aggregated from overview data across all years.
 */

import { useMemo } from 'react';
import { colors } from '../lib/theme';
import { DashboardPage, Section, GovernanceCallout } from '../components';
import { useData } from '../hooks/useData';
import { fmtNumber } from '../lib/format';
import type { OverviewRow } from '../lib/types';

// ─── Helpers ───────────────────────────────────────────────────────────────

interface HeatCell {
  category: string;
  market: string;
  count: number;
}

function buildHeatmap(data: OverviewRow[]): { cells: HeatCell[]; categories: string[]; markets: string[]; max: number } {
  const map = new Map<string, number>();
  const categorySet = new Set<string>();
  const marketSet = new Set<string>();

  for (const row of data) {
    const key = `${row.category}|${row.market}`;
    map.set(key, (map.get(key) ?? 0) + row.customer_count);
    categorySet.add(row.category);
    marketSet.add(row.market);
  }

  const categories = Array.from(categorySet).sort();
  const markets = Array.from(marketSet).sort();
  const cells: HeatCell[] = [];
  let max = 0;

  for (const cat of categories) {
    for (const mkt of markets) {
      const count = map.get(`${cat}|${mkt}`) ?? 0;
      cells.push({ category: cat, market: mkt, count });
      if (count > max) max = count;
    }
  }

  return { cells, categories, markets, max };
}

function blueIntensity(value: number, max: number): string {
  if (max === 0) return 'transparent';
  const ratio = value / max;
  // Light theme: interpolate from light blue (#eef2ff) to medium blue (#3b5998)
  const r = Math.round(238 + (59 - 238) * ratio);
  const g = Math.round(242 + (89 - 242) * ratio);
  const b = Math.round(255 + (152 - 255) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

/** Return dark text for light cells and white text for dark cells. */
function heatTextColor(value: number, max: number): string {
  if (max === 0) return colors.emphasisText;
  const ratio = value / max;
  // Compute perceived brightness of the cell (same interpolation as blueIntensity)
  const r = 238 + (59 - 238) * ratio;
  const g = 242 + (89 - 242) * ratio;
  const b = 255 + (152 - 255) * ratio;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 160 ? colors.emphasisText : '#ffffff';
}

// ─── Table styles ──────────────────────────────────────────────────────────

const cellStyle: React.CSSProperties = {
  padding: '12px 16px', textAlign: 'center', fontSize: 13,
  color: colors.emphasisText, fontWeight: 500, borderBottom: `1px solid ${colors.muted}`,
};

const headerCellStyle: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'center', fontSize: 12, fontWeight: 600,
  color: colors.secondaryText, borderBottom: `1px solid ${colors.muted}`,
};

const rowHeaderStyle: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left', fontSize: 13, fontWeight: 500,
  color: colors.emphasisText, borderBottom: `1px solid ${colors.muted}`,
};

// ─── Component ─────────────────────────────────────────────────────────────

export function AppendixC() {
  const { data, loading, error } = useData<OverviewRow[]>('/data/summary_overview.json');

  const heatmap = useMemo(() => {
    if (!data) return null;
    return buildHeatmap(data);
  }, [data]);

  const exportCsv = () => {
    if (!heatmap) return;
    const { categories, markets, cells } = heatmap;
    const header = 'Category,' + markets.join(',');
    const rows = categories.map(cat => {
      const vals = markets.map(mkt => {
        const cell = cells.find(c => c.category === cat && c.market === mkt);
        return cell?.count ?? 0;
      });
      return `"${cat}",${vals.join(',')}`;
    });
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'appendix_c_coverage.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <DashboardPage title="Appendix C — Product x Market Coverage"><p style={{ color: colors.secondaryText }}>Loading...</p></DashboardPage>;
  if (error) return <DashboardPage title="Appendix C — Product x Market Coverage"><p style={{ color: colors.highlight }}>Error: {error}</p></DashboardPage>;
  if (!heatmap) return null;

  const { categories, markets, cells, max } = heatmap;

  return (
    <DashboardPage title="Appendix C — Product x Market Coverage">
      <Section heading="Customer coverage by category and market (all years)">
        <div style={{ marginBottom: 16 }}>
          <GovernanceCallout>Products are distributed across all markets.</GovernanceCallout>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
          <button onClick={exportCsv}
            style={{ padding: '6px 14px', fontSize: 12, borderRadius: 6, border: `1px solid ${colors.muted}`, background: colors.surface, color: colors.secondaryText, cursor: 'pointer' }}>
            Export CSV
          </button>
        </div>

        <div style={{ background: colors.surface, border: `1px solid ${colors.muted}`, borderRadius: 8, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...headerCellStyle, textAlign: 'left' }}>Category</th>
                {markets.map(m => (
                  <th key={m} style={headerCellStyle}>{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => (
                <tr key={cat}>
                  <td style={rowHeaderStyle}>{cat}</td>
                  {markets.map(mkt => {
                    const cell = cells.find(c => c.category === cat && c.market === mkt);
                    const count = cell?.count ?? 0;
                    return (
                      <td key={mkt} style={{ ...cellStyle, background: blueIntensity(count, max), color: heatTextColor(count, max) }}>
                        {fmtNumber(count)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </DashboardPage>
  );
}
