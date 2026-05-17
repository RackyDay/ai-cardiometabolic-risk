import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RiskContext } from "../RiskContext";

export function useInputViewModel() {
    
    const [formData, setFormData] = useState({
    gender: "",
    age: "",
    education: "",
    currentSmoker: "",
    cigsPerDay: "",
    BPMeds: "",
    prevalentStroke: "",
    prevalentHyp: "",
    sysBP: "",
    diaBP: "",
    BMI: "",
    heartRate: "",
    glucose: "",
    });

    const [page, setPage] = useState(1);
    const navigate = useNavigate();
    const [errors, setErrors] = useState({});
    const { setRiskInputs } = useContext(RiskContext);
    const pageFields = {
        1: ["gender", "age", "education", "currentSmoker", "cigsPerDay"],
        2: ["BPMeds", "prevalentStroke", "prevalentHyp", "sysBP", "diaBP"],
        3: ["BMI", "heartRate", "glucose"],
    };
    const optionalFields = ["education", "cigsPerDay"];

    useEffect(() => {
        document.body.style.background = "#dde6f8";
        return () => {
        document.body.style.background = "";
        };
    }, []);

    const validateField = (field, value) => {
        if (!value && value !== "0") {
        if (optionalFields.includes(field)) return "";
        return "This field is required";
        }

        if (field === "age") {
        const n = parseFloat(value);
        if (isNaN(n) || n < 1 || n > 150) return "Age must be between 1 and 150";
        }
        if (field === "cigsPerDay") {
        const n = parseFloat(value);
        if (formData.currentSmoker === "1" && (isNaN(n) || n < 0 || n > 500))
            return "Must be a valid number between 0 and 500";
        }
        if (field === "sysBP") {
        const n = parseFloat(value);
        if (isNaN(n) || n < 70 || n > 300) return "Systolic BP must be between 70 and 300";
        }
        if (field === "diaBP") {
        const n = parseFloat(value);
        if (isNaN(n) || n < 40 || n > 200) return "Diastolic BP must be between 40 and 200";
        }
        if (field === "BMI") {
        const n = parseFloat(value);
        if (isNaN(n) || n < 10 || n > 60) return "BMI must be between 10 and 60";
        }
        if (field === "heartRate") {
        const n = parseFloat(value);
        if (isNaN(n) || n < 30 || n > 200) return "Heart rate must be between 30 and 200";
        }
        if (field === "glucose") {
        const n = parseFloat(value);
        if (isNaN(n) || n < 50 || n > 500) return "Glucose must be between 50 and 500";
        }
        return "";
    };

    const set = (field) => (e) => {
        const value = e.target.value;
        setFormData((prev) => ({ ...prev, [field]: value }));
        const error = validateField(field, value);
        setErrors((prev) => ({ ...prev, [field]: error }));
    };

    const handleSubmit = () => {
        const newErrors = {};
        Object.keys(formData).forEach((field) => {
        const error = validateField(field, formData[field]);
        if (error) newErrors[field] = error;
        });

        if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        const firstErrorPage = [1, 2, 3].find((p) =>
            pageFields[p].some((f) => newErrors[f])
        );
        if (firstErrorPage) setPage(firstErrorPage);
        return;
        }

        const sanitized = { ...formData };
        optionalFields.forEach((field) => {
        if (sanitized[field] === "") sanitized[field] = null;
        });

        setRiskInputs(sanitized);
        navigate("/dashboard");
    };

    return {formData, errors, set, page, setPage, handleSubmit};
}