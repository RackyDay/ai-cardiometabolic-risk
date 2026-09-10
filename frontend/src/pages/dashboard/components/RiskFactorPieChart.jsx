import { useState } from "react";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Sector,
} from "recharts";

import "./RiskFactorPieChart.css";


/*
 * Each risk factor has a stable colour.
 * The colour is based on the factor name rather
 * than its position in the list.
 */
export const RISK_FACTOR_COLORS = {
  "Body mass index": "#2563EB",                         // Blue
  "Diastolic blood pressure": "#9333EA",                // Purple
  "Systolic blood pressure": "#EA580C",                 // Orange
  "Blood pressure medication status": "#0F766E",        // Teal
  "Total cholesterol level": "#DB2777",                // Pink
  "Fasting blood glucose level": "#16A34A",             // Green
  "Smoking status": "#DC2626",                         // Red
  "Number of cigarettes smoked per day": "#0891B2",    // Cyan
  "Age": "#D97706",                                    // Amber
  "Gender": "#4F46E5",                                 // Indigo
  "Hypertension diagnosis status": "#854D0E",          // Brown
  "Resting heart rate": "#BE123C",                     // Dark rose
  "Diabetes diagnosis status": "#0369A1",              // Dark blue
};

export function getRiskFactorColor(name, index = 0) {
  return (
    RISK_FACTOR_COLORS[name] ??
    Object.values(RISK_FACTOR_COLORS)[
      index %
        Object.values(RISK_FACTOR_COLORS).length
    ]
  );
}


/*
 * Brief explanations shown in the risk-factor
 * breakdown when the user hovers over a factor.
 */
export const RISK_FACTOR_DESCRIPTIONS = {

  "Body mass index":
    "A higher BMI can be associated with obesity, which can increase cardiovascular risk and place additional strain on the heart.",

  "Diastolic blood pressure":
    "Higher blood pressure increases the workload on the heart and can damage blood vessels over time, increasing cardiovascular risk.",

  "Systolic blood pressure":
    "Higher blood pressure increases the workload on the heart and is an important contributor to heart attack and stroke risk.",

  "Blood pressure medication status":
    "Blood pressure medication can indicate a history of hypertension. Well-controlled blood pressure can help reduce cardiovascular risk.",

  "Total cholesterol level":
    "Higher cholesterol levels can contribute to plaque buildup in arteries, increasing the risk of heart disease and stroke.",

  "Fasting blood glucose level":
    "Elevated blood glucose can be associated with insulin resistance and diabetes, conditions that can increase cardiovascular risk.",

  "Smoking status":
    "Smoking damages blood vessels, makes blood clots more likely and increases the risk of heart disease and stroke.",

  "Number of cigarettes smoked per day":
    "Greater tobacco exposure is associated with cardiovascular harm because smoking can damage blood vessels and promote plaque buildup.",

  "Age":
    "Cardiovascular risk generally increases with age as changes in blood vessels and the accumulation of other risk factors become more common.",

  "Gender":
    "Sex is included in many cardiovascular risk models because cardiovascular risk patterns differ between males and females.",

  "Hypertension diagnosis status":
    "A history of hypertension is an important cardiovascular risk factor because persistently high blood pressure can damage the heart and blood vessels.",

  "Resting heart rate":
    "Resting heart rate can provide information about cardiovascular health, although its contribution depends on the individual's overall health and other factors.",

  "Diabetes diagnosis status":
    "Diabetes can damage blood vessels and is associated with a higher risk of heart disease and stroke.",
};


function getRiskFactorDescription(name) {
  return (
    RISK_FACTOR_DESCRIPTIONS[name] ||
    "This factor is included by the risk model because it can provide information relevant to cardiovascular risk."
  );
}


/* =========================================================
   Tooltip
========================================================= */

function RiskFactorTooltip({
  active,
  payload,
}) {
  if (
    !active ||
    !payload ||
    payload.length === 0
  ) {
    return null;
  }

  const factor = payload[0].payload;

  const contribution = Number(
    factor.value
  );

  return (
    <div className="risk-chart-tooltip">

      <div className="risk-chart-tooltip-title">
        {factor.name}
      </div>

      <div className="risk-chart-tooltip-divider" />

      <div className="risk-chart-tooltip-row">

        <span>
          Contribution
        </span>

        <strong>
          {Number.isFinite(contribution)
            ? `${contribution.toFixed(2)}%`
            : "N/A"}
        </strong>

      </div>

      {typeof factor.raisesRisk ===
        "boolean" && (

        <div className="risk-chart-tooltip-row">

          <span>
            Impact
          </span>

          <strong
            className={
              factor.raisesRisk
                ? "risk-tooltip-positive"
                : "risk-tooltip-negative"
            }
          >
            {factor.raisesRisk
              ? "Raises risk"
              : "Lowers risk"}
          </strong>

        </div>
      )}

    </div>
  );
}


/* =========================================================
   Pie Chart
========================================================= */

function RiskFactorPieChart({
  data,
  hypotheticalData,
  isHypotheticalActive = false,
}) {

  const [
    activeIndex,
    setActiveIndex,
  ] = useState(null);

  const [
    selectedIndex,
    setSelectedIndex,
  ] = useState(null);


  /*
   * Only one chart is displayed at a time.
   */
  const chartData =
    isHypotheticalActive &&
    hypotheticalData &&
    hypotheticalData.length > 0
      ? hypotheticalData
      : data;


  if (
    !chartData ||
    chartData.length === 0
  ) {
    return (
      <p className="risk-factors-empty">
        Submit your health information
        to see your risk factors.
      </p>
    );
  }


  const highlightedIndex =
    selectedIndex !== null
      ? selectedIndex
      : activeIndex;

  const highlightedFactor =
    highlightedIndex !== null
      ? chartData[highlightedIndex]
      : null;


  const handleMouseEnter = (
    _,
    index
  ) => {
    setActiveIndex(index);
  };


  const handleMouseLeave = () => {
    setActiveIndex(null);
  };


  const handleClick = (
    _,
    index
  ) => {
    setSelectedIndex(
      (current) =>
        current === index
          ? null
          : index
    );
  };


  return (
    <div className="risk-chart-container">

      {/* =====================================================
          Chart
      ====================================================== */}

      <div className="risk-donut-section">

        <div
          className={`risk-chart-mode ${
            isHypotheticalActive
              ? "risk-chart-mode-hypothetical"
              : "risk-chart-mode-original"
          }`}
        >

          <span className="risk-chart-mode-dot" />

          {isHypotheticalActive
            ? "What-if scenario"
            : "Original assessment"}

        </div>


        <div className="risk-chart-hint">

          {isHypotheticalActive
            ? "Showing the estimated contribution after your changes."
            : "Hover or tap a factor to see its contribution."}

        </div>


        <div className="risk-donut-wrapper">

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <PieChart>

              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="48%"
                outerRadius="78%"
                paddingAngle={2}
                stroke="#ffffff"
                strokeWidth={2}
                activeIndex={
                  highlightedIndex ??
                  undefined
                }

               activeShape={(props) => (
              <Sector {...props}
              outerRadius={props.outerRadius + 6}
              stroke="#ffffff"
              strokeWidth={3}
              style={{
              filter:
              "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.12))",
              transition: "all 0.2s ease",
              }}
              />                                  // Bug fix when the pie becomes deformed when one sector is a major factor.
              )}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={ handleMouseLeave}
                onClick={ handleClick}
              >

                {chartData.map(
                  (entry, index) => (

                    <Cell
                      key={`cell-${entry.name}`}
                      /*
                       * Stable colour based on
                       * the actual factor name.
                       */
                      fill={getRiskFactorColor(entry.name,index)}

                      opacity={
                        highlightedIndex ===
                          null ||
                        highlightedIndex ===
                          index
                          ? 1
                          : 0.35
                      }
                    />

                  )
                )}

              </Pie>


              <Tooltip
                content={
                  <RiskFactorTooltip />
                }

                position={{
                  x: 15,
                  y: 8,
                }}

                wrapperStyle={{
                  zIndex: 50,
                  pointerEvents:
                    "none",
                  position: "absolute",
                }}
              />

            </PieChart>

          </ResponsiveContainer>


          {/* =================================================
              Centre text
          ================================================== */}

          <div className="risk-chart-center-text">

            <strong>

              {isHypotheticalActive
                ? "What-if"
                : "Original"}

            </strong>

            <span>
              Risk contribution
            </span>

          </div>

        </div>

        {highlightedFactor && (
          <div className="risk-chart-selected-factor">
            <div className="risk-chart-selected-factor-title">
              {highlightedFactor.name}
            </div>

            <div className="risk-chart-selected-factor-row">
              <span>Contribution</span>
              <strong>
                {Number(highlightedFactor.value).toFixed(2)}%
              </strong>
            </div>

            {typeof highlightedFactor.raisesRisk === "boolean" && (
              <div className="risk-chart-selected-factor-row">
                <span>Impact</span>
                <strong
                  className={
                    highlightedFactor.raisesRisk
                      ? "risk-tooltip-positive"
                      : "risk-tooltip-negative"
                  }
                >
                  {highlightedFactor.raisesRisk ? "Raises risk" : "Lowers risk"}
                </strong>
              </div>
            )}
          </div>
        )}
        
      </div>

    </div>
  );
}


export default RiskFactorPieChart;