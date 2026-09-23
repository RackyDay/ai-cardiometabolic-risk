import "./UnitToggle.css";
import { MG_DL, MMOL_L } from "../../utils/unitConversion";

// A two-option mg/dL <-> mmol/L switch that always shows both choices, so
// it reads as "here's what this controls" rather than a mystery button.
// Used both as the compact per-question toggle on the input forms and as
// the larger dashboard-wide control in the menu bar (see className).
function UnitToggle({ unit, onChange, ariaLabel, className = "" }) {
  return (
    <div
      className={`unit-toggle ${className}`}
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        className={`unit-toggle-option ${unit === MG_DL ? "active" : ""}`}
        aria-pressed={unit === MG_DL}
        onClick={() => onChange(MG_DL)}
      >
        mg/dL
      </button>
      <button
        type="button"
        className={`unit-toggle-option ${unit === MMOL_L ? "active" : ""}`}
        aria-pressed={unit === MMOL_L}
        onClick={() => onChange(MMOL_L)}
      >
        mmol/L
      </button>
    </div>
  );
}

export default UnitToggle;
