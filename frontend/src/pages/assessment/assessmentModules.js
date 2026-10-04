import HeartECGIcon from "../../components/icons/HeartECGIcon";
import StressIcon from "../../components/icons/StressIcon";
import MoreModulesIcon from "../../components/icons/MoreModulesIcon";

// Add modules here and register their input routes in App.jsx. On successful
// input save, call completeModule(id, inputs) with that module's input snapshot.
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
  {
    id: "stress",
    title: "Stress Levels",
    category: "Mental wellbeing",
    description: "Complete a Perceived Stress Scale (PSS) test to explore your perceived stress levels and how you feel about everyday pressures.",
    Icon: StressIcon,
    topics: ["Perceived stress", "Everyday pressures"],
    required: false,
    to: "/stress",
    footer: "Your results will appear on your dashboard.",
    getInputs: ({ stressInputs }) => stressInputs,
  },
  {
    id: "more-modules",
    title: "More modules coming soon",
    category: "Explore more",
    description: "More ways to explore your health are on the way. Check back for new assessment modules as they become available.",
    Icon: MoreModulesIcon,
    required: false,
    comingSoon: true,
    footer: "Your health journey is just getting started.",
    getInputs: () => ({}),
  },
];
