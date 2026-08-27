import { useContext, useEffect, useRef } from "react";
import { RiskContext } from "../../context/RiskContext";
import { AuthContext } from "../../context/AuthContext";
import { riskInputSchema } from "../../schemas/riskInputSchema";
import { getLatestPrediction, predictRisk } from "../../services/api";
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
    setRiskScore,
    topContributors,
    setTopContributors,

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

  const { isAuthenticated, accessToken } = useContext(AuthContext);

  // Used to debounce calls to the backend when a slider
  // is moved continuously.
  const predictionTimer = useRef(null);

  // A logged-in user should see their most recent evaluation on the
  // dashboard even if they didn't just submit one this session (e.g. they
  // logged back in later, or navigated here directly). The account's
  // stored history is the source of truth once logged in, so this always
  // re-syncs on mount/auth-change rather than only filling in a gap - that
  // also means switching accounts can't leak the previous user's score.
  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    getLatestPrediction(accessToken)
      .then((result) => {
        if (cancelled || !result.has_history) return;
        setRiskScore(result.risk_score);
        setTopContributors(result.top_contributors ?? []);
      })
      .catch(() => {
        // Best-effort: leave whatever's already in RiskContext (e.g. a
        // just-submitted score) rather than blocking the dashboard on this.
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, accessToken, setRiskScore, setTopContributors]);

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