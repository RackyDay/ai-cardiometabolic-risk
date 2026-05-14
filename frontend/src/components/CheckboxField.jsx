function CheckboxField({ label, checked, onChange }) {
  return (
    <div className="toggle_field">
      <label>{label}</label>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
      />
    </div>
  );
}

export default CheckboxField;