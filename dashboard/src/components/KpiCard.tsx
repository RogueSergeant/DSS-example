/**
 * §10 KPI Card Standard
 *
 * Neutral card: value in dark navy, optional trend arrow in blue.
 * Loss card:    value in orange, bold.
 *
 * Trend arrows (▲/▼) use blue for direction — not a semantic encoding.
 */

import { colors, typography, kpiCard as card, shadows } from '../lib/theme';

interface KpiCardProps {
  /** Formatted value string, e.g. "$4.3M" or "−$413K" */
  value: string;
  /** Descriptive label, e.g. "Total Sales 2014" */
  label: string;
  /** Optional secondary line, e.g. "▲ +26% vs 2013" or "24 countries" */
  detail?: string;
  /** When true, value renders in orange with bold weight */
  isLoss?: boolean;
  /** Optional aria-label for the card */
  ariaLabel?: string;
}

export function KpiCard({ value, label, detail, isLoss = false, ariaLabel }: KpiCardProps) {
  return (
    <div
      role="figure"
      aria-label={ariaLabel ?? `${label}: ${value}`}
      style={{
        background: card.background,
        border: card.border,
        borderRadius: card.borderRadius,
        borderTop: `2px solid ${isLoss ? colors.highlight : colors.accent}`,
        padding: card.padding,
        minHeight: 100,
        boxShadow: card.boxShadow,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = shadows.hover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = card.boxShadow;
      }}
    >
      <div
        style={{
          fontFamily: typography.monoFont,
          fontSize: typography.kpiValue.size,
          fontWeight: typography.kpiValue.weight,
          color: isLoss ? colors.highlight : typography.kpiValue.color,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop: 6,
          fontSize: typography.kpiLabel.size,
          fontWeight: typography.kpiLabel.weight,
          color: typography.kpiLabel.color,
        }}
      >
        {label}
      </div>

      {detail && (
        <div
          style={{
            marginTop: 2,
            fontSize: typography.kpiLabel.size,
            fontWeight: typography.kpiLabel.weight,
            color: typography.kpiLabel.color,
          }}
        >
          {detail}
        </div>
      )}
    </div>
  );
}
