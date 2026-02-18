/**
 * §11.6 Scenario Heatmap Matrix
 *
 * Argument: Every scenario is an improvement. The range is +54% to +81%.
 * The matrix lets the audience negotiate the intervention level.
 *
 * Rendering:
 *   - CSS grid / HTML table (not Recharts).
 *   - Single-hue blue scale: surface (#1e293b) at min → selection (#3b82f6) at max.
 *   - Cell text: profit (emphasis 14px 600) + uplift % (secondary 12px 400).
 *   - Active cell: 2px solid emphasis border.
 *   - High-intensity → emphasis text. Low-intensity → secondary text.
 */

import { colors, typography } from '../lib/theme';

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

/** Interpolate between surface (#1e293b) and selection (#3b82f6) */
function interpolateBlue(t: number): string {
  // #1e293b → rgb(30, 41, 59)
  // #3b82f6 → rgb(59, 130, 246)
  const r = Math.round(30 + (59 - 30) * t);
  const g = Math.round(41 + (130 - 41) * t);
  const b = Math.round(59 + (246 - 59) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

/** High-intensity cells get emphasis text; low-intensity get secondary */
function textColor(t: number): string {
  return t > 0.5 ? colors.emphasisText : colors.secondaryText;
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
          borderSpacing: 2,
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
                      border: isActive
                        ? `2px solid ${colors.emphasisText}`
                        : '2px solid transparent',
                      borderRadius: 4,
                      padding: '8px 10px',
                      textAlign: 'center',
                      cursor: onCellClick ? 'pointer' : undefined,
                      minWidth: 90,
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
                        opacity: 0.8,
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
