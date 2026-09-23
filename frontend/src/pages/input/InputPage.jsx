import { useState } from "react";
import RiskField from "../../components/common/RiskField";
import "./InputPage.css";
import { useInputViewModel } from "./useInputViewModel";
import { useNavigate } from "react-router-dom";

function InputPage() {

  const {riskInputs, errors, set, categories, pageOrder, page, setPage, handleSubmit, isSubmitting, submitError, fieldUnits, setFieldUnit} = useInputViewModel();
  const navigate = useNavigate();
  const currentCategory = pageOrder[page];
  const currentFields = categories[currentCategory];
  const isLastPage = page === pageOrder.length - 1;
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);

  return (
    <div className="inputs-page">
      <div className="page-body">
      <button className="back-btn" onClick={() => navigate("/")}>
        ‹ Back
      </button>

      <div className="input-content-layout">
        
        <div className="form-card-column">

          <div className="form-card">
            {isLastPage && (
              <button
                type="button"
                className="input-disclaimer-trigger"
                aria-label="Input page disclaimer"
                onClick={() => setIsDisclaimerOpen(true)}
              >
                !
              </button>
            )}

            {currentFields.map((field) => {
              const isCigarettesField = field.name === "cigsPerDay";
              const isNonSmoker = riskInputs.currentSmoker === false;
              const shouldDisableCigarettes = isCigarettesField && isNonSmoker;

              return (
                <RiskField
                  key={field.name}
                  field={field}
                  value={riskInputs[field.name]}
                  onChange={set(field.name)}
                  error={errors[field.name]}
                  disabled={shouldDisableCigarettes}
                  disabledMessage={
                    shouldDisableCigarettes
                      ? "This field is disabled because you selected No for smoking status."
                      : undefined
                  }
                  unit={fieldUnits[field.name]}
                  onUnitChange={setFieldUnit(field.name)}
                />
              );
            })}

            {isLastPage && (
              <div className="submit-wrapper">
                {submitError && <div className="form-error">{submitError}</div>}
                <button className="submit-btn" onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? "Calculating..." : "Submit"}
                </button>
              </div>
            )}

            <nav className="pagination">
              <button
                className="page-nav-btn"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
              >
                ← Previous
              </button>

              {pageOrder.map((n, idx) => (
                <button
                  key={idx}
                  className={`page-num-btn${page === idx ? " active" : ""}`}
                  onClick={() => setPage(idx)}
                >
                  {idx + 1}
                </button>
              ))}

              <button
                className="page-nav-btn"
                onClick={() => setPage((p) => p + 1)}
                disabled={page === pageOrder.length - 1}
              >
                Next →
              </button>
            </nav>
          </div>
        </div>
        

        {isLastPage && (
          <aside className="input-disclaimer-card">
            <h2>Important note</h2>
            <p>
              Although these fields are optional, providing these measurements can help
              improve the accuracy of the risk calculation.
            </p>
          </aside>
        )}
      </div>

        {isLastPage && isDisclaimerOpen && (
          <div
            className="input-disclaimer-modal-backdrop"
            onClick={() => setIsDisclaimerOpen(false)}
          >
            <div
              className="input-disclaimer-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="input-disclaimer-modal-header">
                <h2>Important note</h2>

                <button
                  type="button"
                  className="input-disclaimer-modal-close"
                  aria-label="Close disclaimer"
                  onClick={() => setIsDisclaimerOpen(false)}
                >
                  ×
                </button>
              </div>

              <p>
                Although these fields are optional, providing these measurements can help
                improve the accuracy of the risk calculation.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default InputPage;
