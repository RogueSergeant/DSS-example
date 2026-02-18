/**
 * §3 Secondary Encodings — Diagonal hatch overlay
 *
 * SVG <defs> block providing reusable hatch patterns for loss elements.
 * Orange-filled bars and cells receive this pattern (45°, 3px line, 6px spacing).
 * Renders as a hidden SVG; patterns are referenced via `url(#hatch-loss)`.
 */

import { hatch, colors } from '../lib/theme';

const PATTERN_SIZE = hatch.spacing * 2;

export function HatchPatternDefs() {
  return (
    <svg width={0} height={0} style={{ position: 'absolute' }}>
      <defs>
        {/* Primary loss hatch — used on waterfall, butterfly, bar charts */}
        <pattern
          id="hatch-loss"
          width={PATTERN_SIZE}
          height={PATTERN_SIZE}
          patternUnits="userSpaceOnUse"
          patternTransform={`rotate(${hatch.angle})`}
        >
          <rect width={PATTERN_SIZE} height={PATTERN_SIZE} fill={colors.highlight} />
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={PATTERN_SIZE}
            stroke={hatch.stroke}
            strokeWidth={hatch.lineWidth}
          />
        </pattern>

        {/* Subtle loss-zone hatch for slider charts (10% opacity for visibility on light bg) */}
        <pattern
          id="hatch-loss-zone"
          width={PATTERN_SIZE}
          height={PATTERN_SIZE}
          patternUnits="userSpaceOnUse"
          patternTransform={`rotate(${hatch.angle})`}
        >
          <rect width={PATTERN_SIZE} height={PATTERN_SIZE} fill="transparent" />
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={PATTERN_SIZE}
            stroke={hatch.stroke}
            strokeWidth={hatch.lineWidth}
            opacity={0.1}
          />
        </pattern>
      </defs>
    </svg>
  );
}
