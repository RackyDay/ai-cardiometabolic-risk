import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { RiskContext } from "../../context/RiskContext";
import { AuthContext } from "../../context/AuthContext";
import { getRiskCalculation, saveStressResult } from "../../services/api";
import { createInitalRiskInputs } from "../../schemas/createInitialRiskInputs";
import { stressInputSchema, validateStressInputs } from "../../schemas/stressInputSchema";

const fields = Object.values(stressInputSchema);
const pages = [...new Set(fields.map((field) => field.category))]
  .map((category) => fields.filter((field) => field.category === category));

export function useStressViewModel() {
  const { stressInputs: sharedInputs, setStressInputs: setSharedInputs, completeModule, selectedCalculation } = useContext(RiskContext);
  const { isAuthenticated, accessToken } = useContext(AuthContext);
  const [params] = useSearchParams();
  const fromDashboard = params.get("from") === "dashboard";
  const calculationId = params.get("calculation");
  const persisted = fromDashboard && Boolean(calculationId);
  const requestKey = `${accessToken}:${calculationId}`;
  const [loaded, setLoaded] = useState(null);
  const [draft, setDraft] = useState(sharedInputs);
  const [retry, setRetry] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const saving = useRef(false);
  const currentKey = useRef(requestKey);
  useEffect(() => {
    currentKey.current = requestKey;
    return () => { currentKey.current = null; };
  }, [requestKey]);
  const stressInputs = fromDashboard ? draft : sharedInputs;
  const setStressInputs = fromDashboard ? setDraft : setSharedInputs;
  const loadError = fromDashboard && selectedCalculation
    ? "Historical assessments are read-only. Return to the dashboard to view this result."
    : persisted && (!isAuthenticated || !accessToken)
    ? "Sign in to edit this saved assessment."
    : fromDashboard && isAuthenticated && !calculationId
      ? "Return to the dashboard and select an assessment first."
      : loaded?.key === requestKey ? loaded.error : "";
  const isLoading = persisted && !loadError && loaded?.key !== requestKey;
  useEffect(() => {
    if (!persisted || !isAuthenticated || !accessToken) return;
    let cancelled = false;
    getRiskCalculation(accessToken, calculationId).then((result) => {
      if (cancelled) return;
      setDraft({ ...createInitalRiskInputs(stressInputSchema), ...result.context_JSON?.stress?.answers });
      setLoaded({ key: requestKey });
    }).catch(() => {
      if (!cancelled) setLoaded({ key: requestKey, error: "Couldn't load your stress answers. Please try again." });
    });
    return () => { cancelled = true; };
  }, [persisted, isAuthenticated, accessToken, calculationId, requestKey, retry]);
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [errors, setErrors] = useState({});
  const set = (name) => (value) => {
    setStressInputs((current) => ({ ...current, [name]: value === "" ? "" : Number(value) }));
    setErrors((current) => ({ ...current, [name]: "" }));
  };
  const returnToOrigin = () => navigate(fromDashboard ? "/dashboard" : "/assessment",
    fromDashboard ? { state: { tab: "stress" } } : undefined);
  const handleSave = async () => {
    if (saving.current || isLoading || loadError) return;
    const nextErrors = validateStressInputs(stressInputs);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setPage(pages.findIndex((items) => items.some(({ name }) => nextErrors[name])));
      return;
    }
    saving.current = true;
    setIsSaving(true);
    setSaveError("");
    try {
      if (persisted) {
        await saveStressResult(accessToken, calculationId, stressInputs);
        if (currentKey.current !== requestKey) return;
      } else {
        if (fromDashboard) setSharedInputs(stressInputs);
        completeModule("stress", stressInputs);
      }
      returnToOrigin();
    } catch {
      setSaveError("Couldn't save your stress answers. Please try again.");
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  };
  return { stressInputs, errors, set, pages, page, setPage, handleSave, returnToOrigin,
    fromDashboard, isLoading, loadError, isSaving, saveError,
    retryLoad: () => { setLoaded(null); setRetry((value) => value + 1); } };
}
