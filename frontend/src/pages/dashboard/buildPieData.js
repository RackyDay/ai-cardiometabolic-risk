export function buildPieData(riskFactors, referenceFactors = riskFactors) {
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

  // `value` is left as the factor's own weightPercent (share of ALL
  // contributions, matching the number shown in the breakdown list) rather
  // than being renormalized to sum to 100 across just this pie's slices.
  // Recharts computes each slice's angle from value / sum-of-all-values in
  // the dataset regardless, so the pie's geometry comes out identical
  // either way - but the label/tooltip/center text (which read this same
  // `value`) now match the list instead of showing a second, different
  // percentage for the same factor.
  return [...riskFactors].sort((a, b) =>
    (factorOrder.get(a.feature) ?? Infinity) -
      (factorOrder.get(b.feature) ?? Infinity) ||
    a.feature.localeCompare(b.feature)
  ).map((factor) => ({
    feature: factor.feature,
    name: factor.label,
    value: totalRaisingWeight > 0 ? raisingWeight(factor) : 0,
    raisesRisk: factor.raisesRisk,
  }));
}
