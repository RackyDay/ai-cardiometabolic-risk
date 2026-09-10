import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RiskContext } from "../../context/RiskContext";
import { AuthContext } from "../../context/AuthContext";
import { riskInputSchema } from "../../schemas/riskInputSchema";
import { buildPredictionPayload } from "./riskInputTransform";
import { predictRisk } from "../../services/api";

export function useInputViewModel() {

    const navigate = useNavigate();
    const [errors, setErrors] = useState({});
    const { riskInputs, setRiskInputs, setRiskScore, setTopContributors, selectCalculation } = useContext(RiskContext);
    const { accessToken } = useContext(AuthContext);
    const [page, setPage] = useState(0);
    // Tracks the in-flight /predict request so the View can disable the
    // submit button and avoid duplicate submissions.
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");

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
                return riskField.print_name + " must be between " + riskField.min + " and " + riskField.max;
            }
        }
        return "";
    };

    const set = (field) => (value) => {
        setRiskInputs((prev) => ({ ...prev, [field]: value }));
        const error = validateField(field, value);
        setErrors((prev) => ({ ...prev, [field]: error }));
    };

    const handleSubmit = async () => {
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
        setSubmitError("");
        setIsSubmitting(true);

        try {
            const payload = buildPredictionPayload(riskInputs, riskInputSchema);
            const result = await predictRisk(payload, accessToken);
            // Persist the score and its explanation on the shared
            // RiskContext (Model) so DashboardPage can read them after
            // navigation.
            setRiskScore(result.risk_score);
            selectCalculation(null);
            setTopContributors(result.top_contributors);
            navigate("/dashboard");
        } catch {
            // Network failure or a 4xx/5xx from the API — keep the user on
            // this page and surface a generic, non-technical message.
            setSubmitError("We couldn't calculate your risk score. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return {riskInputs, errors, set, categories, pageOrder, page, setPage, handleSubmit, isSubmitting, submitError};
}
