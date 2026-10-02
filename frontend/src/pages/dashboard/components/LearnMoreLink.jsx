import { Link } from "react-router-dom";
import { getLearnRiskFactor } from "../../learn/learnRiskFactors";

function LearnMoreLink({ feature }) {
  const factor = getLearnRiskFactor(feature);
  if (!factor) return null;
  const query = new URLSearchParams({ factor: factor.schemaKey });

  return (
    <div className="risk-factor-education-action">
      <Link
        className="risk-factor-learn-more"
        to={`/learn?${query}`}
        aria-label={`Learn more about ${factor.title}`}
      >
        Learn more
      </Link>
    </div>
  );
}

export default LearnMoreLink;
