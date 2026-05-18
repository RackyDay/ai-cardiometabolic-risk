import "./MenuBar.css";
import HeartECGIcon from "../../icons/HeartECGIcon";
import UserIcon from "../../icons/UserIcon";
import useMenuBarViewModel from "./useMenuBarViewModel";
import { useNavigate } from "react-router-dom";

function MenuBar() {
  const { pageTitle } = useMenuBarViewModel();
  const navigate = useNavigate();

  return (
    <header className="menu-bar">
      <div className="menu-bar-left" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
        <HeartECGIcon />
      </div>

      <h1 className="menu-bar-title">{pageTitle}</h1>

      <div className="menu-bar-actions">
        <button className="menu-icon-button" aria-label="Settings">
          ⚙
        </button>
        <div className="menu-profile">
          <UserIcon />
          <span className="menu-profile-username">user123</span>
        </div>
      </div>
    </header>
  );
}

export default MenuBar;