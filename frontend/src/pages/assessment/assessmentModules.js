import HeartECGIcon from "../../components/icons/HeartECGIcon";

// Add modules here and register their input routes in App.jsx. On successful
// submission, call completeModule(id, inputs) with that module's input snapshot.
export const assessmentModules = [
  {
    id: "base-risk",
    title: "Base risk inputs",
    category: "Cardiovascular health",
    description: "Build your health profile and calculate your cardiovascular risk with our core assessment.",
    Icon: HeartECGIcon,
    topics: ["Health measurements", "Medical history", "Lifestyle"],
    required: true,
    to: "/inputs",
    footer: "Your results will appear on your dashboard.",
    getInputs: ({ riskInputs }) => riskInputs,
  },
];
