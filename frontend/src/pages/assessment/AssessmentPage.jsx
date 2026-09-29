import { useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

import AssessmentModuleCard from "../../components/common/AssessmentModuleCard";
import { RiskContext } from "../../context/RiskContext";
import { assessmentModules } from "./assessmentModules";
import "./AssessmentPage.css";

function AssessmentPage() {
  const { isAuthenticated } = useContext(AuthContext);
  const risk = useContext(RiskContext);

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
    </div>
  );
}

export default AssessmentPage;
