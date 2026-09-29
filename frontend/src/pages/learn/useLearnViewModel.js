import { learnRiskFactors } from "./learnRiskFactors";

// Group the configured factors without repeating either labels or card JSX.
const riskFactorGroups = Array.from(
  new Set(learnRiskFactors.map((factor) => factor.category)),
  (category) => ({
    id: category.replaceAll(" ", "-"),
    title: category,
    factors: learnRiskFactors.filter((factor) => factor.category === category),
  }),
);

function useLearnViewModel() {
  return { riskFactorGroups };
}

export default useLearnViewModel;
