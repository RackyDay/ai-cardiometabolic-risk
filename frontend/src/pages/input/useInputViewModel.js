import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RiskContext } from "../../context/RiskContext";
import { riskInputSchema } from "../../schemas/riskInputSchema";

export function useInputViewModel() {

    const navigate = useNavigate();
    const [errors, setErrors] = useState({});
    const { riskInputs, setRiskInputs } = useContext(RiskContext);
    const [page, setPage] = useState(0);

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

        if (riskField.type === "number") {
            const n = parseFloat(value)
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

    const handleSubmit = () => {
        const newErrors = {};
        Object.keys(riskInputs).forEach((field) => {
        const error = validateField(field, riskInputs[field]);
        if (error) newErrors[field] = error;
        });

        if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        const firstErrorIndex = pageOrder.findIndex((category) =>
            categories[category].some((field) => newErrors[field.name]));
        console.log(firstErrorIndex)
        if (firstErrorIndex !== -1) setPage(firstErrorIndex);
        return;
        }

        navigate("/dashboard");
    };

    return {riskInputs, errors, set, categories, pageOrder, page, setPage, handleSubmit};
}