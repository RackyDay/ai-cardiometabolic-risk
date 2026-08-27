export const CHANGEABLE_RISK_FACTORS = {
  BMI: {
    type: "slider",
    min: 10,
    max: 60,
    step: 0.1,
    unit: "",
  },

  sysBP: {
    type: "slider",
    min: 70,
    max: 300,
    step: 1,
    unit: "mmHg",
  },

  diaBP: {
    type: "slider",
    min: 40,
    max: 200,
    step: 1,
    unit: "mmHg",
  },

  totChol: {
    type: "slider",
    min: 100,
    max: 600,
    step: 1,
    unit: "mg/dL",
  },

  glucose: {
    type: "slider",
    min: 40,
    max: 500,
    step: 1,
    unit: "mg/dL",
  },

  heartRate: {
    type: "slider",
    min: 30,
    max: 200,
    step: 1,
    unit: "BPM",
  },

  cigsPerDay: {
    type: "slider",
    min: 0,
    max: 50,
    step: 1,
    unit: "cigarettes/day",
  },

  currentSmoker: {
    type: "toggle",
  },

  bpMeds: {
    type: "toggle",
  },

  prevalentHyp: {
    type: "toggle",
  },
};