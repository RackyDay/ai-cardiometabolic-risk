/*

import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RiskContext } from "./RiskContext";
import Dropdown from "../components/Dropdown";
import InputTextField from "../components/InputTextField";
import "../styles/inputs.css";

const GENDER_OPTIONS = [
  { value: "M", label: "Male" },
  { value: "F", label: "Female" },
  { value: "O", label: "Prefer not to say" },
];
const EDUCATION_OPTIONS = [
  { value: "1", label: "Some High School" },
  { value: "2", label: "High School / GED" },
  { value: "3", label: "Some College / Vocational" },
  { value: "4", label: "College Graduate" },
];
const YES_NO = [
  { value: "1", label: "Yes" },
  { value: "0", label: "No" },
];

function HeartECGIcon() {
  return (
    <svg width="46" height="46" viewBox="0 0 46 46" fill="none">
      <rect width="46" height="46" rx="10" fill="#3d6fd4" />
      <path
        d="M23 36c-1 0-14-9.5-14-18.5a8 8 0 0116 0 8 8 0 0116 0C41 26.5 28 36 27 36h-4z"
        fill="white"
      />
      <polyline
        points="9,23 13,23 15,17 17,29 19.5,21 22,25 24,23 37,23"
        stroke="#3d6fd4"
        strokeWidth="2"
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#1a1a2e"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="15" stroke="#1a1a2e" strokeWidth="1.5" />
      <circle cx="16" cy="13" r="5" stroke="#1a1a2e" strokeWidth="1.5" />
      <path
        d="M5 28c0-6 4.9-11 11-11s11 4.9 11 11"
        stroke="#1a1a2e"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}


function InputPage() {
  const navigate = useNavigate();
  const { setRiskInputs } = useContext(RiskContext);
  const [page, setPage] = useState(1);
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
  const [errors, setErrors] = useState({});

  useEffect(() => {
    document.body.style.background = "#dde6f8";
    return () => {
      document.body.style.background = "";
    };
  }, []);

  const optionalFields = ["education", "cigsPerDay"];

  const pageFields = {
    1: ["gender", "age", "education", "currentSmoker", "cigsPerDay"],
    2: ["BPMeds", "prevalentStroke", "prevalentHyp", "sysBP", "diaBP"],
    3: ["BMI", "heartRate", "glucose"],
  };

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

  return (
    <div className="inputs-page">
      <header className="inputs-header">
        <div className="header-brand">
          <HeartECGIcon />
        </div>
        <span className="header-title">CVD Calculator</span>
        <div className="header-actions">
          <button className="icon-btn" aria-label="Settings">
            <GearIcon />
          </button>
          <button className="icon-btn" aria-label="Profile">
            <UserIcon />
          </button>
        </div>
      </header>

      <div className="page-body">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ‹ Back
        </button>

        <div className="form-card">
          {page === 1 && (
            <>
              <Dropdown
                label="What is your gender?"
                value={formData.gender}
                onChange={set("gender")}
                options={GENDER_OPTIONS}
                error={errors.gender}
              />
              <InputTextField
                label="How old are you?"
                value={formData.age}
                onChange={set("age")}
                min={1}
                error={errors.age}
              />
              <Dropdown
                label="What is the highest level of education you've completed?"
                value={formData.education}
                onChange={set("education")}
                options={EDUCATION_OPTIONS}
                error={errors.education}
                required={false}
              />
              <Dropdown
                label="Do you smoke?"
                value={formData.currentSmoker}
                onChange={set("currentSmoker")}
                options={YES_NO}
                error={errors.currentSmoker}
              />
              <InputTextField
                label="How many cigarettes do you smoke in a day?"
                value={formData.cigsPerDay}
                onChange={set("cigsPerDay")}
                min={0}
                error={errors.cigsPerDay}
                required={false}
              />
            </>
          )}

          {page === 2 && (
            <>
              <Dropdown
                label="Do you take any blood pressure medication?"
                value={formData.BPMeds}
                onChange={set("BPMeds")}
                options={YES_NO}
                error={errors.BPMeds}
              />
              <Dropdown
                label="Have you ever had a stroke?"
                value={formData.prevalentStroke}
                onChange={set("prevalentStroke")}
                options={YES_NO}
                error={errors.prevalentStroke}
              />
              <Dropdown
                label="Do you have hypertension?"
                value={formData.prevalentHyp}
                onChange={set("prevalentHyp")}
                options={YES_NO}
                error={errors.prevalentHyp}
              />
              <InputTextField
                label="Systolic blood pressure"
                value={formData.sysBP}
                onChange={set("sysBP")}
                min={0}
                error={errors.sysBP}
              />
              <InputTextField
                label="Diastolic blood pressure"
                value={formData.diaBP}
                onChange={set("diaBP")}
                min={0}
                error={errors.diaBP}
              />
            </>
          )}

          {page === 3 && (
            <>
              <InputTextField
                label="BMI (Body Mass Index)"
                value={formData.BMI}
                onChange={set("BMI")}
                min={0}
                step={0.1}
                error={errors.BMI}
              />
              <InputTextField
                label="Average heart rate"
                value={formData.heartRate}
                onChange={set("heartRate")}
                min={0}
                error={errors.heartRate}
              />
              <InputTextField
                label="Glucose level"
                value={formData.glucose}
                onChange={set("glucose")}
                min={0}
                error={errors.glucose}
              />
              <div className="submit-wrapper">
                <button className="submit-btn" onClick={handleSubmit}>
                  Submit
                </button>
              </div>
            </>
          )}

          <nav className="pagination">
            <button
              className="page-nav-btn"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
            >
              ← Previous
            </button>
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                className={`page-num-btn${page === n ? " active" : ""}`}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ))}
            <button
              className="page-nav-btn"
              onClick={() => setPage((p) => p + 1)}
              disabled={page === 3}
            >
              Next →
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}


export default InputPage;

*/
