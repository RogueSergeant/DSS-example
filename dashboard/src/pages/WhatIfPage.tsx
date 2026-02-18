/**
 * Page 5 — What-If Analysis
 *
 * Two interactive sliders (fixed-country and variable-country discount caps)
 * with live KPI updates, a combined scenario heatmap matrix, and a
 * recommended-actions strip.
 */

import { useState, useMemo, useCallback } from 'react';
import { colors, typography, spacing, kpiCard } from '../lib/theme';
import {
  InteractiveSlider,
  ScenarioMatrix,
  KpiCard,
  DashboardPage,
  Section,
  Grid,
  Footnote,
} from '../components';
import { useData } from '../hooks/useData';
import { fmtDollar, fmtPct } from '../lib/format';
import type { WhatIfCurveData } from '../lib/types';

// ─── Extended data interfaces (match the full JSON shape) ───────────────────

interface FixedCapEntry {
  cap: number;
  projected_profit: number;
  recovery: number;
  uplift_pct: number;
}

interface VariableCapEntry {
  cap: number;
  lines_affected: number;
  recovery: number;
  new_total_profit: number;
  uplift_pct: number;
}

interface ScenarioEntry {
  fixed_cap: number;
  variable_cap: number;
  total_profit: number;
  combined_uplift: number;
}

interface FullWhatIfData extends WhatIfCurveData {
  constants: {
    total_company_baseline_profit: number;
    fixed_country_current_profit: number;
    variable_country_current_profit: number;
    zero_discount_country_profit: number;
  };
  whatif_fixed_cap_lookup: FixedCapEntry[];
  whatif_variable_cap_lookup: VariableCapEntry[];
  scenario_matrix: ScenarioEntry[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const FIXED_ROWS = [0, 10, 15, 20];
const VARIABLE_COLS = [15, 20, 25, 30];

// ─── Recommended actions data ───────────────────────────────────────────────

interface ActionCard {
  number: number;
  action: string;
  owner: string;
  impact: string | null; // null = dynamic from slider
  governance?: boolean;
}

const STATIC_ACTIONS: ActionCard[] = [
  {
    number: 1,
    action: 'Audit and reset discount configurations for 24 fixed-policy countries.',
    owner: 'CFO / Pricing',
    impact: null, // dynamic
  },
  {
    number: 2,
    action: 'Assign a regional manager to EMEA.',
    owner: 'VP Sales',
    impact: 'Governance gap closed',
    governance: true,
  },
  {
    number: 3,
    action: "Review Ballentine's discount authority.",
    owner: 'VP Sales',
    impact: 'Est. +$52K',
  },
  {
    number: 4,
    action: 'Implement sub-category discount ceilings.',
    owner: 'Head of Product',
    impact: 'Structural protection',
  },
  {
    number: 5,
    action: 'Invest in Copiers: 37% CAGR, 17% margin.',
    owner: 'Head of Product',
    impact: 'Growth + margin',
  },
];

// ─── Helper: lookup cap entry from precomputed arrays ───────────────────────

function lookupFixed(lookup: FixedCapEntry[], capPct: number): FixedCapEntry | undefined {
  const capInt = Math.round(capPct * 100);
  return lookup.find((e) => e.cap === capInt);
}

function lookupVariable(lookup: VariableCapEntry[], capPct: number): VariableCapEntry | undefined {
  const capInt = Math.round(capPct * 100);
  return lookup.find((e) => e.cap === capInt);
}

// ─── Component ──────────────────────────────────────────────────────────────

export function WhatIfPage() {
  const { data, loading, error } = useData<FullWhatIfData>('/data/whatif_discount_curve.json');

  const [fixedCap, setFixedCap] = useState(0.15);
  const [variableCap, setVariableCap] = useState(0.20);

  // ── Curve data for charts ──────────────────────────────────────────────

  const curveData = useMemo(() => {
    if (!data) return [];
    return data.curve.map((p) => ({
      discount: p.discount_rate,
      margin: p.avg_margin,
    }));
  }, [data]);

  // ── Fixed-country slider KPIs ──────────────────────────────────────────

  const fixedResult = useMemo(() => {
    if (!data) return { recovery: 0, uplift: 0 };
    const entry = lookupFixed(data.whatif_fixed_cap_lookup, fixedCap);
    if (!entry) return { recovery: 0, uplift: 0 };
    return { recovery: entry.recovery, uplift: entry.uplift_pct };
  }, [data, fixedCap]);

  // ── Variable-country slider KPIs ───────────────────────────────────────

  const variableResult = useMemo(() => {
    if (!data) return { recovery: 0, uplift: 0, linesAffected: 0 };
    const entry = lookupVariable(data.whatif_variable_cap_lookup, variableCap);
    if (!entry) return { recovery: 0, uplift: 0, linesAffected: 0 };
    return {
      recovery: entry.recovery,
      uplift: entry.uplift_pct,
      linesAffected: entry.lines_affected,
    };
  }, [data, variableCap]);

  // ── Scenario matrix ────────────────────────────────────────────────────

  const matrixResult = useMemo(() => {
    if (!data) return { cells: [], rowLabels: [], colLabels: [], minUplift: 0, maxUplift: 1 };

    const rowLabels = FIXED_ROWS.map((r) => `Fixed ${r}%`);
    const colLabels = VARIABLE_COLS.map((c) => `Var ${c}%`);

    const matrixMap = new Map<string, ScenarioEntry>();
    for (const entry of data.scenario_matrix) {
      matrixMap.set(`${entry.fixed_cap}-${entry.variable_cap}`, entry);
    }

    let minUplift = Infinity;
    let maxUplift = -Infinity;

    const cells = FIXED_ROWS.map((fr) =>
      VARIABLE_COLS.map((vc) => {
        const entry = matrixMap.get(`${fr}-${vc}`);
        const profit = entry ? entry.total_profit : 0;
        const uplift = entry ? entry.combined_uplift * 100 : 0;
        if (uplift < minUplift) minUplift = uplift;
        if (uplift > maxUplift) maxUplift = uplift;
        return {
          profit: fmtDollar(profit),
          uplift,
        };
      }),
    );

    return { cells, rowLabels, colLabels, minUplift, maxUplift };
  }, [data]);

  // ── Active cell tracking for the matrix ────────────────────────────────

  const activeCell = useMemo((): [number, number] | undefined => {
    const fixedCapInt = Math.round(fixedCap * 100);
    const varCapInt = Math.round(variableCap * 100);
    const ri = FIXED_ROWS.indexOf(fixedCapInt);
    const ci = VARIABLE_COLS.indexOf(varCapInt);
    if (ri >= 0 && ci >= 0) return [ri, ci];
    return undefined;
  }, [fixedCap, variableCap]);

  // ── Matrix cell click handler ──────────────────────────────────────────

  const handleCellClick = useCallback((row: number, col: number) => {
    setFixedCap(FIXED_ROWS[row] / 100);
    setVariableCap(VARIABLE_COLS[col] / 100);
  }, []);

  // ── Dynamic impact for action card 1 ──────────────────────────────────

  const action1Impact = useMemo(() => {
    return `Est. +${fmtDollar(fixedResult.recovery)}`;
  }, [fixedResult.recovery]);

  // ── Loading / Error states ─────────────────────────────────────────────

  if (loading) {
    return (
      <DashboardPage title="What-If Analysis">
        <p style={{ color: colors.secondaryText }}>Loading what-if data...</p>
      </DashboardPage>
    );
  }

  if (error || !data) {
    return (
      <DashboardPage title="What-If Analysis">
        <p style={{ color: colors.highlight }}>Error loading data: {error}</p>
      </DashboardPage>
    );
  }

  return (
    <DashboardPage title="What-If Analysis">
      {/* ── Section 1: Fixed-Country Slider ─────────────────────────────── */}
      <Section heading="Fixed-Country Discount Cap">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '7fr 3fr',
            gap: spacing.cardGap,
          }}
        >
          {/* Chart — 70% */}
          <div>
            <InteractiveSlider
              curveData={curveData}
              value={fixedCap}
              onChange={setFixedCap}
              discountDomain={[0, 0.30]}
              step={0.01}
              label="Fixed-country discount cap — drag to see recovery."
              title="Fixed-country discount-to-margin curve"
              subtitle={`Cap at ${fmtPct(fixedCap, 0)}`}
            />
            <Footnote>
              Projected margins assume fixed-country orders at the cap rate achieve the same margin
              as variable-country orders at that rate.
            </Footnote>
          </div>

          {/* KPI cards — 30% */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.cardGap }}>
            <KpiCard
              value={fmtDollar(fixedResult.recovery)}
              label="Estimated recovery"
              detail={`if fixed-country cap set to ${fmtPct(fixedCap, 0)}`}
            />
            <KpiCard
              value={`+${fmtPct(fixedResult.uplift, 1)}`}
              label="Profit uplift"
              detail="vs. current baseline"
            />
          </div>
        </div>
      </Section>

      {/* ── Section 2: Variable-Country Slider ──────────────────────────── */}
      <Section heading="Variable-Country Discount Cap">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '7fr 3fr',
            gap: spacing.cardGap,
          }}
        >
          {/* Chart — 70% */}
          <div>
            <InteractiveSlider
              curveData={curveData}
              value={variableCap}
              onChange={setVariableCap}
              discountDomain={[0.10, 0.30]}
              step={0.01}
              label="Variable-country discount cap — drag to see recovery."
              title="Variable-country discount-to-margin curve"
              subtitle={`Cap at ${fmtPct(variableCap, 0)}`}
            />
          </div>

          {/* KPI cards — 30% */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.cardGap }}>
            <KpiCard
              value={fmtDollar(variableResult.recovery)}
              label="Estimated recovery"
              detail={`if variable-country cap set to ${fmtPct(variableCap, 0)}`}
            />
            <KpiCard
              value={`+${fmtPct(variableResult.uplift, 1)}`}
              label="Profit uplift"
              detail="vs. current baseline"
            />
            <KpiCard
              value={variableResult.linesAffected.toLocaleString('en-US')}
              label="Lines affected"
              detail="order lines above cap"
            />
          </div>
        </div>
      </Section>

      {/* ── Section 3: Combined Scenario Matrix ─────────────────────────── */}
      <Section heading="Combined Scenario Matrix">
        <Grid>
          <div style={{ gridColumn: 'span 8' }}>
            <div
              style={{
                background: kpiCard.background,
                border: kpiCard.border,
                borderRadius: kpiCard.borderRadius,
                padding: kpiCard.padding,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  marginBottom: spacing.chartSubtitleMb,
                  fontSize: typography.chartTitle.size,
                  fontWeight: typography.chartTitle.weight,
                  color: typography.chartTitle.color,
                }}
              >
                Every scenario improves profit
              </h3>
              <p
                style={{
                  margin: 0,
                  marginBottom: spacing.chartSubtitleMb,
                  fontSize: typography.chartSubtitle.size,
                  color: typography.chartSubtitle.color,
                }}
              >
                Click a cell to set both sliders. Rows = fixed-country cap, columns =
                variable-country cap.
              </p>
              <ScenarioMatrix
                rowLabels={matrixResult.rowLabels}
                colLabels={matrixResult.colLabels}
                cells={matrixResult.cells}
                activeCell={activeCell}
                minUplift={matrixResult.minUplift}
                maxUplift={matrixResult.maxUplift}
                onCellClick={handleCellClick}
              />
            </div>
          </div>
        </Grid>
      </Section>

      {/* ── Section 4: Recommended Actions ──────────────────────────────── */}
      <Section heading="Recommended Actions">
        <div
          style={{
            display: 'flex',
            gap: spacing.cardGap,
            overflowX: 'auto',
          }}
        >
          {STATIC_ACTIONS.map((card) => {
            const impact = card.impact ?? action1Impact;
            const isGovernance = card.governance === true;

            return (
              <div
                key={card.number}
                style={{
                  flex: '1 1 0',
                  minWidth: 180,
                  background: kpiCard.background,
                  border: kpiCard.border,
                  borderRadius: kpiCard.borderRadius,
                  borderLeft: isGovernance
                    ? `4px solid ${colors.highlight}`
                    : kpiCard.border,
                  padding: kpiCard.padding,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {/* Blue number badge */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#ffffff',
                    flexShrink: 0,
                  }}
                >
                  {card.number}
                </div>

                {/* Action text */}
                <div
                  style={{
                    fontSize: typography.tableCell.size,
                    fontWeight: typography.tableCell.weight,
                    color: colors.emphasisText,
                    lineHeight: 1.4,
                    flex: 1,
                  }}
                >
                  {card.action}
                </div>

                {/* Owner */}
                <div
                  style={{
                    fontSize: typography.kpiLabel.size,
                    color: colors.secondaryText,
                  }}
                >
                  {card.owner}
                </div>

                {/* Impact */}
                <div
                  style={{
                    fontSize: typography.annotation.size,
                    fontWeight: typography.annotation.weight,
                    color: colors.selection,
                    marginTop: 'auto',
                  }}
                >
                  {impact}
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    </DashboardPage>
  );
}
