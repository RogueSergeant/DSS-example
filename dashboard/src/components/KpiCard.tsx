/**
 * §10 KPI Card Standard
 *
 * Neutral card: value in white, optional trend arrow in blue.
 * Loss card:    value in orange, bold.
 *
 * Trend arrows (▲/▼) use blue for direction — not a semantic encoding.
 */

import { colors, typography, kpiCard as card } from '../lib/theme';

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
        padding: card.padding,
        minHeight: 100,
      }}
    >
      <div
        style={{
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
          marginTop: 4,
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
