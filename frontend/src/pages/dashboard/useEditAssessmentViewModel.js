import { useContext, useState } from "react";
import { RiskContext } from "../../context/RiskContext";
import { AuthContext } from "../../context/AuthContext";
import { MG_DL, canonicalToDisplay, getDisplayUnit } from "../../utils/unitConversion";
import { riskInputSchema } from "../../schemas/riskInputSchema";
import { buildPredictionPayload } from "../input/riskInputTransform";
import { editRiskCalculation, predictRisk } from "../../services/api";


export function useEditAssessmentViewModel() {

    const {
        riskInputs,
        setRiskInputs,
        setRiskScore,
        setTopContributors,
        riskCalculationId,
        setRiskCalculationId,
        selectedCalculation,
    } = useContext(RiskContext);

    const { accessToken } = useContext(AuthContext);

    // Whichever assessment is actually on screen right now: the one
    // selected from history, or the current/latest one tracked separately.
    const calculationId = selectedCalculation?.riskcalc_id ?? riskCalculationId;

    const [draftInputs, setDraftInputs] = useState(riskInputs);
    const [errors, setErrors] = useState({});
    const [page, setPage] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [saveSuccess, setSaveSuccess] = useState(false);
    // Each convertible question picks its own display unit independently,
    // same as the input form - unrelated to the dashboard's unit setting.
    const [fieldUnits, setFieldUnits] = useState({});
    const setFieldUnit = (field) => (unit) =>
        setFieldUnits((prev) => ({ ...prev, [field]: unit }));

    const categories = Object.entries(riskInputSchema).reduce(
        (acc, [key, field]) => {
            if (!acc[field.category]) {
                acc[field.category] = [];
            }

            acc[field.category].push({
                name: key, ...field
            });

            return acc;
        }, {}
    );

    const pageOrder = Object.keys(categories);

    // Same validation rules as the original input form.
    const validateField = (field, value) => {

        const riskField = riskInputSchema[field];

        if (value === null || value === undefined || value === "") {
            if (riskField.required) {
                return "This field is required";
            }
            if (!riskField.required) {
                return "";
            }
        }

        if (riskField.type === "number") {
            const cleaned_n = String(value).trim();

            if (/[eE]/.test(cleaned_n)) {
                return riskField.print_name + " must be a valid number";
            }

            const n = Number(value);
            if (isNaN(n)) {
                return riskField.print_name + " must be a valid number";
            }

            if (!riskField.decimal) {
                if (n % 1 !== 0) {
                    return riskField.print_name + " must be an integer";
                }
            }

            if (n < riskField.min || n > riskField.max) {
                // Compare in mg/dL (canonical) but word the message in this
                // field's own display unit, not any other field's.
                const displayUnit = getDisplayUnit(riskField, fieldUnits[field] || MG_DL);
                const factor = riskField.mmolConversionFactor;
                const displayMin = canonicalToDisplay(riskField.min, displayUnit, factor);
                const displayMax = canonicalToDisplay(riskField.max, displayUnit, factor);
                return riskField.print_name + " must be between " + displayMin + " and " + displayMax;
            }
        }
        return "";
    };

    const set = (field) => (value) => {

    setDraftInputs((prev) => {

        const updatedInputs = {
            ...prev,
            [field]: value,
        };

        // If smoker status is changed to No,
        // automatically reset cigarettes per day to 0.
        if (
            field === "currentSmoker" &&
            value === false
        ) {
            updatedInputs.cigsPerDay = 0;
        }

        return updatedInputs;
    });


    const error =
            validateField(field, value);


        setErrors((prev) => {

            const updatedErrors = {
                ...prev,
                [field]: error,
            };

            if (
                field === "currentSmoker" &&
                value === false
            ) {
                updatedErrors.cigsPerDay = "";
            }

            return updatedErrors;
        });
    };


    const isDirty = Object.keys(draftInputs).some(
        (field) => draftInputs[field] !== riskInputs[field]
    );

    const handleSave = async () => {
        const newErrors = {};
        Object.keys(draftInputs).forEach((field) => {
            const error = validateField(field, draftInputs[field]);
            if (error) newErrors[field] = error;
        });

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            const firstErrorIndex = pageOrder.findIndex((category) =>
                categories[category].some((field) => newErrors[field.name]));
            if (firstErrorIndex !== -1) setPage(firstErrorIndex);
            return;
        }

        setSubmitError("");
        setIsSubmitting(true);

        try {
            const payload = buildPredictionPayload(draftInputs, riskInputSchema);

            // Update the existing row in place when we know which one
            // that is - otherwise (anonymous session, nothing saved yet)
            // fall back to a plain prediction, same as before. Either
            // way this needs the access token: without it, an
            // authenticated request would hit /predict as anonymous and
            // the edit would silently vanish on next load.
            const result = calculationId
                ? await editRiskCalculation(accessToken, calculationId, payload)
                : await predictRisk(payload, accessToken);

            // Only now does the draft become the actual saved assessment.
            setRiskInputs(draftInputs);
            setRiskScore(result.risk_score);
            setTopContributors(result.top_contributors);
            setRiskCalculationId(result.riskcalc_id ?? null);

            setSaveSuccess(true);
        } catch (err) {
            setSubmitError("We couldn't save your changes. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        draftInputs,
        errors,
        set,
        categories,
        pageOrder,
        page,
        setPage,
        handleSave,
        isSubmitting,
        submitError,
        isDirty,
        saveSuccess,
        fieldUnits,
        setFieldUnit,
    };
}