
/* Each level is one row in the legend. A level can also be split into
   zones for finer-grained severity within it (e.g. "high" risk spans
   20-100%, which reads as equally serious at 21% and 90% unless broken
   up further) - each zone gets its own color, label, bar segment, legend
   row, and hover/tap tooltip.

   `severityTag` is a short (2-4 word) phrase shown next to the label
   under the score, e.g. "High Risk - Medical review advised" - just
   enough to say what the number means to do about it, without repeating
   the full `description` sentence. `description`'s clinical framing
   below follows the 2018/2019 AHA/ACC blood-cholesterol and ASCVD-risk
   guidelines (statin intensity by category, and ACC/AHA's own very-high-
   risk LDL-C threshold and ezetimibe/PCSK9i add-on sequence for >=30%)
   and the ESC SCORE2 guideline's "high" (20-30%) vs "very high" (>=30%)
   split. There's no further guideline-defined split above very high -
   the 50/80/90% tiers are this app's own escalation, same reasoning as
   FRAX's and the cholesterol guideline's additional "extreme risk" tier
   beyond very high. Research on cardiovascular risk communication (e.g.
   Harle et al., Covolo et al. systematic reviews) cautions that framing
   a long-term statistical risk as an acute emergency is both inaccurate
   and tends to backfire (patients disengage or disbelieve it) - so even
   at the top of the scale, the primary instruction is urgency of
   *clinical evaluation and treatment*, not "this number means call an
   ambulance." The one emergency-services line that does appear is
   conditioned on actual symptoms (chest pain, breathlessness, etc.),
   which is standard safety-net advice regardless of a person's risk
   score. */
export const RISK_LEVELS = [
  {
    key: "low",
    label: "Low Risk",
    min: 0,
    max: 5,
    color: "#22c55e",
    bgColor: "#f0fdf4",
    severityTag: "Minimal concern",
    shortDescription: "Keep up your current habits.",
    description:
      "Your 10-year CHD risk is low. Guidelines don't typically recommend medication at this level - keep up the habits that are keeping your risk low, such as a healthy diet, regular exercise, and not smoking.",
  },
  {
    key: "borderline",
    label: "Borderline Risk",
    min: 5,
    max: 7.5,
    color: "#eab308",
    bgColor: "#fefce8",
    severityTag: "Monitor closely",
    shortDescription: "Ask about risk-enhancing factors.",
    description:
      "Your 10-year CHD risk is borderline. Guidelines suggest this is a good point to discuss 'risk-enhancing' factors - such as family history or inflammatory markers - with a provider, who may consider a moderate-intensity statin if any are present.",
  },
  {
    key: "moderate",
    label: "Moderate Risk",
    min: 7.5,
    max: 20,
    color: "#f97316",
    bgColor: "#fff7ed",
    severityTag: "Lifestyle changes",
    shortDescription: "Lifestyle changes can help lower this.",
    description:
      "Your 10-year CHD risk is moderate. Guidelines generally recommend a moderate-intensity statin at this level, aiming to lower LDL cholesterol by at least 30%, alongside lifestyle changes like diet, exercise, and quitting smoking.",
  },
  {
    key: "high",
    label: "High Risk",
    min: 20,
    max: 100,
    color: "#ef4444",
    bgColor: "#fef2f2",
    severityTag: "Medical review advised",
    shortDescription: "Talk to a healthcare provider soon.",
    // The 20-30% / >=30% split mirrors the ESC SCORE2 guideline's "high"
    // vs "very high" boundary; the tiers above that add the same kind of
    // further step clinical tools add beyond "very high" (e.g. FRAX's and
    // the 2018 AHA/ACC cholesterol guideline's "extreme risk" tier) - at
    // this range, "high risk" alone stops reading as more serious than
    // 21% does, and a 55% score shouldn't look identical to a 95% one
    // either. Each zone below gets its own color, one step darker on the
    // same red hue per step (Tailwind's red-500 through red-900 - a
    // sequential scale, light-to-dark, same pattern as the rest of this
    // app's severity encodings) so the bar and legend show the
    // escalation at a glance instead of only on hover.
    zones: [
      {
        key: "high-20",
        label: "High Risk",
        min: 20,
        max: 30,
        color: "#ef4444",
        severityTag: "Medical review advised",
        shortDescription: "Talk to a healthcare provider soon.",
        description:
          "Your 10-year CHD risk is high. Guidelines generally recommend a high-intensity statin at this level, aiming to lower LDL cholesterol by at least 50% - speak with a healthcare provider soon to discuss starting or adjusting treatment.",
      },
      {
        key: "high-30",
        label: "Very High Risk",
        min: 30,
        max: 50,
        color: "#dc2626",
        severityTag: "Needs treatment",
        shortDescription: "Arrange a medical review soon.",
        description:
          "Your 10-year CHD risk is very high. At this level, guidelines often target an LDL cholesterol below 70 mg/dL, which may call for combining a statin with other medication. Please arrange a medical review soon to discuss intensifying treatment.",
      },
      {
        key: "high-50",
        label: "Severe Risk",
        min: 50,
        max: 80,
        color: "#b91c1c",
        severityTag: "Urgent review",
        shortDescription: "Arrange an urgent medical review.",
        description:
          "Your 10-year CHD risk is severe. This level typically calls for aggressive LDL-lowering treatment, potentially combining a statin with ezetimibe or a PCSK9 inhibitor. Please arrange an urgent review with a healthcare provider or cardiologist.",
      },
      {
        key: "high-80",
        label: "Critical Risk",
        min: 80,
        max: 90,
        color: "#991b1b",
        severityTag: "Specialist care",
        shortDescription: "Seek urgent specialist care.",
        description:
          "Your 10-year CHD risk is critical - among the highest levels this model estimates. Please seek an urgent specialist (cardiology) evaluation to intensify treatment. Call emergency services immediately if you develop chest pain, shortness of breath, or pain spreading to your arm or jaw.",
      },
      {
        key: "high-90",
        label: "Extreme Risk",
        min: 90,
        max: 100,
        color: "#7f1d1d",
        severityTag: "Emergency care",
        shortDescription: "Seek emergency evaluation now.",
        description:
          "Your 10-year CHD risk is extreme, the highest level this model estimates. Please seek emergency medical evaluation as soon as possible to begin intensive treatment. Call emergency services immediately if you have chest pain, shortness of breath, or pain spreading to your arm or jaw.",
      },
    ],
  },
];

/* The bar's (and legend's) drawing units: every level, with its sub-zones
   expanded in place. A level without zones is its own single zone - its
   own color and shortDescription already serve as that zone's. */
export const RISK_ZONES = RISK_LEVELS.flatMap((level) =>
  level.zones
    ? level.zones.map((zone) => ({ bgColor: level.bgColor, ...zone }))
    : [level]
);

/* The headline/legend-highlight granularity: resolves to the specific
   zone (e.g. "Very High Risk" at 45%), not just its parent level (which
   would read "High Risk" for anything from 20% to 100%). */
export function getRiskZone(score) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    RISK_ZONES.find((zone) => clamped >= zone.min && clamped < zone.max) ??
    RISK_ZONES[RISK_ZONES.length - 1]
  );
}

/* Formats a range as "0–5%" or, for an open-ended top range, "20%+".
   Works for levels and zones alike. */
export function formatRiskRange(range) {
  return range.max >= 100 ? `${range.min}%+` : `${range.min}–${range.max}%`;
}
