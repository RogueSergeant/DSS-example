/**
 * Appendix B — Product Detail
 *
 * 17 sub-categories with margin thresholds and discount analysis.
 * Orange text on the bottom-10 loss-makers by avg_discounted_margin.
 * Sortable, searchable, paginated, CSV export.
 */

import { useState, useMemo } from 'react';
import { colors } from '../lib/theme';
import { DashboardPage, Section } from '../components';
import { useData } from '../hooks/useData';
import { fmtPct, fmtNumber } from '../lib/format';
import type { ProductRow } from '../lib/types';

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

type SortKey = keyof ProductRow;

const PAGE_SIZE = 50;

// ─── Component ─────────────────────────────────────────────────────────────

export function AppendixB() {
  const { data, loading, error } = useData<ProductRow[]>('/data/summary_product.json');

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('sub_category');
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);

  // Bottom 10 by avg_discounted_margin
  const lossMakerSet = useMemo(() => {
    if (!data) return new Set<string>();
    const sorted = [...data].sort((a, b) => a.avg_discounted_margin - b.avg_discounted_margin);
    return new Set(sorted.slice(0, 10).map(r => r.sub_category));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let rows = data;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r => r.sub_category.toLowerCase().includes(q));
    }
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });
    return rows;
  }, [data, search, sortKey, sortAsc]);

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
    const header = 'Sub-Category,Zero-Discount Margin,Breakeven Discount,Recommended Ceiling,Avg Discounted Margin,Heavy Discount Orders,Normal Orders';
    const rows = filtered.map(r =>
      `"${r.sub_category}",${r.zero_discount_margin},${r.breakeven_discount},${r.recommended_ceiling},${r.avg_discounted_margin},${r.order_count_heavy_discount},${r.order_count_not_heavy_discount}`
    );
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'appendix_b_products.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <DashboardPage title="Appendix B — Product Detail"><p style={{ color: colors.secondaryText }}>Loading...</p></DashboardPage>;
  if (error) return <DashboardPage title="Appendix B — Product Detail"><p style={{ color: colors.highlight }}>Error: {error}</p></DashboardPage>;

  return (
    <DashboardPage title="Appendix B — Product Detail">
      <Section heading="Sub-category discount thresholds and margin impact">
        {/* Controls */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search sub-category..."
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

        {/* Table */}
        <div style={{ background: colors.surface, border: `1px solid ${colors.muted}`, borderRadius: 8, overflow: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle} onClick={() => handleSort('sub_category')}>Sub-Category{sortArrow('sub_category')}</th>
                <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('zero_discount_margin')}>Zero-Discount Margin{sortArrow('zero_discount_margin')}</th>
                <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('breakeven_discount')}>Breakeven Discount{sortArrow('breakeven_discount')}</th>
                <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('recommended_ceiling')}>Rec. Ceiling{sortArrow('recommended_ceiling')}</th>
                <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('avg_discounted_margin')}>Avg Disc. Margin{sortArrow('avg_discounted_margin')}</th>
                <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('order_count_heavy_discount')}>Heavy Disc. Orders{sortArrow('order_count_heavy_discount')}</th>
                <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('order_count_not_heavy_discount')}>Normal Orders{sortArrow('order_count_not_heavy_discount')}</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(r => {
                const isLossMaker = lossMakerSet.has(r.sub_category);
                return (
                  <tr key={r.sub_category}>
                    <td style={tdStyle}>{r.sub_category}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtPct(r.zero_discount_margin)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtPct(r.breakeven_discount)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtPct(r.recommended_ceiling)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: isLossMaker ? colors.highlight : colors.emphasisText }}>
                      {fmtPct(r.avg_discounted_margin)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtNumber(r.order_count_heavy_discount)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtNumber(r.order_count_not_heavy_discount)}</td>
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
