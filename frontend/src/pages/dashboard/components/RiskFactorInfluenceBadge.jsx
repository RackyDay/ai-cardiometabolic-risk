function formatInfluence(factor) {
  const percent = Number(factor.weightPercent.toFixed(1));
  return percent === 0 ? "0%" : `${factor.raisesRisk ? "+" : "-"}${percent}%`;
}

export default function RiskFactorInfluenceBadge({
  originalFactor,
  hypotheticalFactor,
  isHypotheticalActive,
  isCalculating,
  error,
}) {
  const factor = isHypotheticalActive ? hypotheticalFactor : originalFactor;
  const pending = isHypotheticalActive && isCalculating;
  const unavailable = isHypotheticalActive && (error || !factor);
  const text = pending ? "…" : unavailable ? "—" : formatInfluence(factor);
  const tone = pending || unavailable || Number(factor.weightPercent.toFixed(1)) === 0
    ? "neutral" : factor.raisesRisk ? "up" : "down";
  const title = pending
    ? "Updating contribution for your latest slider values…"
    : unavailable
    ? error || "This factor is outside the returned top contributors for this scenario; its percentage is unavailable."
    : `${isHypotheticalActive ? "What-if" : "Original"} influence: ${text}. ${isHypotheticalActive ? `Original: ${formatInfluence(originalFactor)}. ` : ""}Share of total influence across the returned factors, not a change in your risk score.`;

  return (
    <span
      className={`risk-factor-tag risk-factor-tag-${tone}`}
      title={title}
      aria-label={`${originalFactor.label}: ${title}`}
      aria-busy={pending}
    >
      {text}
    </span>
  );
}
