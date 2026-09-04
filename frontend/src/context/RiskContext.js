import { createContext } from "react";

// Split from RiskProvider (see RiskProvider.jsx) so this file exports only
// the context value, not a component - Vite's Fast Refresh can only hot-swap
// a file whose exports are all components, and mixing the two here forced a
// full reload on every edit to either.
export const RiskContext = createContext();
