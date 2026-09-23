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

  // Explicit setter (as opposed to toggleClinicalUnit's flip) for the
  // segmented mg/dL | mmol/L control, which needs to set a specific side
  // rather than just flip - clicking the already-active option is then a
  // no-op instead of switching away from it.
  const setUnit = useCallback((unit) => {
    setClinicalUnit(unit === MMOL_L ? MMOL_L : MG_DL);
  }, []);

  const value = useMemo(
    () => ({ clinicalUnit, toggleClinicalUnit, setClinicalUnit: setUnit }),
    [clinicalUnit, toggleClinicalUnit, setUnit]
  );

  return <UnitContext.Provider value={value}>{children}</UnitContext.Provider>;
}
