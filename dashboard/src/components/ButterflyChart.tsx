/**
 * §11.3 Butterfly Chart (Diverging Paired Bars)
 *
 * Argument: Some sub-categories tolerate discounting; others collapse immediately.
 * Tables and Storage are the most fragile.
 *
 * Rendering:
 *   - Left bars (undiscounted): slate — the reference state.
 *   - Right bars (discounted): orange + hatch where margin < 0; slate where positive.
 *   - Sorted descending by absolute swing. Top two bold.
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { colors, chartDefaults, typography } from '../lib/theme';
import { ChartWrapper, tooltipStyle, gridProps } from './ChartWrapper';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ButterflyDatum {
  subCategory: string;
  undiscountedMargin: number;
  discountedMargin: number;
}

interface ButterflyChartProps {
  data: ButterflyDatum[];
  width?: number;
  height?: number;
  title?: string;
  subtitle?: string;
  /** How many top rows to bold (default 2: Tables, Storage) */
  boldTop?: number;
  onRowClick?: (d: ButterflyDatum) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ButterflyChart({
  data,
  width: _width = 720,
  height = 400,
  title = 'Tables and Storage collapse under discounting',
  subtitle,
  boldTop = 2,
  onRowClick,
}: ButterflyChartProps) {
  void _width;
  // Sort descending by absolute swing
  const sorted = [...data].sort(
    (a, b) =>
      Math.abs(b.undiscountedMargin - b.discountedMargin) -
      Math.abs(a.undiscountedMargin - a.discountedMargin),
  );

  // Negate undiscounted values so they extend left
  const chartData = sorted.map((d) => ({
    ...d,
    left: -Math.abs(d.undiscountedMargin),
    right: d.discountedMargin,
  }));

  return (
    <ChartWrapper title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height={height}>
      <BarChart
        layout="vertical"
        data={chartData}
        margin={chartDefaults.margin}
      >
        <CartesianGrid {...gridProps} />
        <XAxis
          type="number"
          tick={{ fill: typography.axisLabel.color, fontSize: typography.axisLabel.size }}
          axisLine={false}
          tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
        />
        <YAxis
          dataKey="subCategory"
          type="category"
          tick={(props: { x: string | number; y: string | number; index?: number; payload: { value: string } }) => {
            const isBold = (props.index ?? 0) < boldTop;
            return (
              <text
                x={props.x}
                y={props.y}
                textAnchor="end"
                dominantBaseline="central"
                fill={typography.axisLabel.color}
                fontSize={typography.axisLabel.size}
                fontWeight={isBold ? 700 : typography.axisLabel.weight}
              >
                {props.payload.value}
              </text>
            );
          }}
          axisLine={false}
          width={100}
        />

        <ReferenceLine x={0} stroke={colors.muted} strokeDasharray="3 3" />

        {/* Left bars — undiscounted (slate) */}
        <Bar
          dataKey="left"
          fill={colors.neutral}
          isAnimationActive={false}
          onClick={(_, index) => onRowClick?.(sorted[index])}
          style={{ cursor: onRowClick ? 'pointer' : undefined }}
        />

        {/* Right bars — discounted (orange+hatch when negative, slate when positive) */}
        <Bar
          dataKey="right"
          isAnimationActive={false}
          onClick={(_, index) => onRowClick?.(sorted[index])}
          style={{ cursor: onRowClick ? 'pointer' : undefined }}
        >
          {chartData.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.right < 0 ? 'url(#hatch-loss)' : colors.neutral}
            />
          ))}
        </Bar>

        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: typography.tooltipLabel.color, fontSize: typography.tooltipLabel.size }}
          itemStyle={{ color: typography.tooltipValue.color, fontSize: typography.tooltipValue.size }}
        />
      </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}
