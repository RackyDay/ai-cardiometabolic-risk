import {
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { RiskContext } from "../../context/RiskContext";
import { AuthContext } from "../../context/AuthContext";
import { riskInputSchema } from "../../schemas/riskInputSchema";
import { getLatestPrediction, getRiskCalculationHistory, predictRisk } from "../../services/api";
import { buildRiskTrend } from "./buildRiskTrend";
import { buildPieData } from "./buildPieData";
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
   ViewModel
========================================================= */

export function useDashboardViewModel() {

  const {
    riskScore: contextRiskScore,
    setRiskScore,
    topContributors: contextTopContributors,
    setTopContributors,
    riskInputs: contextRiskInputs,
    selectedCalculation,
    hasFreshCalculation,
  } = useContext(RiskContext);

  const { isAuthenticated, accessToken } = useContext(AuthContext);

  const location = useLocation();
  const fromHistory = Boolean(selectedCalculation);
  const calculationId = selectedCalculation?.riskcalc_id;
  const riskScore = selectedCalculation?.risk_score ?? contextRiskScore;
  const topContributors = selectedCalculation?.top_contributors ?? contextTopContributors;
  const riskInputs = selectedCalculation?.inputs ?? contextRiskInputs;
  const [trendResponse, setTrendResponse] = useState(null);
  const [trendRetry, setTrendRetry] = useState(0);
  const trendKey = `${accessToken}:${location.key}:${trendRetry}`;
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


  const contributors =
    topContributors ?? [];


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
          setLatestRequest({ token: accessToken, error: "", timestamp: result.riskcalc_timestamp, hasHistory: result.has_history });
          if (!result.has_history) {
            setRiskScore(null);
            setTopContributors([]);
            return;
          }
        setRiskScore(result.risk_score);
        setTopContributors(result.top_contributors ?? []);
      })
      .catch(() => {
        if (!cancelled) setLatestRequest({ token: accessToken, error: "Couldn't load your assessment. Please refresh to try again." });
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, accessToken, fromHistory, setRiskScore, setTopContributors]);


  /* =======================================================
     Keep the user's original assessment untouched
  ======================================================== */

  const originalInputsRef =
    useRef(riskInputs);


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

  

  const pieData =
    buildPieData(
      riskFactors
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


  const hypotheticalPieData =
    buildPieData(
      hypotheticalRiskFactors,
      riskFactors
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

  const loadedHistory = trendResponse?.key === trendKey ? trendResponse.history : null;
  const latestIndex = loadedHistory?.findIndex(
    (item) => item.riskcalc_timestamp === latestRequest?.timestamp
  ) ?? -1;
  const pastAssessment = selectedCalculation ?? (
    isAuthenticated && !hasFreshCalculation && latestRequest?.token === accessToken &&
    latestRequest.hasHistory && latestIndex !== -1
      ? { calculationNumber: loadedHistory.length - latestIndex,
          riskcalc_timestamp: latestRequest.timestamp }
      : null
  );

  return {
    pastCalculation: pastAssessment ? {
      number: pastAssessment.calculationNumber,
      date: new Date(pastAssessment.riskcalc_timestamp).toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    } : null,
    isAuthenticated,
    trendData: isAuthenticated && trendResponse?.key === trendKey
      ? buildRiskTrend(trendResponse.history ?? [], fromHistory ? calculationId : null, latestRequest?.timestamp)
      : [],
    isLoadingTrend: isAuthenticated && trendResponse?.key !== trendKey,
    trendError: trendResponse?.key === trendKey ? trendResponse.error : "",
    retryTrend: () => setTrendRetry((value) => value + 1),
    isLoadingAssessment,
    assessmentError,

    /* Original assessment */

    displayScore:
      riskScore,

    riskFactors,

    pieData,

    originalInputs:
      originalInputsRef.current,


    /* Hypothetical assessment */

    hypotheticalScore,

    hypotheticalInputs,

    hypotheticalPieData,

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
  };
}
