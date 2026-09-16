import { useEffect, useRef, useState } from "react";
import "./RiskGauge.css";
import { RISK_LEVELS, getRiskLevel } from "./riskLevels";

function RiskGauge({ score }) {
  const [selectedLevel, setSelectedLevel] = useState(null);
  const riskBarRef = useRef(null);
  const numericScore = Number(score) || 0;
  const clampedScore = Math.max(0, Math.min(100, numericScore));
  const currentLevel = getRiskLevel(clampedScore);

    useEffect(() => {
    const handleOutsidePress = (event) => {
      const isMobile = window.matchMedia("(max-width: 767px)").matches;

      if (
        isMobile &&
        riskBarRef.current &&
        !riskBarRef.current.contains(event.target)
      ) {
        setSelectedLevel(null);
      }
    };

    document.addEventListener("pointerdown", handleOutsidePress);

    return () => {
      document.removeEventListener("pointerdown", handleOutsidePress);
    };
  }, []);

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
        <div className="risk-bar-track" ref={riskBarRef}>
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
              onClick={() => {
                const isMobile = window.matchMedia("(max-width: 767px)").matches;

                if (!isMobile) return;

                setSelectedLevel((current) =>
                  current === level.key ? null : level.key
                );
              }}
            >
              <div
                className={`risk-range-tooltip ${
                  selectedLevel === level.key ? "open" : ""
                }`}
              >
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
          <span className="risk-scale-label risk-scale-0">0%</span>
          <span className="risk-scale-label risk-scale-10">10%</span>
          <span className="risk-scale-label risk-scale-20">20%</span>
          <span className="risk-scale-label risk-scale-50">50%</span>
          <span className="risk-scale-label risk-scale-100">100%</span>
        </div>
      </div>
    </div>
  );
}

export default RiskGauge;