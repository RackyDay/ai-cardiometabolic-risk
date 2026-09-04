import "./HistoryDropdown.css";
import useHistoryDropdownViewModel from "./useHistoryDropdownViewModel";

const HistoryDropdown = () => {
  const {
    history,
    selectedId,
    setSelectedId,
    isOpen,
    setIsOpen,
    signedIn,
    viewCalculation,
  } = useHistoryDropdownViewModel();

  return (
    <div className="history-dropdown">
      <button
        className="history-dropdown-trigger"
        disabled={!signedIn}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>
          {signedIn
            ? "History"
            : "🔒 Sign in to track heart health history"}
        </span>
        <span className="history-chevron">⌄</span>
      </button>

      {isOpen && signedIn && (
        <div className="history-menu">
          <div className="history-list">
            {history.map((calculation) => (
              <label
                key={calculation.riskcalc_id}
                className="history-item"
              >
                <input
                  type="radio"
                  name="history"
                  value={calculation.riskcalc_id}
                  checked={selectedId === calculation.riskcalc_id}
                  onChange={() =>
                    setSelectedId(calculation.riskcalc_id)
                  }
                />

                <span>
                  {calculation.risk_score}
                </span>

                <span>
                  {new Date(
                    calculation.riskcalc_timestamp
                  ).toLocaleString()}
                </span>
              </label>
            ))}
          </div>

          <button
            className="history-view-button"
            disabled={!selectedId}
            onClick={viewCalculation}
          >
            View
          </button>
        </div>
      )}
    </div>
  );
};

export default HistoryDropdown