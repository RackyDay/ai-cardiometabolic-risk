
export const RISK_LEVELS = [
  {
    key: "low",
    label: "Low Risk",
    min: 0,
    max: 5,
    color: "#22c55e",
    bgColor: "#f0fdf4",
    shortDescription: "Keep up your current habits.",
    description:
      "Your 10-year CHD risk is low. Your current health profile supports good heart health — keep up the habits that got you here.",
  },
  {
    key: "borderline",
    label: "Borderline Risk",
    min: 5,
    max: 7.5,
    color: "#eab308",
    bgColor: "#fefce8",
    shortDescription: "Start monitoring key risk factors.",
    description:
      "Your 10-year CHD risk is borderline. You're just above the low-risk range — a good time to start keeping a closer eye on factors like blood pressure, cholesterol, and smoking.",
  },
  {
    key: "moderate",
    label: "Moderate Risk",
    min: 7.5,
    max: 20,
    color: "#f97316",
    bgColor: "#fff7ed",
    shortDescription: "Lifestyle changes can help lower this.",
    description:
      "Your 10-year CHD risk is moderate. Lifestyle changes such as diet, exercise, or quitting smoking can meaningfully lower your risk, and it's worth discussing prevention options with a healthcare provider.",
  },
  {
    key: "high",
    label: "High Risk",
    min: 20,
    max: 100,
    color: "#ef4444",
    bgColor: "#fef2f2",
    shortDescription: "Talk to a healthcare provider soon.",
    description:
      "Your 10-year CHD risk is high. We recommend speaking with a healthcare provider soon to discuss treatment and prevention strategies tailored to your risk factors.",
  },
];

export function getRiskLevel(score) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    RISK_LEVELS.find((level) => clamped >= level.min && clamped < level.max) ??
    RISK_LEVELS[RISK_LEVELS.length - 1]
  );
}

/* Formats a level's range as "0–5%" or, for the open-ended top band, "20%+". */
export function formatRiskRange(level) {
  const isLastBand = level === RISK_LEVELS[RISK_LEVELS.length - 1];
  return isLastBand ? `${level.min}%+` : `${level.min}–${level.max}%`;
}
