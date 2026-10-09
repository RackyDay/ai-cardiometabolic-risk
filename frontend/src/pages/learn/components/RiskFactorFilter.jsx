import { useId } from "react";

// "All" plus one chip per category; the active chip is announced as pressed.
function RiskFactorFilter({ groups, activeGroupId, onChange }) {
  const titleId = useId();
  const options = [{ id: "all", title: "All" }, ...groups];

  return (
    <div className="learn-factor-toolbar">
      <p id={titleId} className="learn-factor-toolbar-title">Explore by risk factor</p>
      <div className="learn-filter-chips" role="group" aria-labelledby={titleId}>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`learn-filter-chip ${activeGroupId === option.id ? "learn-filter-chip-active" : ""}`}
            aria-pressed={activeGroupId === option.id}
            onClick={() => onChange(option.id)}
          >
            {option.title}
          </button>
        ))}
      </div>
    </div>
  );
}

export default RiskFactorFilter;
