import { useContext } from "react";
import { RiskContext } from "../../context/RiskContext";
import { riskInputSchema } from "../../schemas/riskInputSchema";

// The EBM model explains predictions using its training column names, which
// differ from the input form's field names in a couple of spots (see
// backend/risk_model.py's _build_feature_row). Map back to the schema key
// so we can reuse the form's print_name for display.
const FEATURE_TO_SCHEMA_KEY = {
  male: "gender",
  BPMeds: "bpMeds",
};

function labelForFeature(feature) {
  const schemaKey = FEATURE_TO_SCHEMA_KEY[feature] || feature;
  return riskInputSchema[schemaKey]?.print_name ?? feature;
}

export function useDashboardViewModel() {
  const { riskScore, topContributors } = useContext(RiskContext);
  const contributors = topContributors ?? [];

  // The EBM is additive in log-odds (logit) space, not probability space —
  // sigmoid(intercept + sum of contributions) = risk probability — so an
  // individual contribution can't be read as "X% of the risk score" without
  // misrepresenting the math. Instead we show each factor's *relative
  // weight*: its share of the total |contribution| across the factors shown
  // here, so the displayed percentages sum to 100% of "what's shown," not
  // of the risk score itself.
  const totalAbsContribution = contributors.reduce(
    (sum, contributor) => sum + Math.abs(contributor.contribution),
    0
  );

  // top_contributors arrives capped at 10 and sorted by |contribution|
  // (see backend/risk_model.py), which mixes risk-raising and risk-lowering
  // factors together by magnitude. For display we want them ordered from
  // highest (most risk-raising) contribution down to lowest (most
  // risk-lowering), so re-sort by the signed value here.
  const riskFactors = [...contributors] // copy first: Array.sort mutates in place, and topContributors is shared RiskContext state
    .sort((a, b) => b.contribution - a.contribution) // descending by signed value, not |value| — negative (protective) contributors sink to the bottom
    .map((contributor) => ({
      feature: contributor.feature,
      label: labelForFeature(contributor.feature),
      raisesRisk: contributor.contribution > 0,
      // Guard against 0/0 in the (unreachable in practice) case where every
      // shown contribution is exactly 0.
      weightPercent:
        totalAbsContribution === 0
          ? 0
          : (Math.abs(contributor.contribution) / totalAbsContribution) * 100,
    }));

  const pieData = riskFactors.map((factor) => ({
    name: factor.label,
    value: factor.weightPercent,
  }));

  return {
    displayScore: riskScore ?? 50,
    riskFactors,
    pieData,
  };
}

