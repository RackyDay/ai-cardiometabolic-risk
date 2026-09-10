export function buildRiskTrend(history, calculationId, latestTimestamp) {
  const selected = calculationId
    ? history.find((item) => item.riskcalc_id === calculationId)
    : null;
  const cutoff = Date.parse(calculationId ? selected?.riskcalc_timestamp : latestTimestamp);
  if (!Number.isFinite(cutoff)) return [];
  return history
    .map((item) => ({
      id: item.riskcalc_id,
      timestamp: Date.parse(item.riskcalc_timestamp),
      risk: item.risk_score == null ? NaN : Number(item.risk_score),
    }))
    .filter((item) => Number.isFinite(item.timestamp) && Number.isFinite(item.risk) && item.timestamp <= cutoff)
    .sort((a, b) => a.timestamp - b.timestamp);
}
