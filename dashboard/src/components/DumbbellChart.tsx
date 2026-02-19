/**
 * §11.4 Dumbbell Chart (Paired Dot)
 *
 * Argument: Most managers carry inherited policy drag. Ballentine does not —
 * his losses are entirely discretionary.
 *
 * Rendering:
 *   - Raw margin dot: slate circle, 8px.
 *   - Adjusted margin dot: blue circle, 8px.
 *   - Connecting line: muted, 2px.
 *   - Ballentine: both dots at same x, annotation "No inherited policies" in orange.
 */

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
  Customized,
  ResponsiveContainer,
} from 'recharts';
import { colors, chartDefaults, typography } from '../lib/theme';
import { ChartWrapper, tooltipStyle, gridProps } from './ChartWrapper';

// ─── Types ──────────────────────────────────────────────────────────────────

interface DumbbellDatum {
  manager: string;
  rawMargin: number;
  adjustedMargin: number;
  /** True for the manager with no inherited policies (e.g. Ballentine) */
  noInheritedPolicy?: boolean;
}

interface DumbbellChartProps {
  data: DumbbellDatum[];
  width?: number;
  height?: number;
  title?: string;
  subtitle?: string;
  onManagerClick?: (d: DumbbellDatum) => void;
}

// ─── Custom connecting line component ───────────────────────────────────────

function ConnectingLines({
  data,
  xAxisMap,
  yAxisMap,
}: {
  data: DumbbellDatum[];
  xAxisMap?: Record<string, { scale: (v: number) => number }>;
  yAxisMap?: Record<string, { scale: (v: string) => number; bandSize?: number }>;
}) {
  if (!xAxisMap || !yAxisMap) return null;
  const xScale = Object.values(xAxisMap)[0]?.scale;
  const yAxis = Object.values(yAxisMap)[0];
  const yScale = yAxis?.scale;
  if (!xScale || !yScale) return null;
  const bandOffset = (yAxis.bandSize ?? 0) / 2;
  return (
    <g>
      {data.map((d) => {
        const y = yScale(d.manager as unknown as string) + bandOffset;
        const x1 = xScale(d.rawMargin);
        const x2 = xScale(d.adjustedMargin);
        if (isNaN(x1) || isNaN(x2) || isNaN(y)) return null;
        return (
          <line
            key={d.manager}
            x1={x1}
            y1={y}
            x2={x2}
            y2={y}
            stroke={colors.muted}
            strokeWidth={2}
          />
        );
      })}
    </g>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function DumbbellChart({
  data,
  width: _width = 720,
  height = 400,
  title = "Most managers carry inherited policy drag — Ballentine doesn't",
  subtitle,
  onManagerClick,
}: DumbbellChartProps) {
  void _width;
  const DOT_RADIUS = 8;

  // Prepare scatter data for raw and adjusted dots
  const rawDots = data.map((d) => ({ ...d, x: d.rawMargin, y: d.manager }));
  const adjDots = data.map((d) => ({ ...d, x: d.adjustedMargin, y: d.manager }));

  // Calculate domain with nice round percentage ticks
  const allValues = data.flatMap((d) => [d.rawMargin, d.adjustedMargin]);
  const xMin = Math.min(...allValues);
  const xMax = Math.max(...allValues);
  const padding = (xMax - xMin) * 0.15;

  // Round domain to nearest 5% for clean axis
  const domainMin = Math.floor((xMin - padding) * 20) / 20; // nearest 5%
  const domainMax = Math.ceil((xMax + padding) * 20) / 20;

  // Generate evenly-spaced round ticks (every 5 or 10 percentage points)
  const xTicks: number[] = [];
  const step = 0.05; // 5 percentage points
  for (let t = domainMin; t <= domainMax + 1e-9; t += step) {
    xTicks.push(Math.round(t * 100) / 100);
  }

  return (
    <ChartWrapper title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height={height}>
      <ScatterChart
        margin={{ ...chartDefaults.margin, left: 100 }}
      >
        <CartesianGrid {...gridProps} />
        <Customized component={(props: Record<string, unknown>) => (
          <ConnectingLines
            data={data}
            xAxisMap={props.xAxisMap as Record<string, { scale: (v: number) => number }>}
            yAxisMap={props.yAxisMap as Record<string, { scale: (v: string) => number; bandSize?: number }>}
          />
        )} />
        <XAxis
          dataKey="x"
          type="number"
          domain={[domainMin, domainMax]}
          ticks={xTicks}
          tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
          tick={{ fill: typography.axisLabel.color, fontSize: typography.axisLabel.size }}
          axisLine={false}
          name="Margin"
        />
        <YAxis
          dataKey="y"
          type="category"
          allowDuplicatedCategory={false}
          tick={{ fill: typography.axisLabel.color, fontSize: typography.axisLabel.size }}
          axisLine={false}
          width={90}
        />

        {/* Raw margin dots — slate */}
        <Scatter
          data={rawDots}
          isAnimationActive={false}
          onClick={(entry) => onManagerClick?.(entry as unknown as DumbbellDatum)}
        >
          {rawDots.map((_, i) => (
            <Cell key={`raw-${i}`} fill={colors.neutral} r={DOT_RADIUS} />
          ))}
        </Scatter>

        {/* Adjusted margin dots — blue */}
        <Scatter
          data={adjDots}
          isAnimationActive={false}
          onClick={(entry) => onManagerClick?.(entry as unknown as DumbbellDatum)}
        >
          {adjDots.map((_, i) => (
            <Cell key={`adj-${i}`} fill={colors.selection} r={DOT_RADIUS} />
          ))}
        </Scatter>

        {/* Annotation for managers with no inherited policy — show label only once */}
        {(() => {
          const noPolicyManagers = data.filter((d) => d.noInheritedPolicy);
          if (noPolicyManagers.length === 0) return null;
          const first = noPolicyManagers[0];
          return (
            <ReferenceLine
              key={first.manager}
              x={first.rawMargin}
              stroke="transparent"
              label={{
                value: 'No inherited policies',
                fill: colors.highlight,
                fontSize: 11,
                fontWeight: 500,
                position: 'right',
              }}
            />
          );
        })()}

        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: typography.tooltipLabel.color, fontSize: typography.tooltipLabel.size }}
          itemStyle={{ color: typography.tooltipValue.color, fontSize: typography.tooltipValue.size }}
        />
      </ScatterChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}
