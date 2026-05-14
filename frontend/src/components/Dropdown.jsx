function Dropdown({ label, value, onChange, options }) {
  return (
    <div className="dropdown_field">
      <label>{label}</label>
      <select value={value} onChange={onChange}>
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default Dropdown;