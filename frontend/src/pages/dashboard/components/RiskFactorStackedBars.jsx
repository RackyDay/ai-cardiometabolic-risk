import { useState } from "react";

import "./RiskFactorStackedBars.css";
import { getRiskFactorColor } from "../riskFactorColors";
import { formatRiskScoreShare } from "./RiskFactorPieChart";

// Matches the existing "changeable" accent used by the factor tabs/disclaimer
// elsewhere on this page, and the pie's own grey fallback for its grouped
// "Fixed factors" slice - so a category reads the same color everywhere it
// shows up, not just within this one chart.
const CHANGEABLE_ACCENT = "#2563eb";
const FIXED_ACCENT = "#94a3b8";

const LABEL_MIN_WIDTH_PERCENT = 15;


/* =========================================================
   One 100%-stacked bar: a single category's factors, laid
   out end to end instead of as pie wedges, so each one gets
   its own fully-labelled segment.
========================================================= */

function StackedBar({
  title,
  accentColor,
  emptyText,
  factors,
  categoryTotal,
  grandTotal,
}) {
  const [hoveredFeature, setHoveredFeature] = useState(null);

  const segments = [];
  let cumulativeLeft = 0;
  for (const factor of factors) {
    const widthPercent = (factor.value / categoryTotal) * 100;
    segments.push({ factor, widthPercent, left: cumulativeLeft });
    cumulativeLeft += widthPercent;
  }

  const hovered = segments.find((segment) => segment.factor.feature === hoveredFeature);

  return (
    <div className="risk-stacked-bar-card">

      <div className="risk-stacked-bar-header">
        <span className="risk-stacked-bar-dot" style={{ background: accentColor }} />
        <h3>{title}</h3>
        {categoryTotal > 0 && (
          <span className="risk-stacked-bar-subtotal">
            {formatRiskScoreShare(categoryTotal, grandTotal)}
          </span>
        )}
      </div>

      {categoryTotal <= 0 ? (

        <p className="risk-stacked-bar-empty">{emptyText}</p>

      ) : (

        <div
          className="risk-stacked-bar-track-wrapper"
          onMouseLeave={() => setHoveredFeature(null)}
        >

          <div className="risk-stacked-bar-track">

            {segments.map(({ factor, widthPercent }) => {
              const color = getRiskFactorColor(factor.feature);
              const showLabel = widthPercent >= LABEL_MIN_WIDTH_PERCENT;

              return (
                <div
                  key={factor.feature ?? factor.name}
                  className="risk-stacked-bar-segment"
                  style={{
                    width: `${widthPercent}%`,
                    backgroundColor: color,
                    opacity: hoveredFeature === null || hoveredFeature === factor.feature ? 1 : 0.65,
                  }}
                  onMouseEnter={() => setHoveredFeature(factor.feature)}
                  onFocus={() => setHoveredFeature(factor.feature)}
                  onBlur={() => setHoveredFeature(null)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${factor.name}: ${formatRiskScoreShare(factor.value, grandTotal)}`}
                >
                  {showLabel && (
                    <span className="risk-stacked-bar-segment-label">
                      {factor.name}
                    </span>
                  )}
                </div>
              );
            })}

          </div>

          {hovered && (

            <div
              className="risk-chart-tooltip risk-stacked-bar-tooltip"
              style={{
                left: `${hovered.left + hovered.widthPercent / 2}%`,
              }}
            >

              <div className="risk-chart-tooltip-title">
                <span
                  className="risk-chart-tooltip-colour"
                  style={{ backgroundColor: getRiskFactorColor(hovered.factor.feature) }}
                />
                <span>{hovered.factor.name}</span>
              </div>

              <div className="risk-chart-tooltip-divider" />

              <div className="risk-chart-tooltip-row">
                <span>Contribution to risk score</span>
                <strong>{formatRiskScoreShare(hovered.factor.value, grandTotal)}</strong>
              </div>

            </div>

          )}

        </div>

      )}

    </div>
  );
}


/* =========================================================
   Both bars + the equation tying them back to the pie's total
========================================================= */

function RiskFactorStackedBars({
  data,
  hypotheticalData,
  isHypotheticalActive = false,
}) {
  const chartData =
    isHypotheticalActive &&
    hypotheticalData &&
    hypotheticalData.length > 0
      ? hypotheticalData
      : data;

  if (!chartData || chartData.length === 0) return null;

  const changeable = chartData
    .filter((factor) => !factor.fixed && factor.value > 0)
    .sort((a, b) => b.value - a.value);

  const fixed = chartData
    .filter((factor) => factor.fixed && factor.value > 0)
    .sort((a, b) => b.value - a.value);

  const changeableTotal = changeable.reduce((sum, factor) => sum + factor.value, 0);
  const fixedTotal = fixed.reduce((sum, factor) => sum + factor.value, 0);
  const grandTotal = changeableTotal + fixedTotal;

  if (grandTotal <= 0) return null;

  const scenarioLabel = isHypotheticalActive ? "this what-if scenario" : "this assessment";

  return (
    <div className="risk-stacked-bars">

      <p className="risk-stacked-bars-description">
        The same {grandTotal.toFixed(2)}% risk score above, flattened into two bars -
        the factors you can influence, and the ones you can&apos;t.
      </p>

      <StackedBar
        title="Changeable factors"
        accentColor={CHANGEABLE_ACCENT}
        emptyText={`No risk-raising changeable factors in ${scenarioLabel}.`}
        factors={changeable}
        categoryTotal={changeableTotal}
        grandTotal={grandTotal}
      />

      <StackedBar
        title="Fixed factors"
        accentColor={FIXED_ACCENT}
        emptyText={`No risk-raising fixed factors in ${scenarioLabel}.`}
        factors={fixed}
        categoryTotal={fixedTotal}
        grandTotal={grandTotal}
      />

      <div className="risk-stacked-bars-equation">

        <span className="risk-stacked-bars-equation-term">
          <span className="risk-stacked-bar-dot" style={{ background: CHANGEABLE_ACCENT }} />
          {changeableTotal.toFixed(2)}% changeable
        </span>

        <span className="risk-stacked-bars-equation-op" aria-hidden="true">+</span>

        <span className="risk-stacked-bars-equation-term">
          <span className="risk-stacked-bar-dot" style={{ background: FIXED_ACCENT }} />
          {fixedTotal.toFixed(2)}% fixed
        </span>

        <span className="risk-stacked-bars-equation-op" aria-hidden="true">=</span>

        <strong>{grandTotal.toFixed(2)}% total risk score</strong>

      </div>

    </div>
  );
}

export default RiskFactorStackedBars;
