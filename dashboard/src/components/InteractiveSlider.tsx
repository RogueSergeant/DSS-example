/**
 * §11.5 Interactive Slider with Live KPI Update
 *
 * A range input controlling a discount-to-margin line chart.
 * - Reference line moves with slider (blue, 2px vertical).
 * - Left of line: blue fill 12% opacity (recovered zone).
 * - Right of line: orange fill 12% opacity + hatch 5% opacity (loss zone).
 * - Curve line: secondary text colour, 2px, no dot markers.
 * - Updates on every change event (not just on release).
 */

import { useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import { colors, chartDefaults, typography } from '../lib/theme';
import { ChartWrapper, tooltipStyle, gridProps } from './ChartWrapper';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CurvePoint {
  discount: number;
  margin: number;
}

interface InteractiveSliderProps {
  /** Discount-to-margin curve data points */
  curveData: CurvePoint[];
  /** Current slider value (discount threshold) */
  value: number;
  /** Domain bounds for discount axis */
  discountDomain?: [number, number];
  /** Domain bounds for margin axis */
  marginDomain?: [number, number];
  onChange: (value: number) => void;
  /** Step size for the slider */
  step?: number;
  /** Label shown above the slider */
  label?: string;
  width?: number;
  height?: number;
  title?: string;
  subtitle?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function InteractiveSlider({
  curveData,
  value,
  discountDomain,
  marginDomain,
  onChange,
  step = 0.01,
  label,
  width = 720,
  height = 300,
  title = 'Discount-to-margin response curve',
  subtitle,
}: InteractiveSliderProps) {
  const xMin = discountDomain?.[0] ?? curveData[0]?.discount ?? 0;
  const xMax = discountDomain?.[1] ?? curveData[curveData.length - 1]?.discount ?? 1;
  const yMin = marginDomain?.[0] ?? Math.min(...curveData.map((d) => d.margin));
  const yMax = marginDomain?.[1] ?? Math.max(...curveData.map((d) => d.margin));

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(parseFloat(e.target.value));
    },
    [onChange],
  );

  return (
    <ChartWrapper title={title} subtitle={subtitle}>
      <LineChart
        width={width}
        height={height}
        data={curveData}
        margin={chartDefaults.margin}
      >
        <CartesianGrid {...gridProps} />
        <XAxis
          dataKey="discount"
          type="number"
          domain={[xMin, xMax]}
          tick={{ fill: typography.axisLabel.color, fontSize: typography.axisLabel.size }}
          axisLine={false}
        />
        <YAxis
          dataKey="margin"
          type="number"
          domain={[yMin, yMax]}
          tick={{ fill: typography.axisLabel.color, fontSize: typography.axisLabel.size }}
          axisLine={false}
        />

        {/* Recovered zone — left of slider */}
        <ReferenceArea
          x1={xMin}
          x2={value}
          fill={colors.selection}
          fillOpacity={0.12}
        />

        {/* Loss zone — right of slider */}
        <ReferenceArea
          x1={value}
          x2={xMax}
          fill={colors.highlight}
          fillOpacity={0.12}
        />

        {/* Slider reference line */}
        <ReferenceLine
          x={value}
          stroke={colors.selection}
          strokeWidth={2}
        />

        {/* The empirical curve — neutral, not a problem or solution */}
        <Line
          dataKey="margin"
          stroke={colors.secondaryText}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />

        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: typography.tooltipLabel.color, fontSize: typography.tooltipLabel.size }}
          itemStyle={{ color: typography.tooltipValue.color, fontSize: typography.tooltipValue.size }}
        />
      </LineChart>

      {/* Range slider control */}
      <div style={{ padding: '8px 24px 0' }}>
        {label && (
          <label
            style={{
              display: 'block',
              marginBottom: 4,
              fontSize: typography.kpiLabel.size,
              color: typography.kpiLabel.color,
            }}
          >
            {label}
          </label>
        )}
        <input
          type="range"
          min={xMin}
          max={xMax}
          step={step}
          value={value}
          onChange={handleChange}
          aria-label={label ?? 'Discount threshold'}
          style={{
            width: '100%',
            accentColor: colors.selection,
          }}
        />
      </div>
    </ChartWrapper>
  );
}
