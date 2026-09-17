import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { RiskContext } from "../../context/RiskContext";
import { AuthContext } from "../../context/AuthContext";
import { riskInputSchema } from "../../schemas/riskInputSchema";
import {
  getLatestPrediction,
  getRiskCalculationHistory,
  getRiskCalculation,
  predictRisk
} from "../../services/api";
import { createInitalRiskInputs } from "../../schemas/createInitialRiskInputs";
import { buildRiskTrend } from "./buildRiskTrend";
import { buildPredictionPayload } from "../input/riskInputTransform";
import { useLocation } from "react-router-dom";
import { CHANGEABLE_RISK_FACTORS } from "./changeableRiskFactors";
import { formatSavedValue } from "./formatSavedValue";

/* =========================================================
   EBM feature name -> frontend schema name
========================================================= */

const FEATURE_TO_SCHEMA_KEY = {
  male: "gender",
  BPMeds: "bpMeds",
};


function labelForFeature(feature) {
  const schemaKey =
    FEATURE_TO_SCHEMA_KEY[feature] || feature;

  return (
    riskInputSchema[schemaKey]?.print_name ??
    feature
  );
}


/* =========================================================
   Build dashboard risk factors
========================================================= */

function buildRiskFactors(contributors, originalInputs) {
  const safeContributors =
    contributors ?? [];

  const totalAbsContribution =
    safeContributors.reduce(
      (sum, contributor) =>
        sum +
        Math.abs(
          Number(
            contributor.contribution
          ) || 0
        ),
      0
    );

  return [...safeContributors]
    .sort(
      (a, b) =>
        b.contribution -
        a.contribution
    )
    .map((contributor) => {

      const schemaKey =
        FEATURE_TO_SCHEMA_KEY[
          contributor.feature
        ] || contributor.feature;

      return {
        feature:
          contributor.feature,

        label:
          labelForFeature(
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
                ) /
                totalAbsContribution
              ) *
              100,

        savedValue:
          formatSavedValue(
            schemaKey,
            originalInputs?.[schemaKey]
          ),
      };
    });
}


/* =========================================================
   Determine whether a hypothetical
   scenario is actually different
========================================================= */

function inputsHaveChanged(
  originalInputs,
  hypotheticalInputs
) {
  if (
    !originalInputs ||
    !hypotheticalInputs
  ) {
    return false;
  }

  const changeableKeys =
    Object.keys(
      CHANGEABLE_RISK_FACTORS
    );

  return changeableKeys.some(
    (key) => {
      const originalValue =
        originalInputs[key];

      const hypotheticalValue =
        hypotheticalInputs[key];

      return (
        String(
          originalValue ?? ""
        ) !==
        String(
          hypotheticalValue ?? ""
        )
      );
    }
  );
}

/* =========================================================
   Build comparison insights
========================================================= */

function buildInsights({
  currentScore,
  previousAssessment,
  currentInputs,
  currentContributors,
}) {
  if (!previousAssessment) {
    return [];
  }

  const insights = [];

  /* -------------------------------------------------------
     Overall risk score
  ------------------------------------------------------- */

  const previousScore =
    Number(previousAssessment.risk_score);

  const currentRiskScore =
    Number(currentScore);

  if (
    Number.isFinite(previousScore) &&
    Number.isFinite(currentRiskScore) &&
    previousScore !== currentRiskScore
  ) {
    const improved =
      currentRiskScore < previousScore;

    insights.push({
      key: "overall-risk-score",

      text:
        `Overall risk score ${
          improved
            ? "decreased"
            : "increased"
        } from ${previousScore.toFixed(1)}% to ${currentRiskScore.toFixed(1)}%.`,

      positive: improved,
    });
  }


  /* -------------------------------------------------------
     Factor comparisons

     Green/red is determined by whether that feature's
     model contribution to estimated risk decreased or
     increased between the two assessments.
  ------------------------------------------------------- */

  const previousContributors =
    previousAssessment.top_contributors ?? [];

  const previousContributorMap =
    new Map(
      previousContributors.map(
        (contributor) => [
          contributor.feature,
          contributor,
        ]
      )
    );


  const factorInsights =
    (currentContributors ?? [])
      .map((currentContributor) => {

        const previousContributor =
          previousContributorMap.get(
            currentContributor.feature
          );

        if (!previousContributor) {
          return null;
        }


        const schemaKey =
          FEATURE_TO_SCHEMA_KEY[
            currentContributor.feature
          ] ||
          currentContributor.feature;


        const currentValue =
          currentInputs?.[
            schemaKey
          ];

        const previousValue =
          previousAssessment.inputs?.[
            schemaKey
          ];


        /* Can't compare missing or unchanged values */

        if (
          currentValue === null ||
          currentValue === undefined ||
          previousValue === null ||
          previousValue === undefined ||
          String(currentValue) ===
            String(previousValue)
        ) {
          return null;
        }


        const currentContribution =
          Number(
            currentContributor.contribution
          );

        const previousContribution =
          Number(
            previousContributor.contribution
          );


        if (
          !Number.isFinite(
            currentContribution
          ) ||
          !Number.isFinite(
            previousContribution
          ) ||
          currentContribution ===
            previousContribution
        ) {
          return null;
        }


        const contributionImproved =
          currentContribution <
          previousContribution;


        const currentDisplay =
          formatSavedValue(
            schemaKey,
            currentValue
          );

        const previousDisplay =
          formatSavedValue(
            schemaKey,
            previousValue
          );


        return {
          key:
            currentContributor.feature,

          text:
            `${labelForFeature(
              currentContributor.feature
            )} changed from ${previousDisplay} to ${currentDisplay}.`,

          positive:
            contributionImproved,

          magnitude:
            Math.abs(
              currentContribution -
              previousContribution
            ),
        };
      })
      .filter(Boolean)
      .sort(
        (a, b) =>
          b.magnitude -
          a.magnitude
      );


  insights.push(
    ...factorInsights
  );

  return insights;
}


/* =========================================================
   ViewModel
========================================================= */

export function useDashboardViewModel() {

  const {
    riskScore: contextRiskScore,
    setRiskScore,
    topContributors: contextTopContributors,
    setTopContributors,
    riskInputs: contextRiskInputs,
    setRiskInputs,
    setRiskCalculationId,
    selectedCalculation
  } = useContext(RiskContext);

  const { isAuthenticated, accessToken } = useContext(AuthContext);

  const location = useLocation();
  const fromHistory = Boolean(selectedCalculation);
  const calculationId = selectedCalculation?.riskcalc_id;
  const riskScore = selectedCalculation?.risk_score ?? contextRiskScore;
  const topContributors = selectedCalculation?.top_contributors ?? contextTopContributors;
  const riskInputs = selectedCalculation?.inputs ?? contextRiskInputs;
  const contributors = topContributors ?? [];
  const originalInputsRef = useRef(riskInputs);
  const [trendResponse, setTrendResponse] = useState(null);
  const [trendRetry, setTrendRetry] = useState(0);
  const trendKey = `${accessToken}:${location.key}:${trendRetry}`;
  // Stable identity: EditAssessmentModal relies on this staying the same
  // function across renders when it's passed in as an effect dependency
  // (an unstable one would re-fire that effect and refetch on every
  // unrelated render instead of once per save).
  const retryTrend = useCallback(
    () => setTrendRetry((value) => value + 1),
    []
  );
  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;
    let cancelled = false;
    getRiskCalculationHistory(accessToken).then((history) => {
      if (!Array.isArray(history)) throw new Error("Invalid history response");
      if (!cancelled) setTrendResponse({ key: trendKey, history });
    }).catch(() => {
      if (!cancelled) setTrendResponse({ key: trendKey, error: "Couldn't load risk history." });
    });
    return () => { cancelled = true; };
  }, [isAuthenticated, accessToken, trendKey]);
  const [latestRequest, setLatestRequest] = useState(null);
  const isLoadingAssessment = isAuthenticated && !fromHistory && latestRequest?.token !== accessToken;
  const assessmentError = !fromHistory && latestRequest?.token === accessToken
    ? latestRequest.error : "";

  /* =========================================================
    Previous assessment for Insights
  ========================================================= */

  // Distinguishes "history hasn't loaded yet" from "loaded, and there
  // genuinely isn't a previous entry" - both would otherwise collapse to
  // an empty `history` and briefly show the wrong Insights message.
  const isHistoryLoaded =
    trendResponse?.key === trendKey;

  const history =
    isHistoryLoaded
      ? trendResponse.history ?? []
      : [];


  /*
  * History is newest -> oldest.
  *
  * If we're viewing the latest assessment:
  *   current = history[0]
  *   previous = history[1]
  *
  * If we're viewing an older saved calculation:
  *   find that calculation and use the one
  *   immediately after it in the array.
  */

  const currentHistoryIndex =
    fromHistory
      ? history.findIndex(
          (calculation) =>
            calculation.riskcalc_id ===
            calculationId
        )
      : 0;


  const previousHistoryEntry =
    currentHistoryIndex >= 0
      ? history[
          currentHistoryIndex + 1
        ] ?? null
      : null;


  const previousCalculationId =
    previousHistoryEntry?.riskcalc_id ??
    null;

    const [
      previousAssessmentResponse,
      setPreviousAssessmentResponse,
    ] = useState(null);

    useEffect(() => {

      if (
        !isAuthenticated ||
        !accessToken ||
        !previousCalculationId
      ) {
        setPreviousAssessmentResponse(
          null
        );

        return;
      }


      let cancelled = false;


      getRiskCalculation(
        accessToken,
        previousCalculationId
      )
        .then((result) => {

          if (cancelled) {
            return;
          }

          setPreviousAssessmentResponse({
            id:
              previousCalculationId,

            assessment:
              result,

            error:
              "",
          });

        })

        .catch(() => {

          if (cancelled) {
            return;
          }

          setPreviousAssessmentResponse({
            id:
              previousCalculationId,

            assessment:
              null,

            error:
              "Couldn't load your previous assessment.",
          });

        });


      return () => {
        cancelled = true;
      };

    }, [
      isAuthenticated,
      accessToken,
      previousCalculationId,
    ]);

    const previousAssessment =
      previousAssessmentResponse?.id ===
        previousCalculationId
        ? previousAssessmentResponse.assessment
        : null;


    const isLoadingInsights =
      isAuthenticated &&
      (
        !isHistoryLoaded ||
        (
          Boolean(previousCalculationId) &&
          previousAssessmentResponse?.id !==
            previousCalculationId
        )
      );


    const insightsError =
      previousAssessmentResponse?.id ===
        previousCalculationId
        ? previousAssessmentResponse.error
        : "";


    const insights =
      buildInsights({
        currentScore:
          riskScore,

        previousAssessment,

        currentInputs:
          riskInputs,

        currentContributors:
          contributors,
      });


  /* =======================================================
     Load the user's most recent saved assessment on mount
  ======================================================== */

  // A logged-in user should see their most recent evaluation on the
  // dashboard even if they didn't just submit one this session (e.g. they
  // logged back in later, or navigated here directly). The account's
  // stored history is the source of truth once logged in, so this always
  // re-syncs on mount/auth-change rather than only filling in a gap - that
  // also means switching accounts can't leak the previous user's score.
  useEffect(() => {
    if (!isAuthenticated || fromHistory) return;

    let cancelled = false;
    getLatestPrediction(accessToken)
      .then((result) => {
          if (cancelled) return;
          setLatestRequest({ token: accessToken, error: "", timestamp: result.riskcalc_timestamp });
          if (!result.has_history) {
            setRiskScore(null);
            setTopContributors([]);
            setRiskInputs(createInitalRiskInputs(riskInputSchema));
            setRiskCalculationId(null);
            return;
          }
        setRiskScore(result.risk_score);
        setTopContributors(result.top_contributors ?? []);

        // Powers the what-if sliders' starting values and the "saved
        // value" shown next to each factor - without this they'd default
        // to each slider's minimum instead of what the user actually
        // submitted, for anyone who didn't just come from the input form
        // in this same browser session (e.g. a returning visit).
        setRiskInputs(result.inputs ?? createInitalRiskInputs(riskInputSchema));

        // Lets "Edit original assessment" update this exact row instead
        // of inserting a new one.
        setRiskCalculationId(result.riskcalc_id ?? null);
      })
      .catch(() => {
        if (!cancelled) setLatestRequest({ token: accessToken, error: "Couldn't load your assessment. Please refresh to try again." });
      });

    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    accessToken,
    fromHistory,
    setRiskScore,
    setTopContributors,
    setRiskInputs,
    setRiskCalculationId,
  ]);

  /* =======================================================
     Hypothetical inputs
  ======================================================== */

  const [
    hypotheticalInputs,
    setHypotheticalInputs,
  ] = useState(riskInputs);


  const [
    hypotheticalScore,
    setHypotheticalScore,
  ] = useState(null);


  const [
    hypotheticalContributors,
    setHypotheticalContributors,
  ] = useState([]);


  const [
    isCalculatingHypothetical,
    setIsCalculatingHypothetical,
  ] = useState(false);
  const [hypotheticalError, setHypotheticalError] = useState("");
  const hypotheticalRequestRef = useRef(0);
  const hypotheticalInputsRef = useRef(riskInputs);


  /* =======================================================
     When a new original assessment is submitted,
     reset the hypothetical scenario
  ======================================================== */

  useEffect(() => {

    hypotheticalRequestRef.current += 1;
    hypotheticalInputsRef.current = riskInputs;
    setIsCalculatingHypothetical(false);
    setHypotheticalError("");
    originalInputsRef.current =
      riskInputs;

    setHypotheticalInputs(
      riskInputs
    );

    setHypotheticalScore(null);

    setHypotheticalContributors([]);

    return () => { hypotheticalRequestRef.current += 1; };
  }, [riskInputs]);


  /* =======================================================
     Original risk factors
  ======================================================== */

  const riskFactors =
    buildRiskFactors(
      contributors,
      originalInputsRef.current
    );


  /* =======================================================
     Update hypothetical value
  ======================================================== */

  const updateHypotheticalInput =
    async (
      feature,
      value
    ) => {

      const requestId = ++hypotheticalRequestRef.current;
      setHypotheticalError("");
      const schemaKey =
        FEATURE_TO_SCHEMA_KEY[
          feature
        ] || feature;


      const updatedInputs = {
        ...hypotheticalInputsRef.current,

        [schemaKey]: value,
      };
      hypotheticalInputsRef.current = updatedInputs;


      setHypotheticalInputs(
        updatedInputs
      );


      /*
       * If the user returns the
       * factor to its original value,
       * return to the original chart.
       */

      if (
        !inputsHaveChanged(
          originalInputsRef.current,
          updatedInputs
        )
      ) {

        setHypotheticalScore(
          null
        );

        setHypotheticalContributors(
          []
        );
        setIsCalculatingHypothetical(false);

        return;
      }


      setIsCalculatingHypothetical(
        true
      );


      try {

        const payload =
          buildPredictionPayload(
            updatedInputs,
            riskInputSchema
          );


        const result =
          await predictRisk(
            payload
          );

        if (requestId !== hypotheticalRequestRef.current) return;

        setHypotheticalScore(
          result.risk_score
        );


        setHypotheticalContributors(
          result.top_contributors ??
            []
        );

      } catch (error) {

        if (requestId !== hypotheticalRequestRef.current) return;
        setHypotheticalError("Couldn't update this contribution. Adjust the slider to try again.");
        console.error(
          "Hypothetical prediction failed:",
          error
        );

      } finally {

        if (requestId === hypotheticalRequestRef.current) {
          setIsCalculatingHypothetical(false);
        }

      }
    };


  /* =======================================================
     Hypothetical risk factors
  ======================================================== */

  const hypotheticalRiskFactors =
    buildRiskFactors(
      hypotheticalContributors
    );


  /* =======================================================
     Is the hypothetical scenario active?
  ======================================================== */

  const isHypotheticalActive =
    inputsHaveChanged(
      originalInputsRef.current,
      hypotheticalInputs
    );


  /* =======================================================
     Reset hypothetical scenario
  ======================================================== */

  const resetHypothetical = () => {

    hypotheticalRequestRef.current += 1;
    hypotheticalInputsRef.current = originalInputsRef.current;
    setIsCalculatingHypothetical(false);
    setHypotheticalError("");
    setHypotheticalInputs(
      originalInputsRef.current
    );

    setHypotheticalScore(null);

    setHypotheticalContributors([]);
  };


  /* =======================================================
     Return values to Dashboard
  ======================================================== */

  return {
    isAuthenticated,
    trendData: isAuthenticated && trendResponse?.key === trendKey
      ? buildRiskTrend(trendResponse.history ?? [], fromHistory ? calculationId : null, latestRequest?.timestamp)
      : [],
    isLoadingTrend: isAuthenticated && trendResponse?.key !== trendKey,
    trendError: trendResponse?.key === trendKey ? trendResponse.error : "",
    retryTrend,
    isLoadingAssessment,
    assessmentError,

    /* Original assessment */

    displayScore:
      riskScore,

    riskFactors,

    originalInputs:
      originalInputsRef.current,


    /* Hypothetical assessment */

    hypotheticalScore,

    hypotheticalInputs,

    hypotheticalRiskFactors,


    /* State */

    isHypotheticalActive,

    isCalculatingHypothetical,
    hypotheticalError,


    /* Controls */

    changeableRiskFactors:
      CHANGEABLE_RISK_FACTORS,

    updateHypotheticalInput,

    resetHypothetical,

    /* Insights */

    insights,

    isLoadingInsights,

    insightsError,

    hasPreviousAssessment:
      Boolean(
        previousCalculationId
      ),
  };
}
