import { useContext } from "react";
import { RiskContext } from "./RiskContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import "../styles/dashboard.css";

// --- Hardcoded data (replace with real data later) ---
const TOP_RISK_FACTORS = [
  "Number of cigarettes smoked",
  "Glucose Level",
  "Systolic Blood Pressure",
];

const INSIGHTS = [
  "Overall Risk Score has decreased by 4%",
  "BMI result is now closer to the ideal value",
];

const TREND_DATA = [
  { year: 1, risk: 35 },
  { year: 2, risk: 92 },
  { year: 3, risk: 80 },
  { year: 4, risk: 95 },
  { year: 5, risk: 40 },
  { year: 6, risk: 78 },
  { year: 7, risk: 60 },
  { year: 8, risk: 8 },
  { year: 9, risk: 42 },
  { year: 10, risk: 68 },
];

// --- Circular Risk Gauge ---
function RiskGauge({ score }) {
  const radius = 70;
  const stroke = 10;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const progress = (score / 100) * circumference;

  return (
    <div className="gauge-wrapper">
      <svg width={radius * 2} height={radius * 2} className="gauge-svg">
        <circle
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={stroke}
        />
        <circle
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          fill="none"
          stroke="#f97316"
          strokeWidth={stroke}
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
        />
        <text
          x={radius}
          y={radius}
          textAnchor="middle"
          dominantBaseline="central"
          className="gauge-text"
        >
          {score}%
        </text>
      </svg>

      <div className="simulate-dropdown">
        <span>Simulate how different factors affect this score</span>
        <span className="dropdown-arrow">▾</span>
      </div>
    </div>
  );
}

// --- Main Dashboard Component ---
function DashboardPage() {
  const { riskScore } = useContext(RiskContext);
  const displayScore = riskScore ?? 50;

  return (
    <div className="dashboard-page">
      {/* Top row: Risk Score + Insights */}
      <div className="top-row">
        {/* Risk Score Card */}
        <div className="card risk-score-card">
          <h2 className="card-title">Risk Score</h2>
          <div className="gauge-center">
            <RiskGauge score={displayScore} />
          </div>
        </div>

        {/* Insights Card */}
        <div className="card insights-card">
          <h2 className="card-title">Insights</h2>

          <p className="insight-subheading">Since the last assessment:</p>
          <div className="insight-list">
            {INSIGHTS.map((text, i) => (
              <div key={i} className="insight-item insight-green">
                {text}
              </div>
            ))}
          </div>

          <p className="insight-subheading stress-heading">Stress</p>
          <div className="insight-item insight-red">
            Your data shows traits that are usually associated with stress. This
            could suggest that you may be experiencing high stress.
          </div>
        </div>
      </div>

      {/* Risk Factors Card */}
      <div className="card risk-factors-card">
        <h2 className="card-title">Top 3 Risk Factors</h2>
        <div className="risk-factor-list">
          {TOP_RISK_FACTORS.map((factor, i) => (
            <div key={i} className="risk-factor-row">
              <span className="risk-factor-number">{i + 1}.</span>
              <span className="risk-factor-label">{factor}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trend Chart Card */}
      <div className="card trend-card">
        <h2 className="card-title">10-year Cardiovascular Health Trend</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart
            data={TREND_DATA}
            margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={true} />
            <XAxis
              dataKey="year"
              label={{ value: "Year", position: "insideBottom", offset: -4, fontSize: 13, fill: "#6b7280" }}
              tick={{ fontSize: 12, fill: "#6b7280" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              label={{ value: "Risk score", angle: -90, position: "insideLeft", offset: 10, fontSize: 13, fill: "#6b7280" }}
              tick={{ fontSize: 12, fill: "#6b7280" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
              formatter={(value) => [`${value}`, "Risk Score"]}
              labelFormatter={(label) => `Year ${label}`}
            />
            <Line
              type="monotone"
              dataKey="risk"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default DashboardPage;