import RiskField from "../../components/common/RiskField";
import "./InputPage.css";
import { useInputViewModel } from "./useInputViewModel";
import { useNavigate } from "react-router-dom";

function InputPage() {

  const {riskInputs, errors, set, categories, pageOrder, page, setPage, handleSubmit, isSubmitting, submitError} = useInputViewModel();
  const navigate = useNavigate();
  const currentCategory = pageOrder[page];
  const currentFields = categories[currentCategory];
  const isLastPage = page === pageOrder.length - 1;

  return (
    <div className="inputs-page">
      <div className="page-body">
      <button className="back-btn" onClick={() => navigate("/")}>
        ‹ Back
      </button>

        <div className="form-card">
          {currentFields.map(field => (
            <RiskField
              key={field.name}
              field={field}
              value={riskInputs[field.name]}
              onChange={set(field.name)}
              error={errors[field.name]}
            />
          ))}

          {isLastPage && (
            <div className="submit-wrapper">
            {/* submitError/isSubmitting come from the ViewModel's call to
                the /predict API in handleSubmit */}
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
    </div>
  );
}

export default InputPage;
