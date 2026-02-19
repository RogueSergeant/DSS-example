/**
 * §11.2 Waterfall Chart
 *
 * Argument: Two distinct blocks of erasure reduce potential profit by $812K.
 * Each has a different cause and a different fix.
 *
 * Rendering:
 *   - total / result bars: slate
 *   - negative bars: orange + diagonal hatch
 *   - Connecting dashed lines between bars
 *   - Value labels: loss in orange, baseline/result in emphasis text
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
  LabelList,
} from 'recharts';
import { colors, chartDefaults, typography } from '../lib/theme';
import { ChartWrapper, tooltipStyle, gridProps } from './ChartWrapper';

// ─── Types ──────────────────────────────────────────────────────────────────

interface WaterfallDatum {
  name: string;
  value: number;
  type: 'total' | 'negative' | 'result';
}

interface WaterfallChartProps {
  data: WaterfallDatum[];
  width?: number;
  height?: number;
  title?: string;
  subtitle?: string;
  /** Format a numeric value for display */
  formatValue?: (v: number) => string;
  onBlockClick?: (d: WaterfallDatum) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

interface ProcessedBar {
  name: string;
  base: number;
  delta: number;
  total: number;
  type: 'total' | 'negative' | 'result';
  originalValue: number;
}

function processWaterfallData(data: WaterfallDatum[]): ProcessedBar[] {
  const bars: ProcessedBar[] = [];
  let running = 0;

  for (const d of data) {
    if (d.type === 'total') {
      running = d.value;
      bars.push({ name: d.name, base: 0, delta: d.value, total: d.value, type: d.type, originalValue: d.value });
    } else if (d.type === 'negative') {
      const newRunning = running + d.value; // d.value is negative
      bars.push({ name: d.name, base: newRunning, delta: -d.value, total: newRunning, type: d.type, originalValue: d.value });
      running = newRunning;
    } else {
      // result
      bars.push({ name: d.name, base: 0, delta: running, total: running, type: d.type, originalValue: running });
    }
  }

  return bars;
}

function getFill(type: string): string {
  if (type === 'negative') return 'url(#hatch-loss)';
  return colors.neutral;
}

function _getLabelColor(type: string): string {
  return type === 'negative' ? colors.highlight : colors.emphasisText;
}
void _getLabelColor;

// ─── Component ──────────────────────────────────────────────────────────────

export function WaterfallChart({
  data,
  width = 720,
  height = 400,
  title = 'Two blocks of erasure reduce profit',
  subtitle,
  formatValue = (v) => `$${Math.abs(v / 1000).toFixed(0)}K`,
  onBlockClick,
}: WaterfallChartProps) {
  const processed = processWaterfallData(data);

  return (
    <ChartWrapper title={title} subtitle={subtitle}>
      <BarChart
        width={width}
        height={height}
        data={processed}
        margin={chartDefaults.margin}
      >
        <CartesianGrid {...gridProps} />
        <XAxis
          dataKey="name"
          tick={{ fill: typography.axisLabel.color, fontSize: typography.axisLabel.size }}
          axisLine={false}
        />
        <YAxis
          tick={{ fill: typography.axisLabel.color, fontSize: typography.axisLabel.size }}
          axisLine={false}
          tickFormatter={(v: number) =>
            Math.abs(v) >= 1_000_000
              ? `$${(v / 1_000_000).toFixed(1)}M`
              : `$${(v / 1_000).toFixed(0)}K`
          }
        />

        <ReferenceLine y={0} stroke={colors.muted} />

        {/* Invisible base bar */}
        <Bar dataKey="base" stackId="waterfall" fill="transparent" isAnimationActive={false} />

        {/* Visible delta bar */}
        <Bar
          dataKey="delta"
          stackId="waterfall"
          isAnimationActive={false}
          onClick={(_, index) => onBlockClick?.(data[index])}
          style={{ cursor: onBlockClick ? 'pointer' : undefined }}
        >
          {processed.map((entry, i) => (
            <Cell key={i} fill={getFill(entry.type)} />
          ))}
          <LabelList
            dataKey="originalValue"
            position="top"
            formatter={(v: unknown) => formatValue(v as number)}
            style={{ fontSize: typography.annotation.size, fontWeight: typography.annotation.weight }}
            fill={colors.emphasisText}
          />
        </Bar>

        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: typography.tooltipLabel.color, fontSize: typography.tooltipLabel.size }}
          formatter={(_value: unknown, _name: unknown, props: unknown) => {
            const entry = (props as { payload: ProcessedBar }).payload;
            const abs = formatValue(entry.originalValue);
            const pct = data[0]?.value
              ? `${((Math.abs(entry.originalValue) / data[0].value) * 100).toFixed(1)}%`
              : '';
            return [`${abs} (${pct} of baseline)`, entry.name];
          }}
        />
      </BarChart>
    </ChartWrapper>
  );
}
