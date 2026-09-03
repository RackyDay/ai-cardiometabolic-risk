import { useContext, useState } from "react";
import { RiskContext } from "../../context/RiskContext";
import { riskInputSchema } from "../../schemas/riskInputSchema";
import { buildPredictionPayload } from "../input/riskInputTransform";
import { predictRisk } from "../../services/api";


export function useEditAssessmentViewModel() {

    const {
        riskInputs,
        setRiskInputs,
        setRiskScore,
        setTopContributors,
    } = useContext(RiskContext);

    const [draftInputs, setDraftInputs] = useState(riskInputs);
    const [errors, setErrors] = useState({});
    const [page, setPage] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [saveSuccess, setSaveSuccess] = useState(false);

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
                return riskField.print_name + " must be between " + riskField.min + " and " + riskField.max;
            }
        }
        return "";
    };

    const set = (field) => (value) => {
        setDraftInputs((prev) => ({ ...prev, [field]: value }));
        const error = validateField(field, value);
        setErrors((prev) => ({ ...prev, [field]: error }));
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
            const result = await predictRisk(payload);

            // Only now does the draft become the actual saved assessment.
            setRiskInputs(draftInputs);
            setRiskScore(result.risk_score);
            setTopContributors(result.top_contributors);

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
    };
}