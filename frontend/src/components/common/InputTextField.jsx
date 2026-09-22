import FieldLabel from "./FieldLabel";

function InputTextField({ label, value, onChange, min, step, max, error, required = true, placeholder, onKeyDown, tooltip, disabled = false, disabledMessage, unitToggle }) {
    return (
    <div className={`form-field ${disabled ? "form-field-disabled" : ""}`}>
      <FieldLabel label={label} required={required} tooltip={tooltip} unitToggle={unitToggle} />
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
      </div>

      {disabled && disabledMessage && (
        <div className="disabled-helper-text">{disabledMessage}</div>
      )}

      {error && <div className="form-error">{error}</div>}
    </div>
  );
}

export default InputTextField;