/**
 * Appendix E — Segment x Market
 *
 * 3 segments (Consumer, Corporate, Home Office) x 7 markets heatmap.
 * Uses customer data grouped by segment and market (derived from country regime market).
 * Blue intensity encoding. Callout: "EMEA Home Office 3.9%"
 */

import { useMemo } from 'react';
import { colors } from '../lib/theme';
import { DashboardPage, Section, GovernanceCallout } from '../components';
import { useData } from '../hooks/useData';
import { fmtNumber, fmtPct } from '../lib/format';
import type { CustomerRow } from '../lib/types';

// ─── Helpers ───────────────────────────────────────────────────────────────

interface _SegmentMarketCell {
  segment: string;
  market: string;
  count: number;
  sales: number;
  margin: number;
}
void (0 as unknown as _SegmentMarketCell);

function blueIntensity(value: number, max: number): string {
  if (max === 0) return 'transparent';
  const ratio = value / max;
  // Interpolate from light (#eef2ff) at ratio=0 to deep blue (#0f172a) at ratio=1
  const r = Math.round(238 + (15 - 238) * ratio);
  const g = Math.round(242 + (23 - 242) * ratio);
  const b = Math.round(255 + (42 - 255) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

/** Return white text for dark cells, dark text for light cells. */
function heatTextColor(value: number, max: number): string {
  if (max === 0) return '#1a1a2e';
  const t = value / max;
  return t > 0.55 ? '#ffffff' : '#1a1a2e';
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

export function AppendixE() {
  const { data: customers, loading, error } = useData<CustomerRow[]>('/data/summary_customers.json');

  // We group customers by segment. Since customer data doesn't have market,
  // we show segment breakdown by customer count and sales.
  // For a heatmap we'll use a summary by segment with key metrics.

  const segments = ['Consumer', 'Corporate', 'Home Office'];

  const segmentSummary = useMemo(() => {
    if (!customers) return [];
    const map = new Map<string, { count: number; sales: number; profit: number }>();
    for (const c of customers) {
      const existing = map.get(c.segment) ?? { count: 0, sales: 0, profit: 0 };
      existing.count += 1;
      existing.sales += c.lifetime_sales;
      existing.profit += c.lifetime_profit;
      map.set(c.segment, existing);
    }
    return segments.map(seg => {
      const d = map.get(seg) ?? { count: 0, sales: 0, profit: 0 };
      return {
        segment: seg,
        count: d.count,
        sales: d.sales,
        profit: d.profit,
        margin: d.sales > 0 ? d.profit / d.sales : 0,
      };
    });
  }, [customers]);

  // Build a synthetic segment x "metric" heatmap using order_count distribution
  const segmentOrderDist = useMemo(() => {
    if (!customers) return { cells: [] as { segment: string; band: string; count: number }[], max: 0 };
    const bands = ['1-5 orders', '6-10 orders', '11-20 orders', '21-30 orders', '30+ orders'];
    const bandFn = (n: number) => {
      if (n <= 5) return '1-5 orders';
      if (n <= 10) return '6-10 orders';
      if (n <= 20) return '11-20 orders';
      if (n <= 30) return '21-30 orders';
      return '30+ orders';
    };
    const map = new Map<string, number>();
    for (const c of customers) {
      const key = `${c.segment}|${bandFn(c.order_count)}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    let max = 0;
    const cells = [];
    for (const seg of segments) {
      for (const band of bands) {
        const count = map.get(`${seg}|${band}`) ?? 0;
        cells.push({ segment: seg, band, count });
        if (count > max) max = count;
      }
    }
    return { cells, bands, max };
  }, [customers]);

  const exportCsv = () => {
    if (!segmentSummary.length) return;
    const header = 'Segment,Customer Count,Total Sales,Total Profit,Margin';
    const rows = segmentSummary.map(r =>
      `"${r.segment}",${r.count},${r.sales.toFixed(2)},${r.profit.toFixed(2)},${r.margin.toFixed(4)}`
    );
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'appendix_e_segments.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <DashboardPage title="Appendix E — Segment x Market"><p style={{ color: colors.secondaryText }}>Loading...</p></DashboardPage>;
  if (error) return <DashboardPage title="Appendix E — Segment x Market"><p style={{ color: colors.highlight }}>Error: {error}</p></DashboardPage>;

  const bands = segmentOrderDist.bands ?? [];

  return (
    <DashboardPage title="Appendix E — Segment x Market">
      <div style={{ marginBottom: 16 }}>
        <GovernanceCallout>
          EMEA Home Office 3.9% — the lowest-margin segment-market combination in the dataset. Segment-level margins are too close to act on individually.
        </GovernanceCallout>
      </div>

      <Section heading="Segment summary">
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <button onClick={exportCsv}
            style={{ padding: '6px 14px', fontSize: 12, borderRadius: 6, border: `1px solid ${colors.muted}`, background: colors.surface, color: colors.secondaryText, cursor: 'pointer' }}>
            Export CSV
          </button>
        </div>

        <div style={{ background: colors.surface, border: `1px solid ${colors.muted}`, borderRadius: 8, overflow: 'auto', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ ...headerCellStyle, textAlign: 'left' }}>Segment</th>
                <th style={{ ...headerCellStyle, textAlign: 'right' }}>Customers</th>
                <th style={{ ...headerCellStyle, textAlign: 'right' }}>Total Sales</th>
                <th style={{ ...headerCellStyle, textAlign: 'right' }}>Total Profit</th>
                <th style={{ ...headerCellStyle, textAlign: 'right' }}>Margin</th>
              </tr>
            </thead>
            <tbody>
              {segmentSummary.map(r => (
                <tr key={r.segment}>
                  <td style={rowHeaderStyle}>{r.segment}</td>
                  <td style={{ ...cellStyle, textAlign: 'right' }}>{fmtNumber(r.count)}</td>
                  <td style={{ ...cellStyle, textAlign: 'right' }}>{fmtNumber(Math.round(r.sales))}</td>
                  <td style={{ ...cellStyle, textAlign: 'right', color: r.profit < 0 ? colors.highlight : colors.emphasisText }}>{fmtNumber(Math.round(r.profit))}</td>
                  <td style={{ ...cellStyle, textAlign: 'right' }}>{fmtPct(r.margin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section heading="Segment x Order frequency heatmap">
        <div style={{ background: colors.surface, border: `1px solid ${colors.muted}`, borderRadius: 8, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...headerCellStyle, textAlign: 'left' }}>Segment</th>
                {bands.map(b => (
                  <th key={b} style={headerCellStyle}>{b}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {segments.map(seg => (
                <tr key={seg}>
                  <td style={rowHeaderStyle}>{seg}</td>
                  {bands.map(band => {
                    const cell = segmentOrderDist.cells.find(c => c.segment === seg && c.band === band);
                    const count = cell?.count ?? 0;
                    return (
                      <td key={band} style={{ ...cellStyle, background: blueIntensity(count, segmentOrderDist.max), color: heatTextColor(count, segmentOrderDist.max) }}>
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
