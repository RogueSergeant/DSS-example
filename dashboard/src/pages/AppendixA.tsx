/**
 * Appendix A — All Countries
 *
 * 147-row table of every country with regime, margin, profit, loss, market, manager, orders.
 * Orange text on loss-making countries. Reliability flag on low-order rows.
 * Filter dropdowns for regime, market, manager. Sortable, searchable, paginated, CSV export.
 */

import { useState, useMemo } from 'react';
import { colors } from '../lib/theme';
import { DashboardPage, Section, ReliabilityFlag } from '../components';
import { useData } from '../hooks/useData';
import { fmtDollar, fmtPct, fmtNumber } from '../lib/format';
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

type SortKey = 'country' | 'discount_regime' | 'fixed_discount_rate' | 'margin_pct' | 'profit' | 'annual_loss' | 'market' | 'regional_manager' | 'order_count';

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr)).sort() as T[];
}

const PAGE_SIZE = 50;

// ─── Component ─────────────────────────────────────────────────────────────

export function AppendixA() {
  const { data, loading, error } = useData<CountryRegimeRow[]>('/data/summary_country_regime.json');

  const [search, setSearch] = useState('');
  const [regimeFilter, setRegimeFilter] = useState('All');
  const [marketFilter, setMarketFilter] = useState('All');
  const [managerFilter, setManagerFilter] = useState('All');
  const [sortKey, setSortKey] = useState<SortKey>('country');
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);

  const regimes = useMemo(() => data ? unique(data.map(r => r.discount_regime)) : [], [data]);
  const markets = useMemo(() => data ? unique(data.map(r => r.market)) : [], [data]);
  const managers = useMemo(() => data ? unique(data.filter(r => r.regional_manager).map(r => r.regional_manager!)) : [], [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let rows = data;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r => r.country.toLowerCase().includes(q));
    }
    if (regimeFilter !== 'All') rows = rows.filter(r => r.discount_regime === regimeFilter);
    if (marketFilter !== 'All') rows = rows.filter(r => r.market === marketFilter);
    if (managerFilter !== 'All') rows = rows.filter(r => r.regional_manager === managerFilter);

    rows = [...rows].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });
    return rows;
  }, [data, search, regimeFilter, marketFilter, managerFilter, sortKey, sortAsc]);

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
    const header = 'Country,Regime,Discount Rate,Margin,Profit,Annual Loss,Market,Manager,Orders';
    const rows = filtered.map(r =>
      `"${r.country}","${r.discount_regime}",${r.fixed_discount_rate ?? ''},${r.margin_pct},${r.profit},${r.annual_loss},"${r.market}","${r.regional_manager ?? ''}",${r.order_count}`
    );
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'appendix_a_countries.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <DashboardPage title="Appendix A — All Countries"><p style={{ color: colors.secondaryText }}>Loading...</p></DashboardPage>;
  if (error) return <DashboardPage title="Appendix A — All Countries"><p style={{ color: colors.highlight }}>Error: {error}</p></DashboardPage>;

  return (
    <DashboardPage title="Appendix A — All Countries">
      <Section heading="147 countries by discount regime, profitability, and order volume">
        {/* Controls */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search country..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            style={{
              padding: '6px 12px', fontSize: 13, borderRadius: 6,
              border: `1px solid ${colors.muted}`, background: colors.surface,
              color: colors.emphasisText, minWidth: 180,
            }}
          />
          <select value={regimeFilter} onChange={e => { setRegimeFilter(e.target.value); setPage(0); }}
            style={{ padding: '6px 8px', fontSize: 12, borderRadius: 6, border: `1px solid ${colors.muted}`, background: colors.surface, color: colors.emphasisText }}>
            <option value="All">All Regimes</option>
            {regimes.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={marketFilter} onChange={e => { setMarketFilter(e.target.value); setPage(0); }}
            style={{ padding: '6px 8px', fontSize: 12, borderRadius: 6, border: `1px solid ${colors.muted}`, background: colors.surface, color: colors.emphasisText }}>
            <option value="All">All Markets</option>
            {markets.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={managerFilter} onChange={e => { setManagerFilter(e.target.value); setPage(0); }}
            style={{ padding: '6px 8px', fontSize: 12, borderRadius: 6, border: `1px solid ${colors.muted}`, background: colors.surface, color: colors.emphasisText }}>
            <option value="All">All Managers</option>
            {managers.map(m => <option key={m} value={m}>{m}</option>)}
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
                <th style={thStyle} onClick={() => handleSort('discount_regime')}>Regime{sortArrow('discount_regime')}</th>
                <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('fixed_discount_rate')}>Discount Rate{sortArrow('fixed_discount_rate')}</th>
                <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('margin_pct')}>Margin{sortArrow('margin_pct')}</th>
                <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('profit')}>Profit{sortArrow('profit')}</th>
                <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('annual_loss')}>Annual Loss{sortArrow('annual_loss')}</th>
                <th style={thStyle} onClick={() => handleSort('market')}>Market{sortArrow('market')}</th>
                <th style={thStyle} onClick={() => handleSort('regional_manager')}>Manager{sortArrow('regional_manager')}</th>
                <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('order_count')}>Orders{sortArrow('order_count')}</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(r => {
                const isLoss = r.profit < 0;
                return (
                  <tr key={r.country}>
                    <td style={tdStyle}>
                      {r.country}
                      {r.order_count < 50 && <> <ReliabilityFlag /></>}
                    </td>
                    <td style={tdStyle}>{r.discount_regime}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{r.fixed_discount_rate != null ? fmtPct(r.fixed_discount_rate) : '\u2014'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtPct(r.margin_pct)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: isLoss ? colors.highlight : colors.emphasisText }}>{fmtDollar(r.profit)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtDollar(r.annual_loss)}</td>
                    <td style={tdStyle}>{r.market}</td>
                    <td style={tdStyle}>{r.regional_manager ?? '\u2014'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtNumber(r.order_count)}</td>
                  </tr>
                );
              })}
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
      </Section>
    </DashboardPage>
  );
}
