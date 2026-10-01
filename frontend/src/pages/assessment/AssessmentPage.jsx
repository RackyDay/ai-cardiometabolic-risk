import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

import AssessmentModuleCard from "../../components/common/AssessmentModuleCard";
import { RiskContext } from "../../context/RiskContext";
import { assessmentModules } from "./assessmentModules";
import { useAssessmentViewModel } from "./useAssessmentViewModel";
import "./AssessmentPage.css";

function AssessmentPage() {
  const { isAuthenticated } = useContext(AuthContext);
  const risk = useContext(RiskContext);
  const moduleCount = assessmentModules.length;
  const [carousel, setCarousel] = useState({ index: moduleCount, moving: false });
  const moveModule = (direction) => setCarousel((current) => current.moving
    ? current : { index: current.index + direction, moving: true });
  // Recenter on an identical copy after each slide, keeping both neighbors
  // visible at the wrap boundary without animating backwards across the track.
  useEffect(() => {
    if (!carousel.moving) return;
    const timer = setTimeout(() => setCarousel((current) => ({
      index: moduleCount + current.index % moduleCount, moving: false,
    })), 450);
    return () => clearTimeout(timer);
  }, [carousel.moving, moduleCount]);
  const { canCalculate, isCalculating, calculationError, calculateRisk } = useAssessmentViewModel();

  return (
    <div className="assessment-page">
      <Link className="assessment-back" to={isAuthenticated ? "/dashboard" : "/"}>
        &lsaquo; {isAuthenticated ? "Back to dashboard" : "Back to home"}
      </Link>

      <header className="assessment-header">
        <h1>Start your risk assessment</h1>
        <p>A clearer picture of your heart health starts here. Select a module to begin.</p>
      </header>

      <section className="assessment-modules" aria-label="Assessment modules" aria-roledescription="carousel">
        <button type="button" className="assessment-carousel-arrow" aria-label="Previous module"
          onClick={() => moveModule(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <path d="m15 6-6 6 6 6" />
          </svg>
        </button>
        <div className="assessment-carousel-viewport">
        <div className="assessment-carousel-track" data-moving={carousel.moving} style={{
          transform: `translateX(calc(-${carousel.index * 100}% - ${carousel.index} * var(--carousel-gap)))`,
          transition: carousel.moving ? undefined : "none",
        }}>
        {[...assessmentModules, ...assessmentModules, ...assessmentModules].map(({ id, Icon, getInputs, ...module }, index) => (
          <div key={`${id}-${index}`} className="assessment-carousel-slide" inert={index !== carousel.index}
            aria-hidden={index !== carousel.index}>
          <AssessmentModuleCard
            {...module}
            icon={<Icon />}
            complete={risk.isModuleComplete(id, getInputs(risk))}
          />
          </div>
        ))}
        </div>
        </div>
        <button type="button" className="assessment-carousel-arrow" aria-label="Next module"
          onClick={() => moveModule(1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      </section>
      <div className="assessment-actions">
        {calculationError && <p role="alert">{calculationError}</p>}
        <div
          className="assessment-calculate-help"
          tabIndex={!canCalculate ? 0 : undefined}
          aria-label={!canCalculate ? "Calculate risk score unavailable" : undefined}
          aria-describedby={!canCalculate ? "assessment-calculate-tooltip" : undefined}
        >
        <button
          type="button"
          className="assessment-calculate"
          onClick={calculateRisk}
          disabled={!canCalculate || isCalculating}
        >
          {isCalculating ? "Calculating..." : "Calculate risk score"}
          <span aria-hidden="true">&rarr;</span>
        </button>
        {!canCalculate && (
          <span id="assessment-calculate-tooltip" role="tooltip" className="assessment-calculate-tooltip">
            Save inputs for each required module to calculate your risk score.
          </span>
        )}
        </div>
      </div>
    </div>
  );
}

export default AssessmentPage;
