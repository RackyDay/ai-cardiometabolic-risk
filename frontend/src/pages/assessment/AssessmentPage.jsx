import { useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

import HeartECGIcon from "../../components/icons/HeartECGIcon";
import "./AssessmentPage.css";

function AssessmentPage() {
  const { isAuthenticated } = useContext(AuthContext);

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
        <article className="assessment-module">
          <div className="assessment-module-body">
            <div className="assessment-module-heading">
              <div className="assessment-module-icon" aria-hidden="true">
                <HeartECGIcon />
              </div>
              <span className="assessment-module-label">Cardiovascular health</span>
            </div>
            <h2>Base risk inputs</h2>
            <p>
              Build your health profile and calculate your cardiovascular risk
              with our core assessment.
            </p>
            <ul className="assessment-module-topics" aria-label="Included in this module">
              <li>Health measurements</li>
              <li>Medical history</li>
              <li>Lifestyle</li>
            </ul>
          </div>
          <div className="assessment-module-footer">
            <p>Your results will appear on your dashboard.</p>
            <Link className="assessment-start" to="/inputs">
              Start module <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}

export default AssessmentPage;
