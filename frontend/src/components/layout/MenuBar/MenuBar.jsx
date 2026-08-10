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

        <div onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
          <HeartECGIcon />
        </div>
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