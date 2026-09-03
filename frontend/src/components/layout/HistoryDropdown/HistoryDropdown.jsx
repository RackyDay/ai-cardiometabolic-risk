import "./HistoryDropdown.css";
import useHistoryDropdownViewModel from "./useHistoryDropdownViewModel";

const HistoryDropdown = ({ onLoadCalculation }) => {
  const {
    history,
    selectedId,
    setSelectedId,
    signedIn,
    viewCalculation,
  } = useHistoryDropdownViewModel(onLoadCalculation);

  return (
    <div className={`history-dropdown ${!signedIn ? "locked" : ""}`}>
      <label>History</label>

      <select
        disabled={!signedIn}
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
      >
        <option value="">
          {signedIn ? "Select calculation" : "Sign in to view history"}
        </option>

        {history.map((calculation) => (
          <option
            key={calculation.riskcalc_id}
            value={calculation.riskcalc_id}
          >
            {calculation.risk_score} —{" "}
            {new Date(calculation.riskcalc_timestamp).toLocaleString()}
          </option>
        ))}
      </select>

      <button
        onClick={viewCalculation}
        disabled={!signedIn || !selectedId}
      >
        View
      </button>
    </div>
  );
};

export default HistoryDropdown;