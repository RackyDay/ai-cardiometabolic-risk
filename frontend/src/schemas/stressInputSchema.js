// PSS-10: Cohen, Kamarck & Mermelstein (1983); Cohen & Williamson (1988).
// Questions: https://www.cmu.edu/dietrich/psychology/stress-immunity-disease-lab/scales/html/pss.html
// Scoring: https://www.cmu.edu/dietrich/psychology/stress-immunity-disease-lab/scales/html/pssscoring.html
export const pssSource = "https://www.cmu.edu/dietrich/psychology/stress-immunity-disease-lab/scales/html/pss.html";
const options = ["Never", "Almost never", "Sometimes", "Fairly often", "Very often"]
  .map((label, value) => ({ label, value }));
const questions = [
  "In the last month, how often have you been upset because of something that happened unexpectedly?",
  "In the last month, how often have you felt that you were unable to control the important things in your life?",
  'In the last month, how often have you felt nervous and "stressed"?',
  "In the last month, how often have you felt confident about your ability to handle your personal problems?",
  "In the last month, how often have you felt that things were going your way?",
  "In the last month, how often have you found that you could not cope with all the things that you had to do?",
  "In the last month, how often have you been able to control irritations in your life?",
  "In the last month, how often have you felt that you were on top of things?",
  "In the last month, how often have you been angered because of things that were outside of your control?",
  "In the last month, how often have you felt difficulties were piling up so high that you could not overcome them?",
];
export const stressInputSchema = Object.fromEntries(questions.map((question, index) => [
  `pss${index + 1}`, {
    name: `pss${index + 1}`, input_label: `${index + 1}. ${question}`,
    type: "select", options, required: true, defaultValue: "",
    category: Math.floor(index / 2), reverseScored: [4, 5, 7, 8].includes(index + 1),
  },
]));

export function validateStressInputs(inputs) {
  return Object.fromEntries(Object.entries(stressInputSchema)
    .filter(([name, field]) => !field.options.some(({ value }) => inputs[name] === value))
    .map(([name]) => [name, "Choose a response to this question."]));
}

export function calculateStressScore(inputs) {
  if (Object.keys(validateStressInputs(inputs)).length) return null;
  return Object.entries(stressInputSchema).reduce((sum, [name, field]) =>
    sum + (field.reverseScored ? 4 - inputs[name] : inputs[name]), 0);
}
