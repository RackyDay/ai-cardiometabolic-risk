import "./HistoryDropdown.css";
import useHistoryDropdownViewModel from "./useHistoryDropdownViewModel";
import { AuthContext } from "../../../context/AuthContext";
import { useContext } from "react";
import { RiskContext } from "../../../context/RiskContext";

const HistoryDropdown = ({ onLoadCalculation }) => {
  const { accessToken, isAuthenticated: signedIn } = useContext(AuthContext);
  const { calculationDeleted } = useContext(RiskContext);

  const {
    history,
    deletingId,
    deleteError,
    deleteCalculation,
    selectedId,
    setSelectedId,
    isOpen,
    setIsOpen,
    isLoading,
    error,
    retryHistory,
    isViewing,
    viewError,
    viewCalculation,
    dropdownRef,
  } = useHistoryDropdownViewModel(accessToken, onLoadCalculation, calculationDeleted);

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="history-dropdown" ref={dropdownRef}>
      <button
        type="button"
        className="history-dropdown-trigger"
        disabled={!signedIn}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <div className="history-trigger-content">
          <svg
            className="history-trigger-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M3 12a9 9 0 1 0 3-6.7L3 8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M3 3v5h5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12 7v5l3 2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <div className="history-trigger-text">
            {signedIn ? (
              <>
                <span className="history-trigger-title">
                  Calculation history
                </span>

                <span className="history-trigger-subtitle">
                  {isLoading ? "Loading calculations…" : error ? "Couldn't load history" : history.length
                    ? `${history.length} saved calculation${
                        history.length === 1 ? "" : "s"
                      }`
                    : "No saved calculations"}
                </span>
              </>
            ) : (
              <>
                <span className="history-trigger-title">
                  Calculation history
                </span>

                <span className="history-trigger-subtitle">
                  Sign in to track heart health history
                </span>
              </>
            )}
          </div>
        </div>

        <svg
          className={`history-chevron ${
            isOpen ? "history-chevron-open" : ""
          }`}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            d="m6 9 6 6 6-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && signedIn && (
        <div className="history-menu">
          <div className="history-menu-header">
            <div>
              <h3>Saved calculations</h3>
              <p>Most recent first</p>
            </div>

            <span className="history-sort-indicator">
              Newest ↓
            </span>
          </div>

          <div className="history-list">
            {isLoading ? (
              <div className="history-empty" role="status">Loading calculations…</div>
            ) : error ? (
              <div className="history-empty">
                <p role="alert">{error}</p>
                <button type="button" className="history-view-button" onClick={retryHistory}>
                  Retry
                </button>
              </div>
            ) : history.length === 0 ? (
              <div className="history-empty">
                No saved calculations yet.
              </div>
            ) : (
              history.map((calculation, index) => {
                const isSelected =
                  selectedId === calculation.riskcalc_id;

                return (
                  <div className={`history-item-row ${isSelected ? "history-item-selected" : ""}`} key={calculation.riskcalc_id}>
                  <button
                    type="button"
                    className="history-delete-button"
                    aria-label={deletingId === calculation.riskcalc_id ? "Deleting calculation" : `Delete calculation ${history.length - index}`}
                    title="Delete calculation"
                    disabled={Boolean(deletingId) || isViewing}
                    onClick={() => deleteCalculation(calculation.riskcalc_id)}
                  >
                    {deletingId === calculation.riskcalc_id ? (
                      <span aria-hidden="true">...</span>
                    ) : (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
                      </svg>
                    )}
                  </button>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    className="history-item"
                    onClick={() =>
                      setSelectedId(calculation.riskcalc_id)
                    }
                  >

                    <div className="history-item-content">
                      <div className="history-item-heading">
                        Calculation {history.length - index}
                      </div>

                      <div className="history-item-date">
                        {formatDate(calculation.riskcalc_timestamp)}
                      </div>
                    </div>

                    <div className="history-risk">
                      <span className="history-risk-label">Risk score</span>

                      <span className="history-risk-value">
                        {calculation.risk_score}%
                      </span>
                    </div>

                    <div className="history-risk-bar">
                      <div
                        className="history-risk-bar-fill"
                        style={{
                          width: `${Math.min(
                            Number(calculation.risk_score),
                            100
                          )}%`,
                        }}
                      />
                    </div>

                  </button>
                  </div>
                );
              })
            )}
          </div>

          {viewError && <p className="history-empty" role="alert">{viewError}</p>}
          {deleteError && <p className="history-empty" role="alert">{deleteError}</p>}
          {history.length > 0 && (
            <button
              type="button"
              className="history-view-button"
              disabled={!selectedId || isViewing || Boolean(deletingId)}
              onClick={viewCalculation}
            >
              {isViewing ? "Loading calculation…" : "View selected calculation"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default HistoryDropdown;
