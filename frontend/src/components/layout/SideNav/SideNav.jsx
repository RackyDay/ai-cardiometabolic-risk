import { NavLink } from "react-router-dom";
import "./SideNav.css";
import ActionButton from "../../common/ActionButton";

function SideNav() {
  return (
    <aside className="side-nav">
      <nav className="side-nav-links">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            isActive ? "side-nav-link active" : "side-nav-link"
          }
        >
          Dashboard
        </NavLink>

        <NavLink
          to="/learn"
          className={({ isActive }) =>
            isActive ? "side-nav-link active" : "side-nav-link"
          }
        >
          Learn
        </NavLink>
      </nav>

      <div className="side-nav-footer">
        <ActionButton label="Add Assessment" to="/inputs" />
      </div>
    </aside>
  );
}

export default SideNav;