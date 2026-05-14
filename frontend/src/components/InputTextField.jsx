function InputTextField({ label, placeholder, value, onChange }) {
  return (
    <div className="text_field">
      <label>{label}</label>
      <input
        type="number"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

export default InputTextField;