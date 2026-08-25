import { useEffect, useRef,useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
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
};

function getRiskFactorDescription(name) {
  if (RISK_FACTOR_DESCRIPTIONS[name]) {
    return RISK_FACTOR_DESCRIPTIONS[name];
  }

  return "This factor is included by the risk model because it can provide information relevant to cardiovascular risk.";
}


/* =========================================
   Pie Chart Tooltip
========================================= */

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


/* =========================================
   Active Pie Slice
========================================= */

function renderActiveShape(props) {
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
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius + 8}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      stroke="#ffffff"
      strokeWidth={3}
      style={{
        filter:
          "drop-shadow(0 5px 8px rgba(15, 23, 42, 0.18))",
      }}
    />
  );
}


/* =========================================
   Main Component
========================================= */

function RiskFactorPieChart({ data }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const selectedRowRef = useRef(null);
  const breakdownRef = useRef(null);

  if (!data || data.length === 0) {
    return (
      <p className="risk-factors-empty">
        Submit your health information to see your risk factors.
      </p>
    );
  }
  useEffect(() => {
  if (
    selectedIndex === null ||
    !selectedRowRef.current ||
    !breakdownRef.current
  ) {
    return;
  }

  const container = breakdownRef.current;
  const selectedRow = selectedRowRef.current;

  const targetScrollTop =
    selectedRow.offsetTop -
    container.offsetTop -
    container.clientHeight / 2 +
    selectedRow.clientHeight / 2;

  container.scrollTo({
    top: Math.max(0, targetScrollTop),
    behavior: "smooth",
  });
}, [selectedIndex]);


  /*
   * A clicked factor remains highlighted.
   * Otherwise the currently hovered factor is highlighted.
   */
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

  const handleFactorClick = (index) => {
    setSelectedIndex((current) =>
      current === index ? null : index
    );
  };

  return (
    <div className="risk-chart-container">

      {/* =========================================
          Donut Chart
      ========================================= */}

      <div className="risk-donut-wrapper">

        <ResponsiveContainer
          width="100%"
          height={380}
        >
          <PieChart>

            <Pie
              data={data}
              dataKey="value"
              nameKey="name"

              cx="50%"
              cy="48%"

              innerRadius={88}
              outerRadius={145}

              paddingAngle={2}

              stroke="#ffffff"
              strokeWidth={2}

              activeIndex={
                highlightedIndex ?? undefined
              }

              activeShape={renderActiveShape}

              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}

              onClick={(_, index) =>
                handleFactorClick(index)
              }
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${entry.name}`}
                  fill={COLORS[index % COLORS.length]}
                  opacity={
                    highlightedIndex === null ||
                    highlightedIndex === index
                      ? 1
                      : 0.45
                  }
                />
              ))}
            </Pie>


            {/* =====================================
                Small Interactive Tooltip
            ===================================== */}

            <Tooltip
              content={<RiskFactorTooltip />}
              cursor={false}
              offset={12}
            />


            {/* =====================================
                Centre Information
            ===================================== */}

            <text
              x="50%"
              y="45%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="risk-donut-center-label"
            >
              Total contribution
            </text>

            <text
              x="50%"
              y="54%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="risk-donut-center-value"
            >
              100%
            </text>

          </PieChart>
        </ResponsiveContainer>

      </div>


      {/* =========================================
          Interactive Factor Breakdown
      ========================================= */}

      <div className="risk-factor-breakdown">
        <div className="risk-factor-breakdown-header">
          <span>Risk factor</span>
          <span>Contribution</span>
        </div>

        {data.map((entry, index) => {

          const isActive =
            activeIndex === index;

          const isSelected =
            selectedIndex === index;

          return (
            <button
              key={entry.name}
              ref={isSelected ? selectedRowRef : null}
              type="button"
              className={`risk-factor-breakdown-row ${
                isActive || isSelected
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
                handleFactorClick(index)
              }
            >

              <div className="risk-factor-row-content">

                <div className="risk-factor-name">

                  <span
                    className="risk-factor-color"
                    style={{
                      backgroundColor:
                        COLORS[index % COLORS.length],
                    }}
                  />

                  <span title={entry.name}>
                    {entry.name}
                  </span>

                </div>


                {/* =================================
                    Why It Matters
                ================================= */}

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
                {Number(entry.value).toFixed(2)}%
              </span>

            </button>
          );
        })}

      </div>

    </div>
  );
}

export default RiskFactorPieChart;