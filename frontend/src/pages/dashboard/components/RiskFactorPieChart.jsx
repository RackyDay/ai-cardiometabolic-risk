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

function RiskFactorPieChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <p className="risk-factors-empty">
        Submit your health information to see your risk factors.
      </p>
    );
  }

  return (
    <div className="risk-chart-container">
      <div className="risk-donut-wrapper">
        <ResponsiveContainer width="100%" height={380}>
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
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${entry.name}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>

            <Tooltip
              formatter={(value) => [
                `${Number(value).toFixed(2)}%`,
                "Contribution",
              ]}
              contentStyle={{
                borderRadius: "10px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                fontSize: "13px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="risk-donut-center">
          <span className="risk-donut-total-label">
            Total contribution
          </span>

          <span className="risk-donut-total">
            100%
          </span>
        </div>
      </div>

      <div className="risk-factor-breakdown">
        <div className="risk-factor-breakdown-header">
          <span>Risk factor</span>
          <span>Contribution</span>
        </div>

        {data.map((factor, index) => (
          <div
            key={factor.name}
            className="risk-factor-breakdown-row"
          >
            <div className="risk-factor-name">
              <span
                className="risk-factor-color"
                style={{
                  backgroundColor:
                    COLORS[index % COLORS.length],
                }}
              />

              <span title={factor.name}>
                {factor.name}
              </span>
            </div>

            <span className="risk-factor-percentage">
              {Number(factor.value).toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RiskFactorPieChart;