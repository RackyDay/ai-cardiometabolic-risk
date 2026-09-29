function RiskFactorEducationCard({ factor }) {
  const titleId = `learn-factor-${factor.schemaKey}`;

  return (
    <article className="learn-factor-card" aria-labelledby={titleId}>
      <h4 id={titleId} className="learn-factor-title">{factor.title}</h4>
      <p className="learn-factor-description">{factor.description}</p>
    </article>
  );
}

export default RiskFactorEducationCard;
