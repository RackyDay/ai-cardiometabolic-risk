import { createContext, useState } from "react";

export const RiskContext = createContext();

export function RiskProvider({children}) {
    const [riskInputs, setRiskInputs] = useState({
        age: "",
        smoker: false
    });
    const [riskScore, setRiskScore] = useState(null);

    return(
        <RiskContext.Provider value={{
            riskInputs,
            setRiskInputs,
            riskScore,
            setRiskScore
        }}>
            {children}
        </RiskContext.Provider>
    );

}