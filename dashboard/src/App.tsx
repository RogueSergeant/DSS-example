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

      {/* Top navigation bar — dark navy anchor */}
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          padding: '0 24px',
          background: colors.navBg,
          borderBottom: `1px solid rgba(255,255,255,0.08)`,
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* Brand */}
        <div
          style={{
            fontFamily: typography.displayFont,
            fontSize: 16,
            fontWeight: 500,
            color: '#e8ecf2',
            letterSpacing: '-0.01em',
            paddingRight: 20,
            marginRight: 20,
            borderRight: '1px solid rgba(255,255,255,0.1)',
            whiteSpace: 'nowrap',
            lineHeight: '48px',
          }}
        >
          Global Superstore
        </div>

        {/* Primary tabs */}
        <div style={{ display: 'flex', gap: 0, flex: 1, flexWrap: 'wrap' }}>
          {PRIMARY_TABS.map((tab) => {
            const isActive = page === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setPage(tab.id); setAppendixOpen(false); }}
                style={{
                  padding: '0 14px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontFamily: typography.fontFamily,
                  fontWeight: isActive ? 600 : 400,
                  background: 'transparent',
                  color: isActive ? '#ffffff' : '#9ca3b0',
                  lineHeight: '48px',
                  borderBottom: isActive ? `2px solid ${colors.selection}` : '2px solid transparent',
                  transition: 'color 0.2s ease, border-color 0.2s ease',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = '#d0d4db'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = '#9ca3b0'; }}
              >
                {tab.label}
              </button>
            );
          })}
          <button
            onClick={() => setAppendixOpen((o) => !o)}
            style={{
              padding: '0 14px',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: typography.fontFamily,
              fontWeight: isAppendix ? 600 : 400,
              background: 'transparent',
              color: isAppendix ? '#ffffff' : '#9ca3b0',
              lineHeight: '48px',
              borderBottom: isAppendix ? `2px solid ${colors.selection}` : '2px solid transparent',
              transition: 'color 0.2s ease, border-color 0.2s ease',
            }}
          >
            Appendices {appendixOpen ? '▴' : '▾'}
          </button>
        </div>

        {/* Year selector */}
        <div
          style={{
            display: 'flex',
            gap: 2,
            alignItems: 'center',
            padding: '6px 8px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: '#6b7280',
              marginRight: 4,
              fontFamily: typography.fontFamily,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Year
          </span>
          {YEARS.map((y) => {
            const isActive = year === y;
            return (
              <button
                key={y}
                onClick={() => setYear(y)}
                style={{
                  padding: '3px 10px',
                  borderRadius: 4,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontFamily: typography.fontFamily,
                  fontWeight: isActive ? 600 : 400,
                  background: isActive ? colors.navSurface : 'transparent',
                  color: isActive ? '#ffffff' : '#8b919a',
                  transition: 'all 0.15s ease',
                }}
              >
                {y}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Appendix sub-nav */}
      {appendixOpen && (
        <div
          style={{
            position: 'sticky',
            top: 49,
            zIndex: 49,
            display: 'flex',
            gap: 2,
            padding: '8px 24px',
            background: colors.navSurface,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexWrap: 'wrap',
          }}
        >
          {APPENDIX_TABS.map((tab) => {
            const isActive = page === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setPage(tab.id)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 4,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontFamily: typography.fontFamily,
                  fontWeight: isActive ? 600 : 400,
                  background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: isActive ? '#ffffff' : '#8b919a',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
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
          padding: '16px 24px',
          borderTop: `1px solid ${colors.muted}`,
          fontSize: typography.footnote.size,
          color: typography.footnote.color,
          textAlign: 'center',
          fontFamily: typography.fontFamily,
        }}
      >
        Dataset covers 2011–2014. All figures derived from Global Superstore transactional data.
      </footer>
    </>
  );
}

export default App;
