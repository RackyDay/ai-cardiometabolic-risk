export function buildPieData(
  riskFactors,
  {
    riskScore = null,
    referenceFactors = riskFactors,
    isFixedFactor = () => false,
  } = {}
) {
  // A risk-lowering effect must not occupy a risk-raising slice.
  // Keep zero-size entries so changing sign does not reorder the other factors.
  const raisingWeight = (factor) =>
    factor.raisesRisk && Number.isFinite(factor.weightPercent)
      ? Math.max(0, factor.weightPercent)
      : 0;
  const totalRaisingWeight = riskFactors.reduce(
    (sum, factor) => sum + raisingWeight(factor), 0
  );
  const factorOrder = new Map(
    referenceFactors.map((factor, index) => [factor.feature, index])
  );

  // When a risk score is supplied, every raising factor's weightPercent
  // share (of the total raising weight) is rescaled so the slices add up
  // to that score instead of to the raw sum of weightPercents - this is
  // what lets the pie/tooltip read as a literal breakdown of the score
  // rather than a relative-influence ranking. With no score (e.g. the
  // existing unit tests), the scale is 1 and `value` stays each factor's
  // own weightPercent, matching the number shown in the breakdown list.
  const scale =
    riskScore != null && totalRaisingWeight > 0
      ? riskScore / totalRaisingWeight
      : 1;

  return [...riskFactors].sort((a, b) =>
    (factorOrder.get(a.feature) ?? Infinity) -
      (factorOrder.get(b.feature) ?? Infinity) ||
    a.feature.localeCompare(b.feature)
  ).map((factor) => ({
    feature: factor.feature,
    name: factor.label,
    value: totalRaisingWeight > 0 ? raisingWeight(factor) * scale : 0,
    raisesRisk: factor.raisesRisk,
    fixed: Boolean(isFixedFactor(factor.feature)),
    // The total every slice's value adds up to, carried on each entry so
    // the tooltip can show "this slice's share of that total" without
    // needing a separate prop path through Recharts.
    total: riskScore ?? totalRaisingWeight,
  }));
}
