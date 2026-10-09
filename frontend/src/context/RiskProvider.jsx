import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./AuthContext";
import { RiskContext } from "./RiskContext";
import { createInitalRiskInputs } from "../schemas/createInitialRiskInputs";
import { riskInputSchema } from "../schemas/riskInputSchema";
import { stressInputSchema, calculateStressScore } from "../schemas/stressInputSchema";

export function RiskProvider({ children }) {
  const { user, isAuthenticated } = useContext(AuthContext);
  const [historySelection, setHistorySelection] = useState(null);
  const [historyRevision, setHistoryRevision] = useState(0);
  const [historyActivity, setHistoryActivity] = useState("");
  const [viewingCalculationId, setViewingCalculationId] = useState(null);
  // The inputs behind riskScore/topContributors. Unlike riskInputs, this is
  // never an unfinished draft (e.g. after "Add Assessment"), so the Learn
  // page can personalise content from it. null when nothing is assessed.
  const [assessedInputs, setAssessedInputs] = useState(null);
  // useCallback (not a plain function) so these keep a stable identity
  // across renders - otherwise they'd be a new function on every render,
  // which would defeat the useMemo on the context value below (its
  // dependency array would never actually stay equal).
  const calculationDeleted = useCallback((id, remaining) => {
    setHistorySelection((current) => {
      if (!current) return current;
      const index = remaining.findIndex((item) => item.riskcalc_id === current.calculation.riskcalc_id);
      return index === -1 ? null : { ...current, calculation: {
        ...current.calculation, calculationNumber: remaining.length - index,
      } };
    });
    setHistoryRevision((value) => value + 1);
  }, []);
  const userId = isAuthenticated ? user?.id : null;
  const [moduleCompletion, setModuleCompletion] = useState({});
  const [stressInputs, setStressInputs] = useState(() => createInitalRiskInputs(stressInputSchema));
  const startNewAssessment = () => {
    setModuleCompletion({});
    setStressInputs(createInitalRiskInputs(stressInputSchema));
  };
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
    setAssessedInputs(null);
    setModuleCompletion({});
    setStressInputs(createInitalRiskInputs(stressInputSchema));
  }, [userId]);
  const selectedCalculation = userId && historySelection?.userId === userId
    ? historySelection.calculation : null;
  const selectCalculation = useCallback((calculation) => {
    setHistorySelection(calculation && userId ? { userId, calculation } : null);
  }, [userId]);
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

  const resetHypothetical = useCallback(() => {
    setHypotheticalInputs(null);
    setHypotheticalRiskScore(null);
    setHypotheticalTopContributors([]);
  }, []);

  // Memoized so consumers only re-render when a value they actually read
  // changes, instead of on every RiskProvider render (e.g. every what-if
  // slider drag updating hypotheticalInputs would otherwise re-render every
  // RiskContext consumer, not just the ones showing the hypothetical score).
  const value = useMemo(
    () => ({
      // Original assessment
      stressInputs,
      setStressInputs,
      stressScore: isModuleComplete("stress", stressInputs) ? calculateStressScore(stressInputs) : null,
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
      assessedInputs,
      setAssessedInputs,
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
    }),
    [
      selectedCalculation,
      historyRevision,
      viewingCalculationId,
      historyActivity,
      calculationDeleted,
      selectCalculation,
      riskInputs,
      riskCalculationId,
      riskScore,
      assessedInputs,
      topContributors,
      hypotheticalInputs,
      hypotheticalRiskScore,
      hypotheticalTopContributors,
      resetHypothetical,
    ]
  );

  return <RiskContext.Provider value={value}>{children}</RiskContext.Provider>;
}
