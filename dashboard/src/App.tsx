import { useState } from 'react';
import './App.css';
import { HatchPatternDefs } from './components/HatchPattern';
import { colors, typography } from './lib/theme';
import type { YearFilter, PageId } from './lib/types';

import { OverviewPage } from './pages/OverviewPage';
import { TwoProblemsPage } from './pages/TwoProblemsPage';
import { FixedPoliciesPage } from './pages/FixedPoliciesPage';
import { ProductsPeoplePage } from './pages/ProductsPeoplePage';
import { WhatIfPage } from './pages/WhatIfPage';
import { CopierBuyersPage } from './pages/CopierBuyersPage';
import { AppendixA } from './pages/AppendixA';
import { AppendixB } from './pages/AppendixB';
import { AppendixC } from './pages/AppendixC';
import { AppendixD } from './pages/AppendixD';
import { AppendixE } from './pages/AppendixE';
import { AppendixF } from './pages/AppendixF';
import { AppendixG } from './pages/AppendixG';
import { AppendixH } from './pages/AppendixH';

const PRIMARY_TABS: { id: PageId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'two-problems', label: 'Two Problems' },
  { id: 'fixed-policies', label: 'Fixed Policies' },
  { id: 'products-people', label: 'Products & People' },
  { id: 'what-if', label: 'What-If' },
  { id: 'copier-buyers', label: 'Copier Buyers' },
];

const APPENDIX_TABS: { id: PageId; label: string }[] = [
  { id: 'appendix-a', label: 'A: All Countries' },
  { id: 'appendix-b', label: 'B: Product Detail' },
  { id: 'appendix-c', label: 'C: Product × Market' },
  { id: 'appendix-d', label: 'D: Customer Risk' },
  { id: 'appendix-e', label: 'E: Segment × Market' },
  { id: 'appendix-f', label: 'F: Shipping' },
  { id: 'appendix-g', label: 'G: Returns' },
  { id: 'appendix-h', label: 'H: Concentration' },
];

const YEARS: YearFilter[] = [2011, 2012, 2013, 2014, 'All'];

function App() {
  const [page, setPage] = useState<PageId>('overview');
  const [year, setYear] = useState<YearFilter>('All');
  const [appendixOpen, setAppendixOpen] = useState(false);

  const isAppendix = page.startsWith('appendix');

  return (
    <>
      <HatchPatternDefs />

      {/* Top navigation bar */}
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '8px 24px',
          background: colors.surface,
          borderBottom: `1px solid ${colors.muted}`,
        }}
      >
        <div style={{ display: 'flex', gap: 2, flex: 1, flexWrap: 'wrap' }}>
          {PRIMARY_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setPage(tab.id); setAppendixOpen(false); }}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: page === tab.id ? 600 : 400,
                background: page === tab.id ? colors.selection : 'transparent',
                color: page === tab.id ? '#fff' : colors.secondaryText,
              }}
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={() => setAppendixOpen((o) => !o)}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: isAppendix ? 600 : 400,
              background: isAppendix ? colors.selection : 'transparent',
              color: isAppendix ? '#fff' : colors.secondaryText,
            }}
          >
            Appendices {appendixOpen ? '▴' : '▾'}
          </button>
        </div>

        {/* Year selector — persistent across all pages */}
        <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: colors.secondaryText, marginRight: 6 }}>Year:</span>
          {YEARS.map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              style={{
                padding: '4px 10px',
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: year === y ? 600 : 400,
                background: year === y ? colors.muted : 'transparent',
                color: year === y ? colors.emphasisText : colors.secondaryText,
              }}
            >
              {y}
            </button>
          ))}
        </div>
      </nav>

      {/* Appendix sub-nav */}
      {appendixOpen && (
        <div
          style={{
            position: 'sticky',
            top: 46,
            zIndex: 49,
            display: 'flex',
            gap: 2,
            padding: '6px 24px',
            background: colors.pageBg,
            borderBottom: `1px solid ${colors.muted}`,
            flexWrap: 'wrap',
          }}
        >
          {APPENDIX_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPage(tab.id)}
              style={{
                padding: '4px 12px',
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: page === tab.id ? 600 : 400,
                background: page === tab.id ? colors.muted : 'transparent',
                color: page === tab.id ? colors.emphasisText : colors.secondaryText,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Page content */}
      <main>
        {page === 'overview' && <OverviewPage year={year} onNavigate={setPage} />}
        {page === 'two-problems' && <TwoProblemsPage year={year} onNavigate={setPage} />}
        {page === 'fixed-policies' && <FixedPoliciesPage year={year} onNavigate={setPage} />}
        {page === 'products-people' && <ProductsPeoplePage year={year} onNavigate={setPage} />}
        {page === 'what-if' && <WhatIfPage />}
        {page === 'copier-buyers' && <CopierBuyersPage />}
        {page === 'appendix-a' && <AppendixA />}
        {page === 'appendix-b' && <AppendixB />}
        {page === 'appendix-c' && <AppendixC />}
        {page === 'appendix-d' && <AppendixD />}
        {page === 'appendix-e' && <AppendixE />}
        {page === 'appendix-f' && <AppendixF />}
        {page === 'appendix-g' && <AppendixG />}
        {page === 'appendix-h' && <AppendixH />}
      </main>

      {/* Global footer */}
      <footer
        style={{
          padding: '12px 24px',
          borderTop: `1px solid ${colors.muted}`,
          fontSize: typography.footnote.size,
          color: typography.footnote.color,
          textAlign: 'center',
        }}
      >
        Dataset covers 2011–2014. All figures derived from Global Superstore transactional data.
      </footer>
    </>
  );
}

export default App;
