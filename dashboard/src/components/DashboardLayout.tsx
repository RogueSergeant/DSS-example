/**
 * §5 Spacing & Layout — Dashboard shell
 *
 * 12-column grid system. Cards span 3 (quarter), 4 (third), 6 (half), or 12 (full).
 * Page padding: 24px. Card gap: 16px.
 */

import type { ReactNode } from 'react';
import { spacing, typography, colors } from '../lib/theme';

// ─── Page wrapper ───────────────────────────────────────────────────────────

interface DashboardPageProps {
  title: string;
  children: ReactNode;
}

export function DashboardPage({ title, children }: DashboardPageProps) {
  return (
    <div
      className="animate-in"
      style={{ padding: spacing.pagePadding, minHeight: '100vh' }}
    >
      <h1
        style={{
          margin: 0,
          marginBottom: 8,
          fontFamily: typography.displayFont,
          fontSize: typography.pageTitle.size,
          fontWeight: typography.pageTitle.weight,
          color: typography.pageTitle.color,
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h1>
      {/* Decorative accent rule */}
      <div
        style={{
          width: 40,
          height: 2,
          background: colors.accent,
          borderRadius: 1,
          marginBottom: spacing.pagePadding,
        }}
      />
      {children}
    </div>
  );
}

// ─── Section heading ────────────────────────────────────────────────────────

interface SectionProps {
  heading: string;
  children: ReactNode;
}

export function Section({ heading, children }: SectionProps) {
  return (
    <section style={{ marginBottom: spacing.pagePadding }}>
      <h2
        style={{
          margin: 0,
          marginBottom: spacing.cardGap,
          fontFamily: typography.displayFont,
          fontSize: typography.sectionHeading.size,
          fontWeight: typography.sectionHeading.weight,
          color: typography.sectionHeading.color,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        {/* Left accent bar */}
        <span
          style={{
            display: 'inline-block',
            width: 3,
            height: 16,
            background: colors.accent,
            borderRadius: 2,
            flexShrink: 0,
          }}
        />
        {heading}
      </h2>
      {children}
    </section>
  );
}

// ─── 12-column grid ─────────────────────────────────────────────────────────

interface GridProps {
  children: ReactNode;
}

export function Grid({ children }: GridProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: spacing.cardGap,
      }}
    >
      {children}
    </div>
  );
}

// ─── Grid cell (card slot) ──────────────────────────────────────────────────

interface GridCellProps {
  /** Number of columns to span: 3, 4, 6, or 12 */
  span: 3 | 4 | 6 | 12;
  children: ReactNode;
}

export function GridCell({ span, children }: GridCellProps) {
  return (
    <div style={{ gridColumn: `span ${span}` }}>
      {children}
    </div>
  );
}
