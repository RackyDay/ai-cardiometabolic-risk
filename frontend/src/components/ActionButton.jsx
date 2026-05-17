function ActionButton({ label, onClick, className }) {
  return (
    <button className={className} onClick={onClick}>
      {label}
    </button>
  );
}

export default ActionButton;