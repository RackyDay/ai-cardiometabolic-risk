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

  return [...riskFactors].sort((a, b) =>
    (factorOrder.get(a.feature) ?? Infinity) -
      (factorOrder.get(b.feature) ?? Infinity) ||
    a.feature.localeCompare(b.feature)
  ).map((factor) => ({
    feature: factor.feature,
    name: factor.label,
    value: totalRaisingWeight > 0
      ? (raisingWeight(factor) / totalRaisingWeight) * 100
      : 0,
    raisesRisk: factor.raisesRisk,
  }));
}
