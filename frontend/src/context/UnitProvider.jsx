import { useCallback, useEffect, useMemo, useState } from "react";
import { UnitContext } from "./UnitContext";
import { MG_DL, MMOL_L } from "../utils/unitConversion";

const STORAGE_KEY = "clinicalUnit";

// Remember the choice across refreshes so someone who prefers mmol/L doesn't
// have to re-toggle on every visit. Falls back to mg/dL if storage is
// unavailable (private window, blocked site data) or holds something unknown.
const loadStoredUnit = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === MMOL_L ? MMOL_L : MG_DL;
  } catch {
    return MG_DL;
  }
};

export function UnitProvider({ children }) {
  const [clinicalUnit, setClinicalUnit] = useState(loadStoredUnit);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, clinicalUnit);
    } catch {
      // Non-critical: the toggle still works for this session.
    }
  }, [clinicalUnit]);

  const toggleClinicalUnit = useCallback(() => {
    setClinicalUnit((current) => (current === MG_DL ? MMOL_L : MG_DL));
  }, []);

  const value = useMemo(
    () => ({ clinicalUnit, toggleClinicalUnit }),
    [clinicalUnit, toggleClinicalUnit]
  );

  return <UnitContext.Provider value={value}>{children}</UnitContext.Provider>;
}
