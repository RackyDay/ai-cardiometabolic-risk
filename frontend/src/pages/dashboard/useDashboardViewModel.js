import {
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { RiskContext } from "../../context/RiskContext";
import { AuthContext } from "../../context/AuthContext";
import { riskInputSchema } from "../../schemas/riskInputSchema";
import { getLatestPrediction, predictRisk } from "../../services/api";
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
   Build pie chart data
========================================================= */

function buildPieData(riskFactors) {
  return riskFactors.map(
    (factor) => ({
      name: factor.label,
      value: factor.weightPercent,
      raisesRisk:
        factor.raisesRisk,
    })
  );
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
    riskScore,
    setRiskScore,
    topContributors,
    setTopContributors,
    riskInputs,
  } = useContext(RiskContext);

  const { isAuthenticated, accessToken } = useContext(AuthContext);

  const location = useLocation();
  const fromHistory = location?.state?.fromHistory;
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
          setLatestRequest({ token: accessToken, error: "" });
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


  /* =======================================================
     When a new original assessment is submitted,
     reset the hypothetical scenario
  ======================================================== */

  useEffect(() => {

    originalInputsRef.current =
      riskInputs;

    setHypotheticalInputs(
      riskInputs
    );

    setHypotheticalScore(null);

    setHypotheticalContributors([]);

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

      const schemaKey =
        FEATURE_TO_SCHEMA_KEY[
          feature
        ] || feature;


      const updatedInputs = {
        ...hypotheticalInputs,

        [schemaKey]: value,
      };


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


        setHypotheticalScore(
          result.risk_score
        );


        setHypotheticalContributors(
          result.top_contributors ??
            []
        );

      } catch (error) {

        console.error(
          "Hypothetical prediction failed:",
          error
        );

      } finally {

        setIsCalculatingHypothetical(
          false
        );

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
      hypotheticalRiskFactors
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


    /* Controls */

    changeableRiskFactors:
      CHANGEABLE_RISK_FACTORS,

    updateHypotheticalInput,

    resetHypothetical,
  };
}
