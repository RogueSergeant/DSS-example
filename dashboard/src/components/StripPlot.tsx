/**
 * §11.1 Strip Plot with Jitter
 *
 * Argument: Fixed-regime countries cluster into perfectly vertical columns —
 * this is a system configuration, not a human pricing decision.
 *
 * Variable-regime: slate circle (○) 5px.
 * Fixed-regime:    orange diamond (◇) 7px, with seeded jitter.
 */

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import { colors, chartDefaults, shapes, typography } from '../lib/theme';
import { ChartWrapper, tooltipStyle, gridProps } from './ChartWrapper';

// ─── Types ──────────────────────────────────────────────────────────────────

interface StripPlotDatum {
  country: string;
  discount: number;
  margin: number;
  regime: 'fixed' | 'variable';
}

interface StripPlotProps {
  data: StripPlotDatum[];
  width?: number;
  height?: number;
  title?: string;
  subtitle?: string;
  onDotClick?: (d: StripPlotDatum) => void;
  onTierClick?: (tier: number) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Simple deterministic hash for jitter seeding by country name */
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

/** Seeded pseudo-random jitter ±0.01 for fixed-regime dots */
function jitter(country: string): number {
  const hash = hashCode(country);
  return ((hash % 200) - 100) / 10000; // range: ±0.01
}

// ─── Diamond shape for fixed-regime dots ────────────────────────────────────

function Diamond(props: { cx?: number; cy?: number; fill?: string; datum?: StripPlotDatum }) {
  const { cx = 0, cy = 0, fill } = props;
  const r = shapes.fixed.radius;
  return (
    <polygon
      points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`}
      fill={fill}
      stroke="none"
    />
  );
}

// ─── Reference line tiers (§11.1) ───────────────────────────────────────────

const TIERS = [0.40, 0.50, 0.60, 0.70];

// ─── Component ──────────────────────────────────────────────────────────────

export function StripPlot({
  data,
  width = 720,
  height = 400,
  title = 'Fixed-regime discounts cluster at system-set tiers',
  subtitle,
  onDotClick,
  onTierClick,
}: StripPlotProps) {
  const variableData = data
    .filter((d) => d.regime === 'variable')
    .map((d) => ({ ...d, x: d.discount, y: d.margin }));

  const fixedData = data
    .filter((d) => d.regime === 'fixed')
    .map((d) => ({ ...d, x: d.discount, y: d.margin + jitter(d.country) }));

  return (
    <ChartWrapper title={title} subtitle={subtitle}>
      <ScatterChart
        width={width}
        height={height}
        margin={{ ...chartDefaults.margin, right: 80 }}
      >
        <CartesianGrid {...gridProps} />
        <XAxis
          dataKey="x"
          type="number"
          domain={[0, 0.75]}
          tick={{ fill: typography.axisLabel.color, fontSize: typography.axisLabel.size }}
          axisLine={false}
          name="Discount"
        />
        <YAxis
          dataKey="y"
          type="number"
          domain={[-1.5, 0.5]}
          tick={{ fill: typography.axisLabel.color, fontSize: typography.axisLabel.size }}
          axisLine={false}
          name="Margin"
          tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
        />

        {TIERS.map((tier) => (
          <ReferenceLine
            key={tier}
            x={tier}
            stroke={colors.muted}
            strokeDasharray="3 3"
            label={{
              value: `${(tier * 100).toFixed(0)}%`,
              fill: typography.axisLabel.color,
              fontSize: typography.axisLabel.size,
              position: 'top',
            }}
            onClick={() => onTierClick?.(tier)}
            style={{ cursor: onTierClick ? 'pointer' : undefined }}
          />
        ))}

        {/* Variable-regime: slate circles */}
        <Scatter
          data={variableData}
          isAnimationActive={false}
          onClick={(entry) => onDotClick?.(entry as unknown as StripPlotDatum)}
        >
          {variableData.map((_, i) => (
            <Cell
              key={`var-${i}`}
              fill={colors.neutral}
              r={shapes.variable.radius}
            />
          ))}
        </Scatter>

        {/* Fixed-regime: orange diamonds */}
        <Scatter
          data={fixedData}
          shape={<Diamond />}
          isAnimationActive={false}
          onClick={(entry) => onDotClick?.(entry as unknown as StripPlotDatum)}
        >
          {fixedData.map((_, i) => (
            <Cell key={`fix-${i}`} fill={colors.highlight} />
          ))}
        </Scatter>

        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: typography.tooltipLabel.color, fontSize: typography.tooltipLabel.size }}
          itemStyle={{ color: typography.tooltipValue.color, fontSize: typography.tooltipValue.size }}
        />
      </ScatterChart>
    </ChartWrapper>
  );
}
