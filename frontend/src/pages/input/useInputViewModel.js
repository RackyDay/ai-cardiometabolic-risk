import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RiskContext } from "../../context/RiskContext";
import { MG_DL, canonicalToDisplay, getDisplayUnit } from "../../utils/unitConversion";
import { riskInputSchema } from "../../schemas/riskInputSchema";

export function useInputViewModel() {

    const navigate = useNavigate();
    const [errors, setErrors] = useState({});
    const { riskInputs, setRiskInputs, completeModule } = useContext(RiskContext);
    const [page, setPage] = useState(0);
    const [submitError, setSubmitError] = useState("");
    // Each convertible question (glucose, cholesterol) picks its own
    // display unit independently - this is unrelated to the dashboard's
    // app-wide unit setting. Fields not present here default to mg/dL.
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

    const pageOrder = Object.keys(categories)

    useEffect(() => {
        document.body.style.background = "#dde6f8";
        return () => {
        document.body.style.background = "";
        };
    }, []);

    const validateField = (field, value) => {

        const riskField = riskInputSchema[field]

        if (value === null || value === undefined || value === "") {
            if (riskField.required) {
                return "This field is required";
            }
            if (!riskField.required) {
                return ""
            }
        }
        
        // Validate number fields
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
                if (n % 1 !==0) {
                    return riskField.print_name + " must be an integer"
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

        setRiskInputs((prev) => {

            const updatedInputs = {
                ...prev,
                [field]: value,
            };

            // A non-smoker should always have 0 cigarettes per day.
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

            // Clear any old cigarette-count error as well.
            if (
                field === "currentSmoker" &&
                value === false
            ) {
                updatedErrors.cigsPerDay = "";
            }

            return updatedErrors;
        });
    };

    const handleSave = () => {
        const newErrors = {};
        Object.keys(riskInputs).forEach((field) => {
        const error = validateField(field, riskInputs[field]);
        if (error) newErrors[field] = error;
        });

        if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        const firstErrorIndex = pageOrder.findIndex((category) =>
            categories[category].some((field) => newErrors[field.name]));
        if (firstErrorIndex !== -1) setPage(firstErrorIndex);
        return;
        }

        // All fields passed validation above, so it's safe to build the API
        // payload and ask the model for a risk score.
        // All inputs passed validation.
        // Save the module locally without calculating a risk score.
        setSubmitError("");

        completeModule("base-risk", { ...riskInputs });

        navigate("/assessment");
    };

    return {riskInputs, errors, set, categories, pageOrder, page, setPage, handleSave, fieldUnits, setFieldUnit, isSubmitting: false, submitError};
}
