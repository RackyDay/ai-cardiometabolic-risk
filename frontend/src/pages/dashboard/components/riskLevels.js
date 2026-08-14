
export const RISK_LEVELS = [
  {
    key: "low",
    label: "Low Risk",
    min: 0,
    max: 10,
    color: "#22c55e",
    bgColor: "#f0fdf4",
    description: "Your 10-year risk is low. Keep up your healthy habits.",
  },
  {
    key: "moderate",
    label: "Moderate Risk",
    min: 10,
    max: 20,
    color: "#f59e0b",
    bgColor: "#fffbeb",
    description:
      "Your 10-year risk is moderate. Small lifestyle changes can help lower it.",
  },
  {
    key: "high",
    label: "High Risk",
    min: 20,
    max: 100,
    color: "#ef4444",
    bgColor: "#fef2f2",
    description:
      "Your 10-year risk is high. Consider speaking with a healthcare provider.",
  },
];

export function getRiskLevel(score) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    RISK_LEVELS.find((level) => clamped >= level.min && clamped < level.max) ??
    RISK_LEVELS[RISK_LEVELS.length - 1]
  );
}