import "./RiskGauge.css";
import { RISK_LEVELS, getRiskLevel } from "./riskLevels";


function RiskGauge({ score }) {
  const radius = 70;
  const stroke = 10;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const progress = (score / 100) * circumference;
  const clampedScore = Math.max(0, Math.min(100, score));
  const currentLevel = getRiskLevel(clampedScore);

  return (
    <div className="gauge-wrapper">
      <svg width={radius * 2} height={radius * 2} className="gauge-svg">
        {RISK_LEVELS.map((level) => {
          const segLen = ((level.max - level.min) / 100) * circumference;
          const offset = circumference - (level.min / 100) * circumference;
          return (
            <circle
              key={level.key}
              cx={radius}
              cy={radius}
              r={normalizedRadius}
              fill="none"
              stroke={level.color}
              strokeOpacity={0.25}
              strokeWidth={stroke}
              strokeDasharray={`${segLen} ${circumference}`}
              strokeDashoffset={offset}
            />
          );
        })}
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
          stroke={currentLevel.color}
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
      <div className="risk-level-label" style={{ color: currentLevel.color }}>
        {currentLevel.label}
      </div>

      <div className="simulate-dropdown">
        <span>Simulate how different factors affect this score</span>
        <span className="dropdown-arrow">▾</span>
      </div>
      <div className="risk-legend">
        {RISK_LEVELS.map((level) => (
          <div key={level.key} className="risk-legend-row">
            <span className="risk-legend-swatch" style={{ backgroundColor: level.color }} />
            <div className="risk-legend-text">
              <span className="risk-legend-label">
                {level.label}{" "}
                <span className="risk-legend-range">
                  ({level.min}–{level.max === 100 ? "20+" : level.max}%)
                </span>
              </span>
              <span className="risk-legend-desc">{level.description}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RiskGauge;