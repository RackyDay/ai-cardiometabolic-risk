import { createContext } from "react";
import { MG_DL } from "../utils/unitConversion";

// Split from UnitProvider (see UnitProvider.jsx) so this file exports only
// the context value, not a component - Vite's Fast Refresh can only hot-swap
// a file whose exports are all components, and mixing the two here forced a
// full reload on every edit to either.
//
// Unlike AuthContext/RiskContext this has a usable default (mg/dL, no-op
// toggle) so components that read units still render without a provider.
export const UnitContext = createContext({
  clinicalUnit: MG_DL,
  toggleClinicalUnit: () => {},
});
