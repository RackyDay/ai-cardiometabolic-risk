// Shared by factor rows, pie slices, tooltips, and the selected-factor label.
// Use model feature IDs so labels and contribution rankings cannot change colors.
export const RISK_FACTOR_COLORS = {
  BMI: "#2563EB", // Blue
  diaBP: "#7E22CE", // Violet
  sysBP: "#F97316", // Orange
  BPMeds: "#007F73", // Teal
  totChol: "#C2188B", // Magenta
  glucose: "#2E8B28", // Green
  currentSmoker: "#DC2626", // Red
  cigsPerDay: "#22B8CF", // Cyan
  age: "#D4A000", // Gold
  male: "#172554", // Navy
  prevalentHyp: "#7C7F14", // Olive
  heartRate: "#F58BA7", // Rose
  diabetes: "#64748B", // Slate
  education: "#8B5A2B", // Brown
  prevalentStroke: "#292929", // Charcoal
};

export function getRiskFactorColor(feature) {
  return RISK_FACTOR_COLORS[feature] ?? "#94A3B8";
}
