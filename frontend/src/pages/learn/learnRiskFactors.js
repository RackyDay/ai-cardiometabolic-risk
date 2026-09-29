import { riskInputSchema } from "../../schemas/riskInputSchema";

// Static educational copy for KAN-242, keyed by the existing input schema.
// Search terms are metadata for a future content provider; nothing fetches them.
const factorContent = {
  gender: {
    featureKey: "male",
    description:
      "Sex is included in many cardiovascular risk models because cardiovascular risk patterns differ between males and females.",
    searchTerms: ["heart disease women", "heart disease men"],
  },
  age: {
    description:
      "Cardiovascular risk generally increases with age as changes in blood vessels and the accumulation of other risk factors become more common.",
    searchTerms: ["aging heart health"],
  },
  education: {
    description:
      "This assessment records your highest completed level of education as part of the background information used by the model.",
    searchTerms: ["health literacy", "understanding health information"],
  },
  currentSmoker: {
    description:
      "Smoking damages blood vessels, makes blood clots more likely and increases the risk of heart disease and stroke.",
    searchTerms: ["smoking heart disease", "quitting smoking"],
  },
  cigsPerDay: {
    description:
      "Greater tobacco exposure is associated with cardiovascular harm because smoking can damage blood vessels and promote plaque buildup.",
    searchTerms: ["tobacco exposure", "quitting smoking"],
  },
  bpMeds: {
    featureKey: "BPMeds",
    description:
      "Blood pressure medication can indicate a history of hypertension. Well-controlled blood pressure can help reduce cardiovascular risk.",
    searchTerms: ["blood pressure medicines"],
  },
  prevalentStroke: {
    description:
      "This assessment asks whether you have ever had a stroke. Your answer is included with your other medical-history information.",
    searchTerms: ["stroke", "stroke prevention"],
  },
  prevalentHyp: {
    description:
      "A history of hypertension is an important cardiovascular risk factor because persistently high blood pressure can damage the heart and blood vessels.",
    searchTerms: ["high blood pressure"],
  },
  diabetes: {
    description:
      "Diabetes can damage blood vessels and is associated with a higher risk of heart disease and stroke.",
    searchTerms: ["diabetes heart disease"],
  },
  sysBP: {
    description:
      "Systolic blood pressure is the top number in a blood pressure reading. Higher blood pressure increases the workload on the heart.",
    searchTerms: ["blood pressure measurement", "high blood pressure"],
  },
  diaBP: {
    description:
      "Diastolic blood pressure is the bottom number in a blood pressure reading. Higher blood pressure can damage blood vessels over time.",
    searchTerms: ["blood pressure measurement", "high blood pressure"],
  },
  BMI: {
    description:
      "Body mass index relates weight to height. A higher BMI can be associated with obesity, which can increase cardiovascular risk.",
    searchTerms: ["body mass index", "weight management"],
  },
  heartRate: {
    description:
      "Resting heart rate can provide information about cardiovascular health, although its contribution depends on the individual's overall health and other factors.",
    searchTerms: ["pulse", "resting heart rate"],
  },
  glucose: {
    description:
      "Elevated blood glucose can be associated with insulin resistance and diabetes, conditions that can increase cardiovascular risk.",
    searchTerms: ["blood glucose", "diabetes heart disease"],
  },
  totChol: {
    description:
      "Higher cholesterol levels can contribute to plaque buildup in arteries, increasing the risk of heart disease and stroke.",
    searchTerms: ["cholesterol", "heart disease prevention"],
  },
};

// Keep display labels and categories in sync with the input form. Most model
// features have the same name; the two exceptions are explicit above.
// schemaKey addresses assessment inputs; featureKey addresses model contributors.
// aliases contains only alternative model names, never display labels.
export const learnRiskFactors = Object.entries(factorContent).map(
  ([schemaKey, { featureKey = schemaKey, description, searchTerms }]) => ({
    schemaKey,
    featureKey,
    aliases: featureKey === schemaKey ? [] : [featureKey],
    title: riskInputSchema[schemaKey].print_name,
    category: riskInputSchema[schemaKey].category,
    description,
    searchTerms,
  }),
);
