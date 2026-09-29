import { useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import { RiskContext } from "./RiskContext";
import { createInitalRiskInputs } from "../schemas/createInitialRiskInputs";
import { riskInputSchema } from "../schemas/riskInputSchema";

export function RiskProvider({ children }) {
  const { user, isAuthenticated } = useContext(AuthContext);
  const [historySelection, setHistorySelection] = useState(null);
  const [historyRevision, setHistoryRevision] = useState(0);
  const [historyActivity, setHistoryActivity] = useState("");
  const [viewingCalculationId, setViewingCalculationId] = useState(null);
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
  const userId = isAuthenticated ? user?.id : null;
  const [moduleCompletion, setModuleCompletion] = useState({});
  const startNewAssessment = () => setModuleCompletion({});
  const completeModule = (id, inputs) => {
    setModuleCompletion((current) => ({
      ...current,
      [id]: { userId, inputs: { ...inputs } },
    }));
  };
  const isModuleComplete = (id, inputs) => {
    const completed = moduleCompletion[id];
    return Boolean(completed && completed.userId === userId &&
      Object.keys(completed.inputs).length === Object.keys(inputs).length &&
      Object.entries(inputs).every(([key, value]) => completed.inputs[key] === value));
  };
  // Clear ownership on sign-out/account changes; token refresh keeps selection.
  useEffect(() => {
    setHistorySelection((current) => current?.userId === userId ? current : null);
    setViewingCalculationId(null);
    setModuleCompletion({});
  }, [userId]);
  const selectedCalculation = userId && historySelection?.userId === userId
    ? historySelection.calculation : null;
  const selectCalculation = (calculation) => {
    setHistorySelection(calculation && userId ? { userId, calculation } : null);
  };
  const [riskInputs, setRiskInputs] = useState(
    createInitalRiskInputs(riskInputSchema)
  );

  // The riskcalc_id behind riskInputs/riskScore/topContributors (when
  // there is one - it's null for an anonymous session, since nothing gets
  // persisted). Lets "Edit original assessment" update that exact saved
  // row instead of always inserting a new one.
  const [riskCalculationId, setRiskCalculationId] = useState(null);

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
        startNewAssessment,
        completeModule,
        isModuleComplete,
        selectedCalculation,
        historyRevision,
        viewingCalculationId,
        setViewingCalculationId,
        historyActivity,
        setHistoryActivity,
        calculationDeleted,
        selectCalculation,
        riskInputs,
        setRiskInputs,
        riskCalculationId,
        setRiskCalculationId,
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
