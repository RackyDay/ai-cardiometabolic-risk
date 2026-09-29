import { useId } from "react";

function RiskFactorEducationCard({ factor }) {
  // A factor can appear in more than one section without duplicate DOM IDs.
  const titleId = useId();

  return (
    <article className="learn-factor-card" aria-labelledby={titleId}>
      <h4 id={titleId} className="learn-factor-title">{factor.title}</h4>
      <p className="learn-factor-description">{factor.description}</p>
    </article>
  );
}

export default RiskFactorEducationCard;
