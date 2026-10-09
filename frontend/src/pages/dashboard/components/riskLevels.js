
/* Each level is one colour on the bar and one row in the legend. A level can
   also be split into zones: the bar draws every zone in the level's colour,
   but hovering or tapping a zone shows its own tooltip. */
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
    zones: [
      {
        key: "high-20",
        label: "High Risk",
        min: 20,
        max: 30,
        description:
          "Your 10-year CHD risk is high. We recommend speaking with a healthcare provider soon to discuss treatment and prevention strategies tailored to your risk factors.",
      },
      {
        key: "high-30",
        label: "Very High Risk",
        min: 30,
        max: 50,
        description:
          "Your 10-year CHD risk is very high. Please arrange a medical review soon. At this level, treatment such as medication is often recommended, so ask your provider about your blood pressure, cholesterol and blood sugar as well as lifestyle changes.",
      },
      {
        key: "high-50",
        label: "Severe Risk",
        min: 50,
        max: 100,
        description:
          "Your 10-year CHD risk is severe. Please contact a healthcare provider urgently rather than waiting for a routine appointment. If you have chest pain, shortness of breath, or pain spreading to your arm or jaw, call emergency services now.",
      },
    ],
  },
];

/* The bar's drawing units: every level, with its sub-zones expanded in place.
   A level without zones is its own single zone. */
export const RISK_ZONES = RISK_LEVELS.flatMap((level) =>
  level.zones
    ? level.zones.map((zone) => ({ ...zone, color: level.color }))
    : [level]
);

export function getRiskLevel(score) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    RISK_LEVELS.find((level) => clamped >= level.min && clamped < level.max) ??
    RISK_LEVELS[RISK_LEVELS.length - 1]
  );
}

/* Formats a range as "0–5%" or, for an open-ended top range, "20%+".
   Works for levels and zones alike. */
export function formatRiskRange(range) {
  return range.max >= 100 ? `${range.min}%+` : `${range.min}–${range.max}%`;
}
