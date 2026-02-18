/**
 * §9 Standard Chart Defaults
 *
 * Wraps any Recharts composition with the design-system card treatment,
 * title/subtitle, and standard chart margins. Also injects the hatch
 * pattern defs into the SVG.
 *
 * Usage:
 *   <ChartWrapper title="Anything above ~25% discount is underwater"
 *                 subtitle="Margin by discount band, 2011-2014">
 *     <BarChart ...>
 *       ...
 *     </BarChart>
 *   </ChartWrapper>
 */

import type { ReactNode } from 'react';
import { spacing, typography, colors, kpiCard as card } from '../lib/theme';

interface ChartWrapperProps {
  /** Argument-style title (§4: written as arguments, not descriptions) */
  title: string;
  /** Optional framing question or descriptive subtitle */
  subtitle?: string;
  /** Optional aria-label override (§8: describes chart type, data, and argument) */
  ariaLabel?: string;
  /** Minimum height override — defaults to 240px (§5) */
  minHeight?: number;
  children: ReactNode;
}

export function ChartWrapper({
  title,
  subtitle,
  ariaLabel,
  minHeight = spacing.minChartHeight,
  children,
}: ChartWrapperProps) {
  return (
    <div
      role="figure"
      aria-label={ariaLabel ?? title}
      style={{
        background: card.background,
        border: card.border,
        borderRadius: card.borderRadius,
        padding: spacing.cardPadding,
      }}
    >
      <h3
        style={{
          margin: 0,
          marginBottom: subtitle ? spacing.chartTitleMb : spacing.chartSubtitleMb,
          fontSize: typography.chartTitle.size,
          fontWeight: typography.chartTitle.weight,
          color: typography.chartTitle.color,
        }}
      >
        {title}
      </h3>

      {subtitle && (
        <p
          style={{
            margin: 0,
            marginBottom: spacing.chartSubtitleMb,
            fontSize: typography.chartSubtitle.size,
            fontWeight: typography.chartSubtitle.weight,
            color: typography.chartSubtitle.color,
          }}
        >
          {subtitle}
        </p>
      )}

      <div style={{ minHeight }}>{children}</div>
    </div>
  );
}

/** Standard Recharts tooltip style (§9) */
export const tooltipStyle: React.CSSProperties = {
  backgroundColor: colors.surface,
  border: `1px solid ${colors.muted}`,
  borderRadius: 6,
  padding: '10px 14px',
};

/** Standard Recharts cartesian grid props (§9) */
export const gridProps = {
  horizontal: true,
  vertical: false,
  stroke: colors.muted,
  strokeDasharray: '3 3',
} as const;
