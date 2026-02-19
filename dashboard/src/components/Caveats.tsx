/**
 * §12 Caveat Display Standards
 *
 * Four caveat types, each with a distinct visual treatment:
 *   1. Data completeness warning — amber banner with ⚠ icon and left border.
 *   2. Methodology footnote — 11px italic, prefixed *.
 *   3. Governance gap callout — card with orange left border.
 *   4. Reliability flag — ⚑ icon with hover tooltip.
 */

import { useState } from 'react';
import { colors, typography, shadows } from '../lib/theme';

// ─── 1. Data Completeness Warning ───────────────────────────────────────────

interface WarningBannerProps {
  children: React.ReactNode;
}

export function WarningBanner({ children }: WarningBannerProps) {
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        background: '#fef3cd',
        borderLeft: `4px solid ${colors.warning}`,
        borderRadius: '0 6px 6px 0',
        fontSize: typography.kpiLabel.size,
        color: colors.emphasisText,
      }}
    >
      <span style={{ color: colors.warning, fontSize: 16 }} aria-hidden="true">
        ⚠
      </span>
      <span>{children}</span>
    </div>
  );
}

// ─── 2. Methodology Footnote ────────────────────────────────────────────────

interface FootnoteProps {
  children: React.ReactNode;
}

export function Footnote({ children }: FootnoteProps) {
  return (
    <p
      style={{
        margin: '8px 0 0',
        fontSize: typography.footnote.size,
        fontWeight: typography.footnote.weight,
        fontStyle: 'italic',
        color: typography.footnote.color,
        lineHeight: 1.6,
      }}
    >
      * {children}
    </p>
  );
}

// ─── 3. Governance Gap Callout ──────────────────────────────────────────────

interface GovernanceCalloutProps {
  children: React.ReactNode;
}

export function GovernanceCallout({ children }: GovernanceCalloutProps) {
  return (
    <div
      style={{
        borderLeft: `4px solid ${colors.highlight}`,
        background: '#fff4ed',
        padding: '12px 16px',
        borderRadius: '0 8px 8px 0',
        fontSize: typography.tableCell.size,
        color: colors.emphasisText,
      }}
    >
      {children}
    </div>
  );
}

// ─── 4. Reliability Flag ────────────────────────────────────────────────────

interface ReliabilityFlagProps {
  /** Tooltip text explaining the <50 line threshold */
  tooltip?: string;
}

export function ReliabilityFlag({
  tooltip = 'Fewer than 50 order lines — aggregate may be unreliable',
}: ReliabilityFlagProps) {
  const [show, setShow] = useState(false);

  return (
    <span
      style={{ position: 'relative', cursor: 'help' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      tabIndex={0}
      role="img"
      aria-label={tooltip}
    >
      <span aria-hidden="true">⚑</span>
      {show && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 4,
            padding: '6px 10px',
            background: colors.surface,
            border: `1px solid ${colors.muted}`,
            borderRadius: 6,
            boxShadow: shadows.card,
            fontSize: typography.tooltipLabel.size,
            color: typography.tooltipLabel.color,
            whiteSpace: 'nowrap',
            zIndex: 10,
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          {tooltip}
        </span>
      )}
    </span>
  );
}
