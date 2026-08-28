import {
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { RiskContext } from "../../context/RiskContext";
import { riskInputSchema } from "../../schemas/riskInputSchema";
import { predictRisk } from "../../services/api";
import { buildPredictionPayload } from "../input/riskInputTransform";

import { CHANGEABLE_RISK_FACTORS } from "./changeableRiskFactors";


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

function buildRiskFactors(contributors) {
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
    .map((contributor) => ({
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
    }));
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
    topContributors,
    riskInputs,
  } = useContext(RiskContext);


  const contributors =
    topContributors ?? [];


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
      contributors
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

    /* Original assessment */

    displayScore:
      riskScore ?? 50,

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