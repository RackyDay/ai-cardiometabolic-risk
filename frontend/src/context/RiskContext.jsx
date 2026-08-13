import { createContext, useState } from "react";
import { createInitalRiskInputs } from "../schemas/createInitialRiskInputs";
import { riskInputSchema } from "../schemas/riskInputSchema";

export const RiskContext = createContext();

export function RiskProvider({ children }) {
  const [riskInputs, setRiskInputs] = useState(
    createInitalRiskInputs(riskInputSchema)
  );

  const [riskScore, setRiskScore] = useState(null);
  // Top contributing features for the current riskScore, as returned by
  // POST /predict's top_contributors (see backend/risk_model.py).
  const [topContributors, setTopContributors] = useState([]);

  return (
    <RiskContext.Provider
      value={{
        riskInputs,
        setRiskInputs,
        riskScore,
        setRiskScore,
        topContributors,
        setTopContributors,
      }}
    >
      {children}
    </RiskContext.Provider>
  );
}
