import { useContext } from "react";
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

      <section className="assessment-modules" aria-label="Assessment modules">
        {assessmentModules.map(({ id, Icon, getInputs, ...module }) => (
          <AssessmentModuleCard
            key={id}
            {...module}
            icon={<Icon />}
            complete={risk.isModuleComplete(id, getInputs(risk))}
          />
        ))}
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
