import FieldLabel from "./FieldLabel";

function InputTextField({ label, value, onChange, min, step, max, error, required = true, placeholder, onKeyDown, tooltip }) {
    return (
    <div className="form-field">
      <FieldLabel label={label} required={required} tooltip={tooltip} />
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
      />
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}

export default InputTextField;