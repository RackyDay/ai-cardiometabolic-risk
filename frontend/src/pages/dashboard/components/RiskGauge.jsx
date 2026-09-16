import "./RiskGauge.css";
import { RISK_LEVELS, getRiskLevel } from "./riskLevels";

function RiskGauge({ score }) {
  const numericScore = Number(score) || 0;
  const clampedScore = Math.max(0, Math.min(100, numericScore));
  const currentLevel = getRiskLevel(clampedScore);

  return (
    <div className="gauge-wrapper">
      <div className="risk-score-summary">
        <span className="risk-score-value">
          {clampedScore.toFixed(1)}%
        </span>

        <span
          className="risk-level-label"
          style={{ color: currentLevel.color }}
        >
          {currentLevel.label}
        </span>
      </div>

      <div className="risk-bar-wrapper">
        <div className="risk-bar-track">
          {RISK_LEVELS.map((level, index) => (
            <div
              key={level.key}
              className={`risk-bar-segment ${
                index === 0 ? "risk-bar-segment-first" : ""
              } ${
                index === RISK_LEVELS.length - 1
                  ? "risk-bar-segment-last"
                  : ""
              }`}
              style={{
                flex: level.max - level.min,
                backgroundColor: level.color,
              }}
              tabIndex={0}
            >
              <div className="risk-range-tooltip">
                <div className="risk-range-tooltip-title">
                  {level.label}
                </div>

                <div className="risk-range-tooltip-range">
                  {level.min}–{level.max}%
                </div>

                <div className="risk-range-tooltip-description">
                  {level.description}
                </div>
              </div>
            </div>
          ))}

          <div
            className="risk-bar-marker"
            style={{ left: `${clampedScore}%` }}
          />
        </div>

        <div className="risk-bar-scale">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}

export default RiskGauge;