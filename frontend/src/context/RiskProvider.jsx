import { useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import { RiskContext } from "./RiskContext";
import { createInitalRiskInputs } from "../schemas/createInitialRiskInputs";
import { riskInputSchema } from "../schemas/riskInputSchema";

export function RiskProvider({ children }) {
  const { user, isAuthenticated } = useContext(AuthContext);
  const [historySelection, setHistorySelection] = useState(null);
  const [historyRevision, setHistoryRevision] = useState(0);
  const calculationDeleted = (id, remaining) => {
    setHistorySelection((current) => {
      if (!current) return current;
      const index = remaining.findIndex((item) => item.riskcalc_id === current.calculation.riskcalc_id);
      return index === -1 ? null : { ...current, calculation: {
        ...current.calculation, calculationNumber: remaining.length - index,
      } };
    });
    setHistoryRevision((value) => value + 1);
  };
  const [freshCalculationUserId, setFreshCalculationUserId] = useState(null);
  const userId = isAuthenticated ? user?.id : null;
  // Clear ownership on sign-out/account changes; token refresh keeps selection.
  useEffect(() => {
    setHistorySelection((current) => current?.userId === userId ? current : null);
    setFreshCalculationUserId(null);
  }, [userId]);
  const selectedCalculation = userId && historySelection?.userId === userId
    ? historySelection.calculation : null;
  const selectCalculation = (calculation) => {
    setHistorySelection(calculation && userId ? { userId, calculation } : null);
    // Clearing the selection after a successful submission displays a fresh result.
    setFreshCalculationUserId(calculation ? null : userId);
  };
  const [riskInputs, setRiskInputs] = useState(
    createInitalRiskInputs(riskInputSchema)
  );

  const [riskScore, setRiskScore] = useState(null);

  const [topContributors, setTopContributors] = useState([]);

  // --------------------------------------------------
  // Hypothetical / "What-if" assessment state
  // --------------------------------------------------

  const [hypotheticalInputs, setHypotheticalInputs] = useState(null);

  const [hypotheticalRiskScore, setHypotheticalRiskScore] = useState(null);

  const [hypotheticalTopContributors, setHypotheticalTopContributors] =
    useState([]);

  const resetHypothetical = () => {
    setHypotheticalInputs(null);
    setHypotheticalRiskScore(null);
    setHypotheticalTopContributors([]);
  };

  return (
    <RiskContext.Provider
      value={{
        // Original assessment
        selectedCalculation,
        historyRevision,
        calculationDeleted,
        hasFreshCalculation: Boolean(userId && freshCalculationUserId === userId),
        selectCalculation,
        riskInputs,
        setRiskInputs,
        riskScore,
        setRiskScore,
        topContributors,
        setTopContributors,

        // Hypothetical assessment
        hypotheticalInputs,
        setHypotheticalInputs,
        hypotheticalRiskScore,
        setHypotheticalRiskScore,
        hypotheticalTopContributors,
        setHypotheticalTopContributors,

        resetHypothetical,
      }}
    >
      {children}
    </RiskContext.Provider>
  );
}
