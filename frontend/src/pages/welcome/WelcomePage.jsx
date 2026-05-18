import { useNavigate } from "react-router-dom";
import HeartECGIcon from "../../components/icons/HeartECGIcon";
import "./WelcomePage.css";
import ActionButton from "../../components/common/ActionButton"; 

function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="welcome-page">
      <div className="welcome-card">
        <div className="welcome-logo-wrapper">
            <HeartECGIcon />
        </div>

        <h1 className="welcome-title">Welcome to SmartHeart AI</h1>

        <p className="welcome-description">
          Before we can assess your cardiovascular risk, we’ll need to collect some important health information.
        </p>


        <ActionButton label="Click to get started" to="/inputs" />

      </div>
    </div>
  );
}

export default WelcomePage;