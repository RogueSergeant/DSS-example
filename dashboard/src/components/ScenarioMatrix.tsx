/**
 * §11.6 Scenario Heatmap Matrix
 *
 * Argument: Every scenario is an improvement. The range is +54% to +81%.
 * The matrix lets the audience negotiate the intervention level.
 *
 * Rendering:
 *   - CSS grid / HTML table (not Recharts).
 *   - Single-hue blue scale: light lavender at min → selection blue at max.
 *   - Cell text: dark on light cells, white on saturated cells.
 *   - Active cell: blue glow ring.
 */

import { colors, typography, shadows } from '../lib/theme';

// ─── Types ──────────────────────────────────────────────────────────────────

interface MatrixCell {
  profit: string;
  uplift: number;
}

interface ScenarioMatrixProps {
  /** Row labels (e.g. Slider A values) */
  rowLabels: string[];
  /** Column labels (e.g. Slider B values) */
  colLabels: string[];
  /** 2D array of cell data [row][col] */
  cells: MatrixCell[][];
  /** Currently active cell [rowIndex, colIndex] */
  activeCell?: [number, number];
  /** Minimum uplift in dataset (for colour scaling) */
  minUplift: number;
  /** Maximum uplift in dataset (for colour scaling) */
  maxUplift: number;
  onCellClick?: (row: number, col: number) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Interpolate between light lavender (#f0ecf8) and selection blue (#2563eb) */
function interpolateBlue(t: number): string {
  // #f0ecf8 → rgb(240, 236, 248)
  // #2563eb → rgb(37, 99, 235)
  const r = Math.round(240 + (37 - 240) * t);
  const g = Math.round(236 + (99 - 236) * t);
  const b = Math.round(248 + (235 - 248) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

/** Dark text on light cells, white on saturated cells */
function textColor(t: number): string {
  return t > 0.55 ? '#ffffff' : colors.emphasisText;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ScenarioMatrix({
  rowLabels,
  colLabels,
  cells,
  activeCell,
  minUplift,
  maxUplift,
  onCellClick,
}: ScenarioMatrixProps) {
  const range = maxUplift - minUplift || 1;

  return (
    <div
      role="grid"
      aria-label="Scenario heatmap matrix — every cell is a profit improvement"
      style={{ overflowX: 'auto' }}
    >
      <table
        style={{
          borderCollapse: 'separate',
          borderSpacing: 3,
          width: '100%',
        }}
      >
        <thead>
          <tr>
            {/* Top-left empty corner */}
            <th />
            {colLabels.map((col) => (
              <th
                key={col}
                style={{
                  fontSize: typography.tableHeader.size,
                  fontWeight: typography.tableHeader.weight,
                  color: typography.tableHeader.color,
                  textAlign: 'center',
                  padding: '6px 8px',
                  letterSpacing: '0.02em',
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowLabels.map((row, ri) => (
            <tr key={row}>
              <th
                style={{
                  fontSize: typography.tableHeader.size,
                  fontWeight: typography.tableHeader.weight,
                  color: typography.tableHeader.color,
                  textAlign: 'right',
                  padding: '6px 10px 6px 0',
                  whiteSpace: 'nowrap',
                }}
              >
                {row}
              </th>
              {colLabels.map((_, ci) => {
                const cell = cells[ri]?.[ci];
                if (!cell) return <td key={ci} />;

                const t = (cell.uplift - minUplift) / range;
                const isActive =
                  activeCell != null && activeCell[0] === ri && activeCell[1] === ci;

                return (
                  <td
                    key={ci}
                    role="gridcell"
                    tabIndex={0}
                    onClick={() => onCellClick?.(ri, ci)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onCellClick?.(ri, ci);
                      }
                    }}
                    style={{
                      background: interpolateBlue(t),
                      boxShadow: isActive
                        ? `0 0 0 2px ${colors.selection}`
                        : 'none',
                      borderRadius: 6,
                      padding: '10px 12px',
                      textAlign: 'center',
                      cursor: onCellClick ? 'pointer' : undefined,
                      minWidth: 100,
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      if (!isActive) {
                        e.currentTarget.style.boxShadow = shadows.card;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      if (!isActive) {
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: textColor(t),
                        lineHeight: 1.3,
                      }}
                    >
                      {cell.profit}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 400,
                        color: textColor(t),
                        opacity: 0.85,
                      }}
                    >
                      +{cell.uplift.toFixed(0)}%
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
