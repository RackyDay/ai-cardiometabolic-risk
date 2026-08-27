import { useContext, useEffect, useRef } from "react";

import { RiskContext } from "../../context/RiskContext";
import { riskInputSchema } from "../../schemas/riskInputSchema";
import { predictRisk } from "../../services/api";
import { buildPredictionPayload } from "../input/riskInputTransform";
import { CHANGEABLE_RISK_FACTORS } from "./changeableRiskFactors";

// The EBM model explains predictions using its training column names,
// which differ from the input form's field names in a couple of spots.
// Map those model names back to the schema keys so we can reuse the
// form's print_name for display.
const FEATURE_TO_SCHEMA_KEY = {
  male: "gender",
  BPMeds: "bpMeds",
};

function labelForFeature(feature) {
  const schemaKey = FEATURE_TO_SCHEMA_KEY[feature] || feature;

  return riskInputSchema[schemaKey]?.print_name ?? feature;
}

/*
 * Convert raw EBM contributors into the format used by the dashboard.
 */
function buildRiskFactors(contributors) {
  const safeContributors = contributors ?? [];

  const totalAbsContribution = safeContributors.reduce(
    (sum, contributor) =>
      sum + Math.abs(contributor.contribution),
    0
  );

  return [...safeContributors]
    .sort(
      (a, b) =>
        b.contribution - a.contribution
    )
    .map((contributor) => ({
      feature: contributor.feature,

      label: labelForFeature(
        contributor.feature
      ),

      raisesRisk:
        contributor.contribution > 0,

      weightPercent:
        totalAbsContribution === 0
          ? 0
          : (
              Math.abs(
                contributor.contribution
              ) / totalAbsContribution
            ) * 100,
    }));
}

export function useDashboardViewModel() {
  const {
    // ---------------------------------------------
    // Original assessment
    // ---------------------------------------------
    riskInputs,
    riskScore,
    topContributors,

    // ---------------------------------------------
    // Hypothetical / What-if assessment
    // ---------------------------------------------
    hypotheticalInputs,
    setHypotheticalInputs,

    hypotheticalRiskScore,
    hypotheticalTopContributors,

    setHypotheticalRiskScore,
    setHypotheticalTopContributors,

    resetHypothetical,
  } = useContext(RiskContext);

  // Used to debounce calls to the backend when a slider
  // is moved continuously.
  const predictionTimer = useRef(null);

  // ---------------------------------------------
  // Original risk factors
  // ---------------------------------------------

  const riskFactors = buildRiskFactors(
    topContributors
  );

  const pieData = riskFactors.map(
    (factor) => ({
      name: factor.label,
      value: factor.weightPercent,
      feature: factor.feature,
      raisesRisk: factor.raisesRisk,
    })
  );

  // ---------------------------------------------
  // Hypothetical risk factors
  // ---------------------------------------------

  const hypotheticalRiskFactors =
    buildRiskFactors(
      hypotheticalTopContributors
    );

  const hypotheticalPieData =
    hypotheticalRiskFactors.map(
      (factor) => ({
        name: factor.label,
        value: factor.weightPercent,
        feature: factor.feature,
        raisesRisk: factor.raisesRisk,
      })
    );

  // ---------------------------------------------
  // Update a hypothetical input
  // ---------------------------------------------

  const updateHypotheticalInput = (
    feature,
    value
  ) => {
    setHypotheticalInputs((previous) => ({
      ...(previous ?? riskInputs),
      [feature]: value,
    }));
  };

  // ---------------------------------------------
  // Run hypothetical prediction
  // ---------------------------------------------
  //
  // Whenever the user changes a hypothetical
  // value, wait 300ms before sending the request.
  //
  // This prevents a slider from creating a new
  // backend request for every tiny movement.
  // ---------------------------------------------

  useEffect(() => {
    if (!hypotheticalInputs) {
      return;
    }

    if (predictionTimer.current) {
      clearTimeout(predictionTimer.current);
    }

    predictionTimer.current = setTimeout(
      async () => {
        try {
          const payload =
            buildPredictionPayload(
              hypotheticalInputs,
              riskInputSchema
            );

          const result =
            await predictRisk(payload);

          setHypotheticalRiskScore(
            result.risk_score
          );

          setHypotheticalTopContributors(
            result.top_contributors
          );
        } catch (error) {
          console.error(
            "Hypothetical prediction failed:",
            error
          );
        }
      },
      300
    );

    return () => {
      if (predictionTimer.current) {
        clearTimeout(
          predictionTimer.current
        );
      }
    };
  }, [
    hypotheticalInputs,
    setHypotheticalRiskScore,
    setHypotheticalTopContributors,
  ]);

  // ---------------------------------------------
  // Return values used by DashboardPage
  // ---------------------------------------------

  return {
    // Original assessment
    displayScore: riskScore ?? 50,

    riskFactors,

    pieData,

    // Hypothetical / What-if assessment
    hypotheticalScore:
      hypotheticalRiskScore,

    hypotheticalRiskFactors,

    hypotheticalPieData,

    hypotheticalInputs,

    // Configuration describing which factors
    // can be changed by the user.
    changeableRiskFactors:
      CHANGEABLE_RISK_FACTORS,

    // Function used by the dashboard controls
    // to change one hypothetical input.
    updateHypotheticalInput,

    // Reset hypothetical changes back to the
    // original assessment state.
    resetHypothetical,
  };
}