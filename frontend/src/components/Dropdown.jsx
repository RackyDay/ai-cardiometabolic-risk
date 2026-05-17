function Dropdown({ label, value, onChange, options, error, required = true }) {
  return (
    <div className="form-field">
      <label className="form-label">
        {label}
        <span className={`field-tag ${required ? "field-tag--required" : "field-tag--optional"}`}>
          {required ? "Required" : "Optional"}
        </span>
      </label>
      <div className="select-wrapper">
        <select
          className={`form-select ${error ? "error" : ""}`}
          value={value}
          onChange={onChange}
        >
          <option value="" />
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <svg
          className="select-chevron"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M3 6l5 5 5-5"
            stroke="#666"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}

export default Dropdown;
