/**
 * Appendix D — Customer Risk
 *
 * Two tables:
 * 1. High-loss customers (lifetime_profit < -500, sorted by profit ascending)
 * 2. High-value customers (lifetime_sales > 10000, sorted descending)
 * Annotation: "Too small and too noisy to act on ($29K combined loss)."
 */

import { useState, useMemo } from 'react';
import { colors } from '../lib/theme';
import { DashboardPage, Section, GovernanceCallout } from '../components';
import { useData } from '../hooks/useData';
import { fmtDollar, fmtPct, fmtNumber } from '../lib/format';
import type { CustomerRow } from '../lib/types';

// ─── Table styles ──────────────────────────────────────────────────────────

const tableStyle: React.CSSProperties = {
  width: '100%', borderCollapse: 'collapse', fontSize: 13,
};
const thStyle: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left', borderBottom: `1px solid ${colors.muted}`,
  fontSize: 12, fontWeight: 600, color: colors.secondaryText, cursor: 'pointer',
};
const tdStyle: React.CSSProperties = {
  padding: '6px 12px', borderBottom: `1px solid ${colors.muted}`,
  fontSize: 13, color: colors.emphasisText,
};

// ─── Sortable sub-table ────────────────────────────────────────────────────

type SortKey = 'customer_name' | 'segment' | 'lifetime_sales' | 'lifetime_profit' | 'lifetime_margin' | 'order_count';

const PAGE_SIZE = 50;

function CustomerTable({ rows, id }: { rows: CustomerRow[]; id: string }) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('lifetime_profit');
  const [sortAsc, setSortAsc] = useState(id === 'loss');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let r = rows;
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(row => row.customer_name.toLowerCase().includes(q) || row.segment.toLowerCase().includes(q));
    }
    r = [...r].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });
    return r;
  }, [rows, search, sortKey, sortAsc]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
    setPage(0);
  };

  const sortArrow = (key: SortKey) => sortKey === key ? (sortAsc ? ' \u25B2' : ' \u25BC') : '';

  const exportCsv = () => {
    if (!filtered.length) return;
    const header = 'Customer,Segment,Lifetime Sales,Lifetime Profit,Lifetime Margin,Orders';
    const csvRows = filtered.map(r =>
      `"${r.customer_name}","${r.segment}",${r.lifetime_sales},${r.lifetime_profit},${r.lifetime_margin},${r.order_count}`
    );
    const blob = new Blob([header + '\n' + csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `appendix_d_${id}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search customer..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          style={{
            padding: '6px 12px', fontSize: 13, borderRadius: 6,
            border: `1px solid ${colors.muted}`, background: colors.surface,
            color: colors.emphasisText, minWidth: 180,
          }}
        />
        <button onClick={exportCsv}
          style={{ padding: '6px 14px', fontSize: 12, borderRadius: 6, border: `1px solid ${colors.muted}`, background: colors.surface, color: colors.secondaryText, cursor: 'pointer' }}>
          Export CSV
        </button>
        <span style={{ fontSize: 12, color: colors.secondaryText, marginLeft: 'auto' }}>
          {filtered.length} rows
        </span>
      </div>

      <div style={{ background: colors.surface, border: `1px solid ${colors.muted}`, borderRadius: 8, overflow: 'auto' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle} onClick={() => handleSort('customer_name')}>Customer{sortArrow('customer_name')}</th>
              <th style={thStyle} onClick={() => handleSort('segment')}>Segment{sortArrow('segment')}</th>
              <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('lifetime_sales')}>Lifetime Sales{sortArrow('lifetime_sales')}</th>
              <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('lifetime_profit')}>Lifetime Profit{sortArrow('lifetime_profit')}</th>
              <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('lifetime_margin')}>Margin{sortArrow('lifetime_margin')}</th>
              <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('order_count')}>Orders{sortArrow('order_count')}</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map(r => (
              <tr key={r.customer_key}>
                <td style={tdStyle}>{r.customer_name}</td>
                <td style={tdStyle}>{r.segment}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtDollar(r.lifetime_sales)}</td>
                <td style={{
                  ...tdStyle,
                  textAlign: 'right',
                  color: r.lifetime_profit < 0 ? colors.highlight : colors.emphasisText,
                  backgroundColor: r.lifetime_profit < 0 ? '#fff5f0' : undefined,
                }}>
                  {fmtDollar(r.lifetime_profit)}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtPct(r.lifetime_margin)}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtNumber(r.order_count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
          <button disabled={page === 0} onClick={() => setPage(page - 1)}
            style={{ padding: '4px 10px', fontSize: 12, borderRadius: 4, border: `1px solid ${colors.muted}`, background: colors.surface, color: colors.secondaryText, cursor: page === 0 ? 'default' : 'pointer', opacity: page === 0 ? 0.4 : 1 }}>
            Prev
          </button>
          <span style={{ fontSize: 12, color: colors.secondaryText }}>
            Page {page + 1} of {totalPages}
          </span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}
            style={{ padding: '4px 10px', fontSize: 12, borderRadius: 4, border: `1px solid ${colors.muted}`, background: colors.surface, color: colors.secondaryText, cursor: page >= totalPages - 1 ? 'default' : 'pointer', opacity: page >= totalPages - 1 ? 0.4 : 1 }}>
            Next
          </button>
        </div>
      )}
    </>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export function AppendixD() {
  const { data, loading, error } = useData<CustomerRow[]>('/data/summary_customers.json');

  const highLoss = useMemo(() => {
    if (!data) return [];
    return data.filter(r => r.lifetime_profit < -500).sort((a, b) => a.lifetime_profit - b.lifetime_profit);
  }, [data]);

  const highValue = useMemo(() => {
    if (!data) return [];
    return data.filter(r => r.lifetime_sales > 10000).sort((a, b) => b.lifetime_sales - a.lifetime_sales);
  }, [data]);

  if (loading) return <DashboardPage title="Appendix D — Customer Risk"><p style={{ color: colors.secondaryText }}>Loading...</p></DashboardPage>;
  if (error) return <DashboardPage title="Appendix D — Customer Risk"><p style={{ color: colors.highlight }}>Error: {error}</p></DashboardPage>;

  return (
    <DashboardPage title="Appendix D — Customer Risk">
      <div style={{ marginBottom: 16 }}>
        <GovernanceCallout>
          Too small and too noisy to act on ($29K combined loss). Individual customer profitability is driven by discount and product mix, not customer behavior.
        </GovernanceCallout>
      </div>

      <Section heading={`High-Loss Customers (profit < -$500) — ${highLoss.length} customers`}>
        <CustomerTable rows={highLoss} id="loss" />
      </Section>

      <Section heading={`High-Value Customers (sales > $10K) — ${highValue.length} customers`}>
        <CustomerTable rows={highValue} id="value" />
      </Section>
    </DashboardPage>
  );
}
