import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { RiskContext } from "../../../context/RiskContext";
import { getRiskCalculation } from "../../../services/api";
import StressResult from "./StressResult";

export default function DashboardStress() {
  const { isAuthenticated, accessToken } = useContext(AuthContext);
  const { selectedCalculation, riskCalculationId, stressScore } = useContext(RiskContext);
  const id = selectedCalculation?.riskcalc_id ?? riskCalculationId;
  const key = `${accessToken}:${id}`;
  const [response, setResponse] = useState(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!isAuthenticated || !id) return;
    let cancelled = false;
    getRiskCalculation(accessToken, id).then((result) => {
      if (!cancelled) setResponse({ key, score: result.context_JSON?.stress?.score ?? null });
    }).catch(() => {
      if (!cancelled) setResponse({ key, error: true });
    });
    return () => { cancelled = true; };
  }, [isAuthenticated, accessToken, id, key, retry]);
  if (isAuthenticated && (!id || response?.key !== key)) return <p role="status">Loading stress results…</p>;
  if (isAuthenticated && response?.error) return <div role="alert">Couldn't load stress results. <button onClick={() => setRetry(retry + 1)}>Try again</button></div>;
  const score = isAuthenticated ? response.score : stressScore;
  return <>
    {score != null ? <StressResult score={score} /> : <p>{selectedCalculation
      ? "Stress was not calculated for this assessment."
      : "Complete the optional Stress Levels module to see your result."}</p>}
    {!selectedCalculation && <Link className="assessment-start" style={{ marginTop: "1rem" }}
      to={`/stress?from=dashboard${isAuthenticated ? `&calculation=${encodeURIComponent(id)}` : ""}`}>
      {score != null ? "Edit stress module" : "Complete stress module"}
    </Link>}
  </>;
}
