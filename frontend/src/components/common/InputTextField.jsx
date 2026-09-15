import FieldLabel from "./FieldLabel";

function InputTextField({ label, value, onChange, min, step, max, error, required = true, placeholder, onKeyDown, tooltip, disabled = false, disabledMessage, unit, unitOptions, onUnitChange, }) {
    return (
    <div className={`form-field ${disabled ? "form-field-disabled" : ""}`}>
      <FieldLabel label={label} required={required} tooltip={tooltip} />
      <div className="form-input-with-unit">
        <input
          className={`form-input ${error ? "error" : ""}`}
          type="number"
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          disabled={disabled}
        />

        {unitOptions && (
          <select
            className="form-unit-select"
            value={unit}
            onChange={(e) => onUnitChange(e.target.value)}
            aria-label={`${label} unit`}
          >
            {unitOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )}
      </div>

      {disabled && disabledMessage && (
        <div className="disabled-helper-text">{disabledMessage}</div>
      )}

      {error && <div className="form-error">{error}</div>}
    </div>
  );
}

export default InputTextField;