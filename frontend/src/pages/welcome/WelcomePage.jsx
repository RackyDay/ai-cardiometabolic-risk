import { useContext } from "react";
import { Navigate } from "react-router-dom";
import HeartECGIcon from "../../components/icons/HeartECGIcon";
import "./WelcomePage.css";
import ActionButton from "../../components/common/ActionButton";
import { AuthContext } from "../../context/AuthContext";
import { RiskContext } from "../../context/RiskContext";

function WelcomePage() {
  const { isAuthenticated } = useContext(AuthContext);
  const { startNewAssessment } = useContext(RiskContext);

  // An already-signed-in user has no use for the landing page - its only
  // actions are "get started" and "log in / sign up". Send them straight
  // to the dashboard, the same place a fresh login lands them, including
  // when they just reopen the site with a session restored from storage.
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

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


        <ActionButton label="Click to get started" to="/assessment" onClick={startNewAssessment} />

        <ActionButton label="Log In / Sign Up" to="/auth" />

      </div>
    </div>
  );
}

export default WelcomePage;
