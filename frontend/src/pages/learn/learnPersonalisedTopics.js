import { riskInputSchema } from "../../schemas/riskInputSchema";
import { learnRiskFactors } from "./learnRiskFactors";
import { formatSavedValue } from "../dashboard/formatSavedValue";

// Maps the values of a completed assessment to MedlinePlus search terms.
// Thresholds follow Australian guidance (values are stored in mg/dL):
// - Blood pressure: Heart Foundation hypertension guideline (2016), high at
//   140/90 mmHg or above; healthdirect describes low as below 90/60 mmHg.
// - BMI: AIHW/WHO adult categories (underweight < 18.5, overweight 25-29.9,
//   obese 30+).
// - Total cholesterol: ABS Australian Health Survey threshold of 5.5 mmol/L.
// - Fasting glucose: Diabetes Australia/WHO, impaired 6.1-6.9 mmol/L and
//   diabetes range 7.0 mmol/L or above.
// - Resting heart rate: healthdirect adult range of 60-100 bpm.
// - Age: Heart Foundation recommends Heart Health Checks from age 45.
// Only the generic search term is sent to MedlinePlus, never the values.
const MAX_TOPICS = 4;

const toNumber = (value) =>
  value === null || value === undefined || value === "" ? NaN : Number(value);

const fromMmol = (schemaKey, mmol) => mmol * riskInputSchema[schemaKey].mmolConversionFactor;

const rules = [
  {
    schemaKeys: ["currentSmoker", "cigsPerDay"],
    match: (inputs) => inputs.currentSmoker === true && {
      searchTerm: "quitting smoking",
      reason: () => "You told us that you currently smoke.",
    },
  },
  {
    schemaKeys: ["sysBP", "diaBP", "prevalentHyp"],
    match: (inputs) => {
      const sysBP = toNumber(inputs.sysBP);
      const diaBP = toNumber(inputs.diaBP);
      if (sysBP >= 140 || diaBP >= 90) {
        return {
          searchTerm: "high blood pressure",
          reason: (format) => `Your blood pressure of ${format("sysBP")} / ${format("diaBP")} is at or above 140/90 mmHg, which Australian guidelines describe as high.`,
        };
      }
      if (inputs.prevalentHyp === true) {
        return {
          searchTerm: "high blood pressure",
          reason: () => "You told us you have been diagnosed with hypertension.",
        };
      }
      if (sysBP < 90 || diaBP < 60) {
        return {
          searchTerm: "low blood pressure",
          reason: (format) => `Your blood pressure of ${format("sysBP")} / ${format("diaBP")} is below 90/60 mmHg, which is generally considered low.`,
        };
      }
      return null;
    },
  },
  {
    schemaKeys: ["bpMeds"],
    match: (inputs) => inputs.bpMeds === true && {
      searchTerm: "blood pressure medicines",
      reason: () => "You told us that you take blood pressure medication.",
    },
  },
  {
    schemaKeys: ["diabetes", "glucose"],
    match: (inputs) => {
      const glucose = toNumber(inputs.glucose);
      if (inputs.diabetes === true) {
        return {
          searchTerm: "diabetic heart disease",
          reason: () => "You told us you have been diagnosed with diabetes.",
        };
      }
      if (glucose >= fromMmol("glucose", 7.0)) {
        return {
          searchTerm: "diabetes",
          reason: (format) => `Your fasting blood glucose of ${format("glucose")} is in the range used to diagnose diabetes.`,
        };
      }
      if (glucose >= fromMmol("glucose", 6.1)) {
        return {
          searchTerm: "prediabetes",
          reason: (format) => `Your fasting blood glucose of ${format("glucose")} is above the usual fasting range.`,
        };
      }
      return null;
    },
  },
  {
    schemaKeys: ["totChol"],
    match: (inputs) => toNumber(inputs.totChol) >= fromMmol("totChol", 5.5) && {
      searchTerm: "cholesterol levels",
      reason: (format) => `Your total cholesterol of ${format("totChol")} is at or above 5.5 mmol/L, which is considered high in Australia.`,
    },
  },
  {
    schemaKeys: ["BMI"],
    match: (inputs) => {
      const bmi = toNumber(inputs.BMI);
      if (bmi >= 30) {
        return {
          searchTerm: "obesity",
          reason: (format) => `Your BMI of ${format("BMI")} is in the obese range (30 or above).`,
        };
      }
      if (bmi >= 25) {
        return {
          searchTerm: "weight control",
          reason: (format) => `Your BMI of ${format("BMI")} is in the overweight range (25 to 29.9).`,
        };
      }
      if (bmi < 18.5) {
        return {
          searchTerm: "healthy weight",
          reason: (format) => `Your BMI of ${format("BMI")} is in the underweight range (below 18.5).`,
        };
      }
      return null;
    },
  },
  {
    schemaKeys: ["prevalentStroke"],
    match: (inputs) => inputs.prevalentStroke === true && {
      searchTerm: "stroke",
      reason: () => "You told us that you have had a stroke.",
    },
  },
  {
    schemaKeys: ["heartRate"],
    match: (inputs) => {
      const heartRate = toNumber(inputs.heartRate);
      if (heartRate > 100) {
        return {
          searchTerm: "tachycardia",
          reason: (format) => `Your resting heart rate of ${format("heartRate")} is above the usual adult range of 60 to 100 bpm.`,
        };
      }
      if (heartRate < 60) {
        return {
          searchTerm: "bradycardia",
          reason: (format) => `Your resting heart rate of ${format("heartRate")} is below the usual adult range of 60 to 100 bpm.`,
        };
      }
      return null;
    },
  },
  {
    schemaKeys: ["age"],
    match: (inputs) => toNumber(inputs.age) >= 45 && {
      searchTerm: "heart health tests",
      reason: (format) => `At ${format("age")} years of age, regular heart health checks are recommended in Australia.`,
    },
  },
];

export const generalTopic = {
  searchTerm: "heart health",
  reason: "None of your answers were outside the ranges we check, so here is some general heart health reading.",
};

// Model contributors use feature names (e.g. "male", "BPMeds"); map them back
// to schema keys so topics can be ranked by how much they raised the risk.
const schemaKeyByFeature = Object.fromEntries(
  learnRiskFactors.map((factor) => [factor.featureKey, factor.schemaKey]),
);

/**
 * @param {object | null | undefined} inputs Completed assessment inputs, keyed by schema key.
 * @param {Array<{feature: string, contribution: number}> | null | undefined} contributors
 * @param {string} clinicalUnit Display unit used in the explanations.
 * @returns {Array<{searchTerm: string, reason: string}> | null} null without an assessment.
 */
export function buildPersonalisedTopics(inputs, contributors, clinicalUnit) {
  if (!inputs || typeof inputs !== "object") return null;

  const contributionBySchemaKey = {};
  for (const { feature, contribution } of contributors ?? []) {
    contributionBySchemaKey[schemaKeyByFeature[feature] ?? feature] = Number(contribution) || 0;
  }
  const format = (schemaKey) => formatSavedValue(schemaKey, inputs[schemaKey], clinicalUnit) ?? "not provided";

  const topics = [];
  rules.forEach((rule, order) => {
    const topic = rule.match(inputs);
    if (!topic || topics.some((existing) => existing.searchTerm === topic.searchTerm)) return;
    const contributions = rule.schemaKeys
      .map((schemaKey) => contributionBySchemaKey[schemaKey])
      .filter((contribution) => contribution !== undefined);
    topics.push({
      searchTerm: topic.searchTerm,
      reason: topic.reason(format),
      order,
      contribution: contributions.length ? Math.max(...contributions) : -Infinity,
    });
  });

  // Factors that raised this user's risk the most come first; rule order
  // breaks ties (Array.prototype.sort is stable).
  topics.sort((a, b) => b.contribution - a.contribution || a.order - b.order);
  const selected = topics.slice(0, MAX_TOPICS).map(({ searchTerm, reason }) => ({ searchTerm, reason }));
  return selected.length ? selected : [generalTopic];
}
