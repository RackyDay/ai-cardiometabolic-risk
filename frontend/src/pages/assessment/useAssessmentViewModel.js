import { useContext, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { RiskContext } from "../../context/RiskContext";
import { riskInputSchema } from "../../schemas/riskInputSchema";
import { predictRisk } from "../../services/api";
import { buildPredictionPayload } from "../input/riskInputTransform";
import { assessmentModules } from "./assessmentModules";

export function useAssessmentViewModel() {
  const risk = useContext(RiskContext);
  const { accessToken } = useContext(AuthContext);
  const navigate = useNavigate();
  const inFlight = useRef(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState("");
  const canCalculate = assessmentModules.filter((module) => module.required)
    .every(({ id, getInputs }) => risk.isModuleComplete(id, getInputs(risk)));

  const calculateRisk = async () => {
    if (!canCalculate || inFlight.current) return;
    inFlight.current = true;
    setIsCalculating(true);
    setCalculationError("");
    try {
      const payload = buildPredictionPayload(risk.riskInputs, riskInputSchema);
      if (accessToken && risk.isModuleComplete("stress", risk.stressInputs)) {
        payload.stress = { answers: { ...risk.stressInputs } };
      }
      const result = await predictRisk(payload, accessToken);
      risk.setRiskScore(result.risk_score);
      risk.selectCalculation(null);
      risk.setTopContributors(result.top_contributors);
      risk.setRiskCalculationId(result.riskcalc_id ?? null);
      navigate("/dashboard");
    } catch {
      setCalculationError("We couldn't calculate your risk score. Please try again.");
    } finally {
      inFlight.current = false;
      setIsCalculating(false);
    }
  };

  return { canCalculate, isCalculating, calculationError, calculateRisk };
}
