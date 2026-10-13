import { useEffect, useRef, useState } from "react";
import "./RiskGauge.css";
import { RISK_ZONES, getRiskZone, formatRiskRange } from "./riskLevels";
import ChevronDownIcon from "../../../components/icons/ChevronDownIcon";

const SCALE_DOMAIN_MAX = RISK_ZONES[RISK_ZONES.length - 1].max;

/* A plain linear mapping puts most people's scores (0-20%) in the first
   fifth of the bar and lets the open-ended top band swallow the rest,
   crushing Low/Borderline/Moderate into slivers. A
   square-root scale keeps the bar honest and continuous (unlike an
   equal-width categorical split, it still shows 25% as meaningfully
   different from 90%) while giving the low end - where most scores
   actually fall - much more visual room. */
function scalePosition(value) {
  return (Math.sqrt(value) / Math.sqrt(SCALE_DOMAIN_MAX)) * 100;
}

const MIN_TICK_GAP_PERCENT = 6;

/* Tick marks derived from the zones themselves, so the scale always lines
   up with wherever the boundaries currently are. The closing domain-max
   tick (100%) is dropped when a zone boundary already sits within
   MIN_TICK_GAP_PERCENT of it on the (non-linear) scale - the bar's own
   right edge already reads as "the top of the scale" without it, and at
   that spacing the two labels would otherwise overlap (e.g. 90% and 100%
   sit only ~5% of the bar's width apart once square-rooted). */
const SCALE_TICKS = (() => {
  const candidates = [
    ...new Set([
      ...RISK_ZONES.map((zone) => zone.min),
      SCALE_DOMAIN_MAX,
    ]),
  ].sort((a, b) => a - b);

  const last = candidates[candidates.length - 1];
  const secondLast = candidates[candidates.length - 2];

  if (
    secondLast !== undefined &&
    scalePosition(last) - scalePosition(secondLast) < MIN_TICK_GAP_PERCENT
  ) {
    return candidates.slice(0, -1);
  }

  return candidates;
})();

function RiskGauge({ score }) {
  const [selectedZone, setSelectedZone] = useState(null);
  // The full severity legend starts collapsed behind a toggle - the bar
  // and headline already carry the current score's own severity; the
  // full 8-row reference list is detail most visits don't need open.
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const riskBarRef = useRef(null);
  const numericScore = Number(score) || 0;
  const clampedScore = Math.max(0, Math.min(100, numericScore));
  const currentZone = getRiskZone(clampedScore);

    useEffect(() => {
    const handleOutsidePress = (event) => {
      const isMobile = window.matchMedia("(max-width: 767px)").matches;

      if (
        isMobile &&
        riskBarRef.current &&
        !riskBarRef.current.contains(event.target)
      ) {
        setSelectedZone(null);
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

        <span className="risk-level-summary">
          <span
            className="risk-level-label"
            style={{ color: currentZone.color }}
          >
            {currentZone.label}
          </span>

          {currentZone.severityTag && (
            <span className="risk-level-tag">
              {" "}– {currentZone.severityTag}
            </span>
          )}
        </span>
      </div>

      <div className="risk-bar-wrapper">
        <p className="risk-bar-hint">
          Hover or tap a section of the bar below for more detail
        </p>

        <div className="risk-bar-track" ref={riskBarRef}>
          {RISK_ZONES.map((zone, index) => (
            <div
              key={zone.key}
              className={`risk-bar-segment ${
                index === 0 ? "risk-bar-segment-first" : ""
              } ${
                index === RISK_ZONES.length - 1
                  ? "risk-bar-segment-last"
                  : ""
              }`}
              style={{
                flex: scalePosition(zone.max) - scalePosition(zone.min),
                backgroundColor: zone.color,
              }}
              onClick={() => {
                const isMobile = window.matchMedia("(max-width: 767px)").matches;

                if (!isMobile) return;

                setSelectedZone((current) =>
                  current === zone.key ? null : zone.key
                );
              }}
            >
              <div
                className={`risk-range-tooltip ${
                  selectedZone === zone.key ? "open" : ""
                }`}
              >
                <div className="risk-range-tooltip-title">
                  {zone.label}
                </div>

                <div className="risk-range-tooltip-range">
                  {formatRiskRange(zone)}
                </div>

                <div className="risk-range-tooltip-description">
                  {zone.description}
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

      <div className="risk-legend-divider">
        <button
          type="button"
          className="risk-legend-toggle"
          onClick={() => setIsLegendOpen((open) => !open)}
          aria-expanded={isLegendOpen}
          aria-controls="risk-legend-panel"
        >
          <ChevronDownIcon
            size={14}
            className={`risk-legend-toggle-icon ${
              isLegendOpen ? "risk-legend-toggle-icon-open" : ""
            }`}
          />

          <span className="risk-legend-sr-only">
            {isLegendOpen ? "Hide" : "Show"} all risk level ranges
          </span>
        </button>
      </div>

      {isLegendOpen && (

        <div
          id="risk-legend-panel"
          className="risk-legend"
          aria-label="Risk level reference"
        >
          {RISK_ZONES.map((zone) => {
            const isCurrent = zone.key === currentZone.key;

            return (
              <div
                key={zone.key}
                className={`risk-legend-row ${
                  isCurrent ? "risk-legend-row-active" : ""
                }`}
                style={isCurrent ? { backgroundColor: zone.bgColor } : undefined}
              >
                <span
                  className="risk-legend-swatch"
                  style={{ backgroundColor: zone.color }}
                />

                <div className="risk-legend-text">
                  <span className="risk-legend-label">
                    {zone.label}{" "}
                    <span className="risk-legend-range">
                      ({formatRiskRange(zone)})
                    </span>
                    {isCurrent && (
                      <span
                        className="risk-legend-current-badge"
                        style={{ backgroundColor: zone.color }}
                      >
                        Your range
                      </span>
                    )}
                  </span>

                  <span className="risk-legend-desc">
                    {zone.shortDescription}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      )}
    </div>
  );
}

export default RiskGauge;
