import { useState, useContext } from "react";
import { predictRisk } from "../services/api";
import { RiskContext } from "./RiskContext";
import InputTextField from "../components/InputTextField";
import CheckboxField from "../components/CheckboxField";
import Dropdown from "../components/Dropdown";
import ActionButton from "../components/ActionButton";
import "../styles/inputs.css";

const YES_NO = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
];

const GENDER_OPTIONS = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
];

const EDUCATION_OPTIONS = [
  { label: "Primary school", value: "primary" },
  { label: "High school", value: "high_school" },
  { label: "Undergraduate", value: "undergraduate" },
  { label: "Postgraduate", value: "postgraduate" },
];

const TOTAL_PAGES = 3;

function InputPage() {
  const { riskInputs, setRiskInputs, setRiskScore } = useContext(RiskContext);
  const [page, setPage] = useState(1);

  const handleSubmit = async () => {
    const data = await predictRisk(riskInputs);
    setRiskScore(data.risk_score);
  };

  const update = (field) => (e) =>
    setRiskInputs({ ...riskInputs, [field]: e.target.value });

  return (
    <div className="form">
      <h1>Input Page</h1>

      <div className="inputfields">
        <h2>Risk Calculation Inputs:</h2>

        {page === 1 && (
          <>
            <Dropdown
              label="What is your gender?"
              value={riskInputs.gender ?? ""}
              onChange={update("gender")}
              options={GENDER_OPTIONS}
            />
            <InputTextField
              label="How old are you?"
              placeholder="Age"
              value={riskInputs.age}
              onChange={update("age")}
            />
            <Dropdown
              label="What is the highest level of education you've completed?"
              value={riskInputs.education ?? ""}
              onChange={update("education")}
              options={EDUCATION_OPTIONS}
            />
            <Dropdown
              label="Do you smoke?"
              value={riskInputs.smoker ?? ""}
              onChange={update("smoker")}
              options={YES_NO}
            />
            <InputTextField
              label="How many cigarettes do you smoke in a day?"
              placeholder="Cigarettes per day"
              value={riskInputs.cigarettes_per_day ?? ""}
              onChange={update("cigarettes_per_day")}
            />
          </>
        )}

        {page === 2 && (
          <>
            <Dropdown
              label="Do you take any blood pressure medication?"
              value={riskInputs.bp_medication ?? ""}
              onChange={update("bp_medication")}
              options={YES_NO}
            />
            <Dropdown
              label="Have you ever had a stroke?"
              value={riskInputs.stroke ?? ""}
              onChange={update("stroke")}
              options={YES_NO}
            />
            <Dropdown
              label="Do you have hypertension?"
              value={riskInputs.hypertension ?? ""}
              onChange={update("hypertension")}
              options={YES_NO}
            />
            <InputTextField
              label="Systolic blood pressure"
              placeholder="e.g. 120"
              value={riskInputs.systolic_bp ?? ""}
              onChange={update("systolic_bp")}
            />
            <InputTextField
              label="Diastolic blood pressure"
              placeholder="e.g. 80"
              value={riskInputs.diastolic_bp ?? ""}
              onChange={update("diastolic_bp")}
            />
          </>
        )}

        {page === 3 && (
          <>
            <InputTextField
              label="BMI (Body Mass Index)"
              placeholder="e.g. 22.5"
              value={riskInputs.bmi ?? ""}
              onChange={update("bmi")}
            />
            <InputTextField
              label="Average heart rate"
              placeholder="e.g. 72"
              value={riskInputs.heart_rate ?? ""}
              onChange={update("heart_rate")}
            />
            <InputTextField
              label="Glucose level"
              placeholder="e.g. 100"
              value={riskInputs.glucose ?? ""}
              onChange={update("glucose")}
            />
          </>
        )}
      </div>

      <div className="pagination">
        <button onClick={() => setPage(page - 1)} disabled={page === 1}>
          ← Previous
        </button>

        {[1, 2, 3].map((p) => (
          <button
            key={p}
            onClick={() => setPage(p)}
            className={page === p ? "active_page" : ""}
          >
            {p}
          </button>
        ))}

        {page < TOTAL_PAGES ? (
          <button onClick={() => setPage(page + 1)}>Next →</button>
        ) : (
          <ActionButton label="Submit" onClick={handleSubmit} />
        )}
      </div>
    </div>
  );
}

export default InputPage;