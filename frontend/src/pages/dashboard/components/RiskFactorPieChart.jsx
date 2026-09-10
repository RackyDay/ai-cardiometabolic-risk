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


/* =========================================================
   Stable colours for each risk factor
========================================================= */

export const RISK_FACTOR_COLORS = {
  "Body mass index": "#2563EB",
  "Diastolic blood pressure": "#9333EA",
  "Systolic blood pressure": "#EA580C",
  "Blood pressure medication status": "#0F766E",
  "Total cholesterol level": "#DB2777",
  "Fasting blood glucose level": "#16A34A",
  "Smoking status": "#DC2626",
  "Number of cigarettes smoked per day": "#0891B2",
  "Age": "#D97706",
  "Gender": "#4F46E5",
  "Hypertension diagnosis status": "#854D0E",
  "Resting heart rate": "#BE123C",
  "Diabetes diagnosis status": "#0369A1",
};


export function getRiskFactorColor(
  name,
  index = 0
) {
  const colours =
    Object.values(RISK_FACTOR_COLORS);

  return (
    RISK_FACTOR_COLORS[name] ??
    colours[index % colours.length]
  );
}


/* =========================================================
   Risk factor descriptions
========================================================= */

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

  const factor =
    payload[0].payload;

  const contribution =
    Number(factor.value);

  const factorColor =
    getRiskFactorColor(
      factor.name
    );


  return (
    <div className="risk-chart-tooltip">

      <div
        className="risk-chart-tooltip-title"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.55rem",
        }}
      >

        {/* Larger colour label */}

        <span
          style={{
            width: "13px",
            height: "13px",
            minWidth: "13px",
            borderRadius: "4px",
            backgroundColor:
              factorColor,
            boxShadow:
              "0 0 0 2px #ffffff, 0 0 0 3px rgba(15, 23, 42, 0.12)",
          }}
        />


        <span>
          {factor.name}
        </span>

      </div>


      <div className="risk-chart-tooltip-divider" />


      <div className="risk-chart-tooltip-row">

        <span>
          Relative contribution
        </span>

        <strong>
          {Number.isFinite(
            contribution
          )
            ? `${contribution.toFixed(
                2
              )}%`
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
  onFactorHover,
}) {

  /*
   * activeIndex = factor currently
   * being hovered.
   */
  const [
    activeIndex,
    setActiveIndex,
  ] = useState(null);


  /*
   * selectedIndex = factor clicked/tapped
   * by the user.
   */
  const [
    selectedIndex,
    setSelectedIndex,
  ] = useState(null);


  /* =======================================================
     Choose original or hypothetical data
  ======================================================= */

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


  /* =======================================================
     Determine highlighted factor
  ======================================================= */

  /*
   * Hover takes priority.
   *
   * This means that even if a user has clicked
   * one segment, hovering another segment still
   * highlights the hovered one.
   */
  const highlightedIndex =
    activeIndex !== null
      ? activeIndex
      : selectedIndex;


  const highlightedFactor =
    highlightedIndex !== null
      ? chartData[
          highlightedIndex
        ]
      : null;


  /* =======================================================
     Hover handlers
  ======================================================= */

  const handleMouseEnter = (
    _,
    index
  ) => {
    setActiveIndex(index);

    const factor =
      chartData[index];

    onFactorHover?.(
      factor?.feature ?? null
    );
  };


  const handleMouseLeave = () => {
    setActiveIndex(null);

    /*
     * If a factor was clicked previously,
     * return the highlight to that factor.
     */
    if (
      selectedIndex !== null
    ) {
      const selectedFactor =
        chartData[
          selectedIndex
        ];

      onFactorHover?.(
        selectedFactor?.feature ??
        null
      );
    } else {
      onFactorHover?.(null);
    }
  };


  /* =======================================================
     Click / tap handler
  ======================================================= */

  const handleClick = (
    _,
    index
  ) => {
    if (
      selectedIndex === index
    ) {
      setSelectedIndex(null);

      /*
       * Keep current hover if the
       * mouse is still over the pie.
       */
      if (
        activeIndex !== null
      ) {
        onFactorHover?.(
          chartData[
            activeIndex
          ]?.feature ?? null
        );
      } else {
        onFactorHover?.(null);
      }

      return;
    }


    setSelectedIndex(index);

    onFactorHover?.(
      chartData[index]
        ?.feature ?? null
    );
  };


  /* =======================================================
     Render
  ======================================================= */

  return (
    <div className="risk-chart-container">

      <div className="risk-donut-section">


        {/* =================================================
            Assessment type
        ================================================== */}

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


        {/* =================================================
            Help / selected-factor text
        ================================================== */}

        <div className="risk-chart-hint">

          {highlightedFactor
            ? highlightedFactor.name

            : isHypotheticalActive
            ? "Hover or tap a factor to explore its what-if contribution."

            : "Hover or tap a factor to see its contribution."}

        </div>


        {/* =================================================
            Donut
        ================================================== */}

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


                /*
                 * Recharts Sector handles the
                 * expanded segment safely.
                 *
                 * This also preserves the earlier
                 * fix for large slices becoming
                 * football-shaped.
                 */
                activeShape={(
                  props
                ) => (

                  <Sector
                    {...props}

                    outerRadius={
                      props.outerRadius +
                      7
                    }

                    stroke="#ffffff"

                    strokeWidth={3}

                    style={{
                      filter:
                        "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.16))",
                    }}
                  />

                )}


                onMouseEnter={
                  handleMouseEnter
                }

                onMouseLeave={
                  handleMouseLeave
                }

                onClick={
                  handleClick
                }
              >

                {chartData.map(
                  (
                    entry,
                    index
                  ) => {

                    const isHighlighted =
                      highlightedIndex ===
                      index;


                    const nothingHighlighted =
                      highlightedIndex ===
                      null;


                    return (

                      <Cell
                        key={`cell-${
                          entry.feature ??
                          entry.name
                        }`}

                        fill={
                          getRiskFactorColor(
                            entry.name,
                            index
                          )
                        }


                        /*
                         * Normal:
                         * slightly dull.
                         *
                         * Hover:
                         * selected factor bright,
                         * others faded.
                         */
                        opacity={
                          nothingHighlighted
                            ? 0.62
                            : isHighlighted
                            ? 1
                            : 0.20
                        }

                        style={{
                          cursor:
                            "pointer",

                          transition:
                            "opacity 0.18s ease",
                        }}
                      />

                    );
                  }
                )}

              </Pie>


              {/* =================================================
                  Tooltip
              ================================================== */}

              <Tooltip
                content={
                  <RiskFactorTooltip />
                }

                wrapperStyle={{
                  zIndex: 50,

                  pointerEvents:
                    "none",
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


        {/* =================================================
            Selected / hovered factor details
        ================================================== */}

        {highlightedFactor && (

          <div className="risk-chart-selected-factor">

            <div
              className="risk-chart-selected-factor-title"

              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.55rem",
              }}
            >

              {/* Stronger colour swatch */}

              <span
                style={{
                  width: "14px",
                  height: "14px",
                  minWidth: "14px",

                  borderRadius:
                    "4px",

                  backgroundColor:
                    getRiskFactorColor(
                      highlightedFactor.name,
                      highlightedIndex
                    ),

                  boxShadow:
                    "0 0 0 2px #ffffff, 0 0 0 3px rgba(15, 23, 42, 0.12)",
                }}
              />

              {highlightedFactor.name}

            </div>


            <div className="risk-chart-selected-factor-row">

              <span>
                Contribution
              </span>

              <strong>
                {Number(
                  highlightedFactor.value
                ).toFixed(2)}
                %
              </strong>

            </div>


            {typeof highlightedFactor.raisesRisk ===
              "boolean" && (

              <div className="risk-chart-selected-factor-row">

                <span>
                  Impact
                </span>

                <strong
                  className={
                    highlightedFactor.raisesRisk
                      ? "risk-tooltip-positive"
                      : "risk-tooltip-negative"
                  }
                >

                  {highlightedFactor.raisesRisk
                    ? "Raises risk"
                    : "Lowers risk"}

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