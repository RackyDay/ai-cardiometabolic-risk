import { useLocation } from "react-router-dom";
import "./MenuBar.css";
import logo from "../assets/heart-logo.png"

function MenuBar() {
  const location = useLocation();

  const getPageTitle = () => {
    if (location.pathname === "/dashboard") return "Dashboard";
    if (location.pathname === "/learn") return "Learn";
    return "Assessment";
  };

  return (
    <header className="menu-bar">
      <div className="menu-bar-left">
        <img src={logo} alt="App logo" className="menu-bar-logo" />
      </div>

      <h1 className="menu-bar-title">{getPageTitle()}</h1>

      <div className="menu-bar-actions">
        <button className="menu-icon-button" aria-label="Settings">
          ⚙
        </button>
        {/* <button className="menu-icon-button" aria-label="Profile">
          👤
        </button> */}
      </div>
    </header>
  );
}

export default MenuBar;