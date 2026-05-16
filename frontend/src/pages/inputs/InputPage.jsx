import Dropdown from "../../components/Dropdown";
import InputTextField from "../../components/InputTextField";
import GearIcon from "../../components/icons/GearIcon";
import HeartECGIcon from "../../components/icons/HeartECGIcon";
import UserIcon from "../../components/icons/UserIcon";
import "../../styles/inputs.css";
import { useInputViewModel } from "./useInputViewModel";

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


function InputPage() {

  const {formData, errors, set, page, setPage, handleSubmit} = useInputViewModel();

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
