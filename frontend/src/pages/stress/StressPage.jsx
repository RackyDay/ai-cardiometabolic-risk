import RiskField from "../../components/common/RiskField";
import { pssSource } from "../../schemas/stressInputSchema";
import { useStressViewModel } from "./useStressViewModel";
import "../input/InputPage.css";
import "./StressPage.css";

export default function StressPage() {
  const { stressInputs, errors, set, pages, page, setPage, handleSave, returnToOrigin,
    fromDashboard, isLoading, loadError, isSaving, saveError, retryLoad } = useStressViewModel();
  return (
    <div className="inputs-page stress-page">
      <div className="page-body">
        <button className="back-btn" disabled={isSaving} onClick={returnToOrigin}>&lsaquo; Back to {fromDashboard ? "dashboard" : "modules"}</button>
        {isLoading ? <p role="status">Loading stress answers…</p> : loadError ?
          <div role="alert">{loadError} <button onClick={retryLoad}>Try again</button></div> : <>
        <div className="form-card">
          <header className="stress-header">
            <h1>Stress Levels</h1>
            <p>Perceived Stress Scale (PSS-10)</p>
            <p>Think about the past month and choose how often each statement applied to you. Answer all 10 questions to save this optional module.</p>
          </header>
          <p className="stress-progress" aria-live="polite">Questions {page * 2 + 1}–{page * 2 + pages[page].length} of 10</p>
          <fieldset disabled={isSaving} className="stress-fields">
          {pages[page].map((field) => (
            <RiskField key={field.name} field={field} value={stressInputs[field.name]}
              onChange={set(field.name)} error={errors[field.name]} />
          ))}
          </fieldset>
          {page === pages.length - 1 && (
            <div className="submit-wrapper">
              {saveError && <p role="alert">{saveError}</p>}
              <button className="submit-btn" disabled={isSaving} onClick={handleSave}>{isSaving ? "Saving…" : "Save inputs"}</button>
            </div>
          )}
          <nav className="pagination" aria-label="Stress questionnaire pages">
            <button className="page-nav-btn" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
            {pages.map((_, index) => <button key={index} className={`page-num-btn${page === index ? " active" : ""}`}
              aria-label={`Page ${index + 1}`} aria-current={page === index ? "page" : undefined}
              onClick={() => setPage(index)}>{index + 1}</button>)}
            <button className="page-nav-btn" disabled={page === pages.length - 1} onClick={() => setPage(page + 1)}>Next</button>
          </nav>
          <p className="stress-note">Higher scores indicate greater perceived stress. This questionnaire is not a diagnosis.</p>
          <a className="stress-source" href={pssSource} target="_blank" rel="noreferrer">PSS-10 · Cohen and colleagues</a>
        </div>
        </>}
      </div>
    </div>
  );
}
