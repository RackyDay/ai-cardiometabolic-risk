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

/*
 * Custom tooltip shown when the user hovers
 * over a section of the pie chart.
 */
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


function RiskFactorPieChart({ data }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <p className="risk-factors-empty">
        Submit your health information to see your risk factors.
      </p>
    );
  }

  /*
   * If a factor is selected, keep it highlighted.
   * Otherwise only the currently hovered factor
   * is highlighted.
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
              cy="50%"

              innerRadius={88}
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
                      M ${cx + outerRadius * Math.cos(-startAngle * Math.PI / 180)}
                        ${cy + outerRadius * Math.sin(-startAngle * Math.PI / 180)}

                      A ${outerRadius} ${outerRadius}
                        0 0 0
                        ${cx + outerRadius * Math.cos(-endAngle * Math.PI / 180)}
                        ${cy + outerRadius * Math.sin(-endAngle * Math.PI / 180)}

                      L ${cx + innerRadius * Math.cos(-endAngle * Math.PI / 180)}
                        ${cy + innerRadius * Math.sin(-endAngle * Math.PI / 180)}

                      A ${innerRadius} ${innerRadius}
                        0 0 1
                        ${cx + innerRadius * Math.cos(-startAngle * Math.PI / 180)}
                        ${cy + innerRadius * Math.sin(-startAngle * Math.PI / 180)}

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

            <Tooltip
              content={<RiskFactorTooltip />}
              cursor={false}
            />

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


        {data.map((factor, index) => {

          const isHighlighted =
            highlightedIndex === index;

          const contribution =
            Number(factor.value);

          return (
            <button
              key={factor.name}
              type="button"
              className={`risk-factor-breakdown-row ${
                isHighlighted
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

              <span className="risk-factor-name">

                <span
                  className="risk-factor-color"
                  style={{
                    backgroundColor:
                      COLORS[
                        index % COLORS.length
                      ],
                  }}
                />

                <span title={factor.name}>
                  {factor.name}
                </span>

              </span>


              <span className="risk-factor-percentage">

                {Number.isFinite(contribution)
                  ? `${contribution.toFixed(2)}%`
                  : "N/A"}

              </span>

            </button>
          );
        })}

      </div>

    </div>
  );
}

export default RiskFactorPieChart;