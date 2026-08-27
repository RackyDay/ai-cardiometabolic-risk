import { useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import "./RiskFactorPieChart.css";

const COLORS = [
  "#2563EB",
  "#7C3AED",
  "#EC4899",
  "#F97316",
  "#10B981",
  "#06B6D4",
  "#F59E0B",
  "#EF4444",
  "#6366F1",
  "#14B8A6",
];

const RISK_FACTOR_DESCRIPTIONS = {
  "Body mass index":
    "A higher BMI can be associated with obesity, which can increase the risk of cardiovascular disease and place additional strain on the heart.",

  "Diastolic blood pressure":
    "Higher blood pressure increases the workload on the heart and can damage blood vessels over time, increasing cardiovascular risk.",

  "Systolic blood pressure":
    "Higher blood pressure increases the workload on the heart and is an important contributor to heart attack and stroke risk.",

  "Blood pressure medication status":
    "Blood pressure medication can indicate a history of hypertension. Well-controlled blood pressure can help reduce cardiovascular risk.",

  "Total cholesterol level":
    "Higher cholesterol levels can contribute to plaque buildup in arteries, which can increase the risk of heart disease and stroke.",

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
    "Resting heart rate can provide information about cardiovascular health, although its contribution to risk depends on the individual's overall health and other factors.",

  "Diabetes diagnosis status":
    "Diabetes can damage blood vessels and is associated with a higher risk of heart disease and stroke.",
};

function getRiskFactorDescription(name) {
  if (RISK_FACTOR_DESCRIPTIONS[name]) {
    return RISK_FACTOR_DESCRIPTIONS[name];
  }

  return "This factor is included by the risk model because it can provide information relevant to cardiovascular risk.";
}


/* =========================================================
   Chart tooltip
========================================================= */

function RiskFactorTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const factor = payload[0].payload;

  const contribution = Number(factor.value);

  return (
    <div className="risk-chart-tooltip">
      <div className="risk-chart-tooltip-title">
        {factor.name}
      </div>

      <div className="risk-chart-tooltip-divider" />

      <div className="risk-chart-tooltip-row">
        <span>Contribution</span>

        <strong>
          {Number.isFinite(contribution)
            ? `${contribution.toFixed(2)}%`
            : "N/A"}
        </strong>
      </div>

      {typeof factor.raisesRisk === "boolean" && (
        <div className="risk-chart-tooltip-row">
          <span>Impact</span>

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
   Risk Factor Pie Chart
========================================================= */

function RiskFactorPieChart({
  data,
  hypotheticalData,
}) {
  const [activeIndex, setActiveIndex] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <p className="risk-factors-empty">
        Submit your health information to see your risk factors.
      </p>
    );
  }

  const highlightedIndex =
    selectedIndex !== null
      ? selectedIndex
      : activeIndex;

  const handleMouseEnter = (_, index) => {
    setActiveIndex(index);
  };

  const handleMouseLeave = () => {
    setActiveIndex(null);
  };

  const handleFactorClick = (_, index) => {
    setSelectedIndex((current) =>
      current === index ? null : index
    );
  };

  /*
   * If hypothetical data is not available yet,
   * simply display the original contribution chart.
   */
  const hasHypotheticalData =
    hypotheticalData &&
    hypotheticalData.length > 0;


  return (
    <div className="risk-chart-container">

      {/* =====================================================
          Chart area
      ====================================================== */}

      <div className="risk-donut-section">

        {/* Small instruction above the chart */}

        <div className="risk-chart-hint">
          Hover over a factor to see its contribution.
        </div>


        <div className="risk-donut-wrapper">

          <ResponsiveContainer
            width="100%"
            height={430}
          >

            <PieChart>

              {/* =================================================
                  What-if / hypothetical contribution
                  OUTER RING
              ================================================== */}

              {hasHypotheticalData && (
                <Pie
                  data={hypotheticalData}
                  dataKey="value"
                  nameKey="name"

                  cx="50%"
                  cy="52%"

                  innerRadius={155}
                  outerRadius={185}

                  paddingAngle={2}

                  stroke="#ffffff"
                  strokeWidth={2}

                  activeIndex={highlightedIndex ?? undefined}

                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  onClick={handleFactorClick}
                >
                  {hypotheticalData.map(
                    (entry, index) => (
                      <Cell
                        key={`hypothetical-${entry.name}`}
                        fill={
                          COLORS[
                            index % COLORS.length
                          ]
                        }

                        opacity={
                          highlightedIndex === null ||
                          highlightedIndex === index
                            ? 0.25
                            : 0.08
                        }
                      />
                    )
                  )}
                </Pie>
              )}


              {/* =================================================
                  Original contribution
                  INNER RING
              ================================================== */}

              <Pie
                data={data}
                dataKey="value"
                nameKey="name"

                cx="50%"
                cy="52%"

                innerRadius={90}
                outerRadius={145}

                paddingAngle={2}

                stroke="#ffffff"
                strokeWidth={2}

                activeIndex={highlightedIndex ?? undefined}

                activeShape={(props) => {
                  const {
                    cx,
                    cy,
                    innerRadius,
                    outerRadius,
                    startAngle,
                    endAngle,
                    fill,
                  } = props;

                  return (
                    <path
                      d={`
                        M ${
                          cx +
                          outerRadius *
                            Math.cos(
                              (-startAngle *
                                Math.PI) /
                                180
                            )
                        }
                          ${
                            cy +
                            outerRadius *
                              Math.sin(
                                (-startAngle *
                                  Math.PI) /
                                  180
                              )
                          }

                        A ${outerRadius} ${outerRadius}
                          0 0 0
                          ${
                            cx +
                            outerRadius *
                              Math.cos(
                                (-endAngle *
                                  Math.PI) /
                                  180
                              )
                          }
                          ${
                            cy +
                            outerRadius *
                              Math.sin(
                                (-endAngle *
                                  Math.PI) /
                                  180
                              )
                          }

                        L ${
                          cx +
                          innerRadius *
                            Math.cos(
                              (-endAngle *
                                Math.PI) /
                                180
                            )
                        }
                          ${
                            cy +
                            innerRadius *
                              Math.sin(
                                (-endAngle *
                                  Math.PI) /
                                  180
                              )
                          }

                        A ${innerRadius} ${innerRadius}
                          0 0 1
                          ${
                            cx +
                            innerRadius *
                              Math.cos(
                                (-startAngle *
                                  Math.PI) /
                                  180
                              )
                          }
                          ${
                            cy +
                            innerRadius *
                              Math.sin(
                                (-startAngle *
                                  Math.PI) /
                                  180
                              )
                          }

                        Z
                      `}

                      fill={fill}

                      stroke="#ffffff"
                      strokeWidth={3}

                      style={{
                        filter:
                          "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.12))",
                        transition:
                          "all 0.2s ease",
                      }}
                    />
                  );
                }}

                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={handleFactorClick}
              >

                {data.map(
                  (entry, index) => (
                    <Cell
                      key={`original-${entry.name}`}
                      fill={
                        COLORS[
                          index % COLORS.length
                        ]
                      }

                      opacity={
                        highlightedIndex === null ||
                        highlightedIndex === index
                          ? 1
                          : 0.35
                      }
                    />
                  )
                )}

              </Pie>


              {/* =================================================
                  Tooltip
              ================================================== */}

              <Tooltip
                content={
                  <RiskFactorTooltip />
                }

                /*
                 * Keep the tooltip away from the
                 * centre of the donut.
                 */
                position={{
                  x: 15,
                  y: 8,
                }}

                wrapperStyle={{
                  zIndex: 50,
                  pointerEvents: "none",
                }}
              />

            </PieChart>

          </ResponsiveContainer>


          {/* =================================================
              Centre text
          ================================================== */}

          <div className="risk-chart-center-text">

            <strong>
              Risk contribution
            </strong>

            <span>
              Original → What-if
            </span>

          </div>

        </div>


        {/* =====================================================
            Legend
        ====================================================== */}

        <div className="risk-chart-legend">

          <div className="risk-chart-legend-item">

            <span className="risk-chart-legend-dot original" />

            <span>
              Original assessment
            </span>

          </div>


          {hasHypotheticalData && (
            <div className="risk-chart-legend-item">

              <span className="risk-chart-legend-dot hypothetical" />

              <span>
                What-if scenario
              </span>

            </div>
          )}

        </div>

      </div>


      {/* =====================================================
          Risk Factor Breakdown
      ====================================================== */}

      <div className="risk-factor-breakdown">

        <div className="risk-factor-breakdown-header">

          <span>
            Risk factor
          </span>

          <span>
            Contribution
          </span>

        </div>


        {data.map(
          (entry, index) => {

            const isActive =
              activeIndex === index;


            return (
              <button
                key={entry.name}
                type="button"

                className={`risk-factor-breakdown-row ${
                  isActive
                    ? "risk-factor-breakdown-row-active"
                    : ""
                }`}

                onMouseEnter={() =>
                  setActiveIndex(index)
                }

                onMouseLeave={() =>
                  setActiveIndex(null)
                }

                onClick={() =>
                  handleFactorClick(
                    null,
                    index
                  )
                }
              >

                <div className="risk-factor-row-content">

                  <div className="risk-factor-name">

                    <span
                      className="risk-factor-color"

                      style={{
                        backgroundColor:
                          COLORS[
                            index %
                              COLORS.length
                          ],
                      }}
                    />

                    <span
                      title={entry.name}
                    >
                      {entry.name}
                    </span>

                  </div>


                  {isActive && (
                    <div className="risk-factor-explanation">

                      <span className="risk-factor-explanation-label">
                        Why it matters:
                      </span>

                      <span className="risk-factor-explanation-text">
                        {getRiskFactorDescription(
                          entry.name
                        )}
                      </span>

                    </div>
                  )}

                </div>


                <span className="risk-factor-percentage">

                  {Number(
                    entry.value
                  ).toFixed(2)}
                  %

                </span>

              </button>
            );
          }
        )}

      </div>

    </div>
  );
}

export default RiskFactorPieChart;