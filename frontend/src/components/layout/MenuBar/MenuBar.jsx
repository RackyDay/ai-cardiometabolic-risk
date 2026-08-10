import "./MenuBar.css";
import HeartECGIcon from "../../icons/HeartECGIcon";
import UserIcon from "../../icons/UserIcon";
import useMenuBarViewModel from "./useMenuBarViewModel";
import { useNavigate } from "react-router-dom";

function MenuBar({ showMenuButton, onMenuClick }) {
  const { pageTitle } = useMenuBarViewModel();
  const navigate = useNavigate();

  return (
    <header className="menu-bar">
      <div className="menu-bar-left">
        {showMenuButton && (
          <button
            className="menu-icon-button menu-drawer-button"
            onClick={onMenuClick}
            aria-label="Open navigation menu"
          >
            ☰
          </button>
        )}

        <button
          className="menu-logo-button"
          onClick={() => navigate("/")}
          aria-label="Go to welcome page"
        >
          <HeartECGIcon />
        </button>
      </div>

      <h1 className="menu-bar-title">{pageTitle}</h1>

      <div className="menu-bar-actions">
        <button className="menu-icon-button settings-button" aria-label="Settings">
          ⚙
        </button>
        <div className="menu-profile">
          <UserIcon />
        </div>
      </div>
    </header>
  );
}

export default MenuBar;