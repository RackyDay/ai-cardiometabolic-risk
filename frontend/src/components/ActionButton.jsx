function ActionButton({ label, onClick }) {
  return (
    <button onClick={onClick}>
      {label}
    </button>
  );
}

export default ActionButton;