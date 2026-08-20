import { useContext } from "react";
import HeartECGIcon from "../../components/icons/HeartECGIcon";
import "./WelcomePage.css";
import ActionButton from "../../components/common/ActionButton";
import { AuthContext } from "../../context/AuthContext";

function WelcomePage() {
  const { isAuthenticated } = useContext(AuthContext);

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

        {/* Hidden once logged in - signing up/logging in again isn't a
            meaningful action for an already-authenticated user, and the
            MenuBar's account control covers Settings/Log out instead. */}
        {!isAuthenticated && (
          <ActionButton label="Log In / Sign Up" to="/auth" />
        )}

      </div>
    </div>
  );
}

export default WelcomePage;