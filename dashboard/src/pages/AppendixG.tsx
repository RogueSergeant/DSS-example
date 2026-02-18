/**
 * Appendix G — Returns
 *
 * Shows which countries have return data coverage using the has_return_data field.
 * Amber WarningBanner at top about coverage limits.
 * Footnote about return flags at order level.
 */

import { useState, useMemo } from 'react';
import { colors } from '../lib/theme';
import { DashboardPage, Section, WarningBanner, Footnote } from '../components';
import { useData } from '../hooks/useData';
import { fmtDollar, fmtNumber } from '../lib/format';
import type { CountryRegimeRow } from '../lib/types';

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

// ─── Helpers ───────────────────────────────────────────────────────────────

type SortKey = 'country' | 'market' | 'has_return_data' | 'order_count' | 'profit';

const PAGE_SIZE = 50;

// ─── Component ─────────────────────────────────────────────────────────────

export function AppendixG() {
  const { data, loading, error } = useData<CountryRegimeRow[]>('/data/summary_country_regime.json');

  const [search, setSearch] = useState('');
  const [returnFilter, setReturnFilter] = useState<'All' | 'Yes' | 'No'>('All');
  const [sortKey, setSortKey] = useState<SortKey>('country');
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);

  const summary = useMemo(() => {
    if (!data) return { withData: 0, withoutData: 0 };
    const withData = data.filter(r => r.has_return_data).length;
    return { withData, withoutData: data.length - withData };
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let rows = data;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r => r.country.toLowerCase().includes(q) || r.market.toLowerCase().includes(q));
    }
    if (returnFilter === 'Yes') rows = rows.filter(r => r.has_return_data);
    if (returnFilter === 'No') rows = rows.filter(r => !r.has_return_data);

    rows = [...rows].sort((a, b) => {
      let av: string | number | boolean = a[sortKey];
      let bv: string | number | boolean = b[sortKey];
      if (typeof av === 'boolean') { av = av ? 1 : 0; bv = bv ? 1 : 0; }
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });
    return rows;
  }, [data, search, returnFilter, sortKey, sortAsc]);

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
    const header = 'Country,Market,Return Data,Orders,Profit,Margin';
    const rows = filtered.map(r =>
      `"${r.country}","${r.market}",${r.has_return_data ? 'Yes' : 'No'},${r.order_count},${r.profit},${r.margin_pct}`
    );
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'appendix_g_returns.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <DashboardPage title="Appendix G — Returns"><p style={{ color: colors.secondaryText }}>Loading...</p></DashboardPage>;
  if (error) return <DashboardPage title="Appendix G — Returns"><p style={{ color: colors.highlight }}>Error: {error}</p></DashboardPage>;

  return (
    <DashboardPage title="Appendix G — Returns">
      <div style={{ marginBottom: 16 }}>
        <WarningBanner>
          Returns data covers US, EU, LATAM, APAC only. {summary.withData} of {data?.length ?? 0} countries have return data;{' '}
          {summary.withoutData} do not.
        </WarningBanner>
      </div>

      <Section heading="Country return data coverage">
        {/* Controls */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search country or market..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            style={{
              padding: '6px 12px', fontSize: 13, borderRadius: 6,
              border: `1px solid ${colors.muted}`, background: colors.surface,
              color: colors.emphasisText, minWidth: 180,
            }}
          />
          <select value={returnFilter} onChange={e => { setReturnFilter(e.target.value as 'All' | 'Yes' | 'No'); setPage(0); }}
            style={{ padding: '6px 8px', fontSize: 12, borderRadius: 6, border: `1px solid ${colors.muted}`, background: colors.surface, color: colors.emphasisText }}>
            <option value="All">All</option>
            <option value="Yes">Has Return Data</option>
            <option value="No">No Return Data</option>
          </select>
          <button onClick={exportCsv}
            style={{ padding: '6px 14px', fontSize: 12, borderRadius: 6, border: `1px solid ${colors.muted}`, background: colors.surface, color: colors.secondaryText, cursor: 'pointer' }}>
            Export CSV
          </button>
          <span style={{ fontSize: 12, color: colors.secondaryText, marginLeft: 'auto' }}>
            {filtered.length} rows
          </span>
        </div>

        {/* Table */}
        <div style={{ background: colors.surface, border: `1px solid ${colors.muted}`, borderRadius: 8, overflow: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle} onClick={() => handleSort('country')}>Country{sortArrow('country')}</th>
                <th style={thStyle} onClick={() => handleSort('market')}>Market{sortArrow('market')}</th>
                <th style={thStyle} onClick={() => handleSort('has_return_data')}>Return Data{sortArrow('has_return_data')}</th>
                <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('order_count')}>Orders{sortArrow('order_count')}</th>
                <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('profit')}>Profit{sortArrow('profit')}</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(r => (
                <tr key={r.country}>
                  <td style={tdStyle}>{r.country}</td>
                  <td style={tdStyle}>{r.market}</td>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                      background: r.has_return_data ? `${colors.selection}22` : `${colors.warning}22`,
                      color: r.has_return_data ? colors.selection : colors.warning,
                    }}>
                      {r.has_return_data ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtNumber(r.order_count)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtDollar(r.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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

        <Footnote>
          Return flags are applied at the order level, not the line level. A single returned line flags the entire order.
        </Footnote>
      </Section>
    </DashboardPage>
  );
}
