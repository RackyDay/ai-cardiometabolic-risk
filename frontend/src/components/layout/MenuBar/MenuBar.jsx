import "./MenuBar.css";
import { useContext, useEffect, useRef, useState } from "react";
import HeartECGIcon from "../../icons/HeartECGIcon";
import UserIcon from "../../icons/UserIcon"
import useMenuBarViewModel from "./useMenuBarViewModel";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import HistoryDropdown from "../HistoryDropdown/HistoryDropdown";


function MenuBar({ showMenuButton, onMenuClick }) {
  const { pageTitle } = useMenuBarViewModel();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logOut } = useContext(AuthContext);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Username first (what the account is actually called); fullName is
  // Google-only (see AuthContext's fromSupabaseSession) and reads better
  // than a bare email for accounts that never set a username; email is the
  // last-resort fallback for the rare case neither is available.
  const displayName = isAuthenticated
    ? (user?.username || user?.fullName || user?.email)
    : "Log in or sign up";

  // Only listen for outside clicks while the dropdown is actually open -
  // otherwise every click anywhere in the app would run this handler for no
  // reason. document-level "mousedown" (not "click") so the outside click
  // closes the menu before whatever it targets (e.g. a SideNav link) fires
  // its own click handler.
  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  // Logged in: the button opens the Settings/Log out dropdown. Logged out:
  // there's nothing to put in a dropdown (no settings, nothing to log out
  // of), so it goes straight to the auth page instead, same as before this
  // control had a dropdown at all.
  const handleDesktopProfileClick = () => {
    if (isAuthenticated) {
      setIsDropdownOpen((open) => !open);
    } else {
      navigate("/auth", { state: { from: location.pathname } });
    }
  };

  const handleMobileProfileClick = () => {
    setIsDropdownOpen((open) => !open);
  };

  const handleAuthClick = () => {
    setIsDropdownOpen(false);
    navigate("/auth", { state: { from: location.pathname } });
  };

  const handleSettingsClick = () => {
    setIsDropdownOpen(false);
    navigate("/settings");
  };

  const handleLogoutClick = async () => {
    setIsDropdownOpen(false);
    await logOut();
    // Only navigate if we're not already on Welcome - avoids an unnecessary
    // history entry/re-render when logging out from the welcome page itself.
    if (location.pathname !== "/") {
      navigate("/");
    }
  };

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
        <HistoryDropdown/>
        <div className="menu-profile-wrapper" ref={dropdownRef}>
          <button
            className="menu-profile-name"
            onClick={handleDesktopProfileClick}
            aria-haspopup={isAuthenticated ? "menu" : undefined}
            aria-expanded={isAuthenticated ? isDropdownOpen : undefined}
            aria-label={isAuthenticated ? `Account menu (${displayName})` : "Log in or sign up"}
            title={isAuthenticated ? displayName : "Log in or sign up"}
          >
            {displayName}
          </button>
          <button
            className="menu-profile-button"
            onClick={handleMobileProfileClick}
            aria-haspopup={isAuthenticated ? "menu" : undefined}
            aria-expanded={isAuthenticated ? isDropdownOpen : undefined}
            aria-label={isAuthenticated ? `Account menu (${displayName})` : "Log in or sign up"}
            title={isAuthenticated ? displayName : "Log in or sign up"}
          >
            <UserIcon />
          </button>

          {isDropdownOpen && (
            <div className="menu-profile-dropdown" role="menu">
              {isAuthenticated ? (
                <>
                  <div className="menu-profile-dropdown-header">
                    <span>Signed in as</span>
                    <strong>{displayName}</strong>
                  </div>

                  <div className="menu-profile-dropdown-divider" />

                  <button role="menuitem" onClick={handleSettingsClick}>
                    Settings
                  </button>
                  <button role="menuitem" onClick={handleLogoutClick}>
                    Log out
                  </button>
                </>
              ) : (
                <button role="menuitem" onClick={handleAuthClick}>
                  Log in or sign up
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default MenuBar;
