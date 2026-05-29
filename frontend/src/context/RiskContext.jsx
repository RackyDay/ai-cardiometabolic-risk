import { createContext, useState } from "react";
import { createInitalRiskInputs } from "../schemas/createInitialRiskInputs";\
import { riskInputSchema } from "../schemas/riskInputSchema";

export const RiskContext = createContext();

export function RiskProvider({ children }) {
  const [riskInputs, setRiskInputs] = useState(
    createInitalRiskInputs(riskInputSchema)
  );

  const [riskScore, setRiskScore] = useState(null);

  return (
    <RiskContext.Provider value={{ riskInputs, setRiskInputs, riskScore, setRiskScore }}>
      {children}
    </RiskContext.Provider>
  );
}
