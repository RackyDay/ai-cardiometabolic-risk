import "./MenuBar.css";
import logo from "../../assets/heart-logo.png"
import useMenuBarViewModel from "./useMenuBarViewModel";

function MenuBar() {
  const { pageTitle } = useMenuBarViewModel()

  return (
    <header className="menu-bar">
      <div className="menu-bar-left">
        <img src={logo} alt="App logo" className="menu-bar-logo" />
      </div>

      <h1 className="menu-bar-title">{pageTitle}</h1>

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