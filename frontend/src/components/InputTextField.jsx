function InputTextField({ label, value, onChange, min, step, error, required = true }) {
  return (
    <div className="form-field">
      <label className="form-label">
        {label}
        <span className={`field-tag ${required ? "field-tag--required" : "field-tag--optional"}`}>
          {required ? "Required" : "Optional"}
        </span>
      </label>
      <input
        className={`form-input ${error ? "error" : ""}`}
        type="number"
        value={value}
        onChange={onChange}
        min={min}
        step={step}
      />
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}

export default InputTextField;
