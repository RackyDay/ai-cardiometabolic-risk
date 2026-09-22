import { useEffect, useRef, useState } from "react";
import "./RiskGauge.css";
import { RISK_LEVELS, getRiskLevel, formatRiskRange } from "./riskLevels";

/* Tick marks derived from the bands themselves, so the scale always lines
   up with wherever the band boundaries currently are. */
const SCALE_TICKS = [
  ...new Set([
    ...RISK_LEVELS.map((level) => level.min),
    RISK_LEVELS[RISK_LEVELS.length - 1].max,
  ]),
].sort((a, b) => a - b);

const SCALE_DOMAIN_MAX = RISK_LEVELS[RISK_LEVELS.length - 1].max;

/* A plain linear mapping puts most people's scores (0-20%) in the first
   fifth of the bar and lets the open-ended 20-100% "High Risk" band
   swallow the rest, crushing Low/Borderline/Moderate into slivers. A
   square-root scale keeps the bar honest and continuous (unlike an
   equal-width categorical split, it still shows 25% as meaningfully
   different from 90%) while giving the low end - where most scores
   actually fall - much more visual room. */
function scalePosition(value) {
  return (Math.sqrt(value) / Math.sqrt(SCALE_DOMAIN_MAX)) * 100;
}

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
        <p className="risk-bar-hint">
          Hover or tap a section of the bar below for more detail
        </p>

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
                flex: scalePosition(level.max) - scalePosition(level.min),
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
                  {formatRiskRange(level)}
                </div>

                <div className="risk-range-tooltip-description">
                  {level.description}
                </div>
              </div>
            </div>
          ))}

          <div
            className="risk-bar-marker"
            style={{ left: `${scalePosition(clampedScore)}%` }}
          />
        </div>

        <div className="risk-bar-scale">
          {SCALE_TICKS.map((tick) => (
            <span
              key={tick}
              className="risk-scale-label"
              style={{
                left: `${scalePosition(tick)}%`,
                transform:
                  tick === 0
                    ? "none"
                    : tick === 100
                    ? "translateX(-100%)"
                    : "translateX(-50%)",
              }}
            >
              {tick}%
            </span>
          ))}
        </div>
      </div>

      <div className="risk-legend" aria-label="Risk level reference">
        {RISK_LEVELS.map((level) => {
          const isCurrent = level.key === currentLevel.key;

          return (
            <div
              key={level.key}
              className={`risk-legend-row ${
                isCurrent ? "risk-legend-row-active" : ""
              }`}
              style={isCurrent ? { backgroundColor: level.bgColor } : undefined}
            >
              <span
                className="risk-legend-swatch"
                style={{ backgroundColor: level.color }}
              />

              <div className="risk-legend-text">
                <span className="risk-legend-label">
                  {level.label}{" "}
                  <span className="risk-legend-range">
                    ({formatRiskRange(level)})
                  </span>
                  {isCurrent && (
                    <span
                      className="risk-legend-current-badge"
                      style={{ backgroundColor: level.color }}
                    >
                      Your range
                    </span>
                  )}
                </span>

                <span className="risk-legend-desc">
                  {level.shortDescription}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RiskGauge;
