import { useNavigate } from "react-router-dom";
import "./ActionButton.css";

function ActionButton({ label, to, onClick }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) navigate(to);
    if (onClick) onClick();
  };

  return (
    <button className="action-button" onClick={handleClick}>
      {label}
    </button>
  );
}

export default ActionButton;