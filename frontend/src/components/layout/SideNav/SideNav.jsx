import { NavLink } from "react-router-dom";
import { useContext } from "react";
import { RiskContext } from "../../../context/RiskContext";
import "./SideNav.css";
import ActionButton from "../../common/ActionButton";

function SideNav({ isOpen = false, onNavigate }) {
  const { startNewAssessment } = useContext(RiskContext);
  return (
    <aside className={isOpen ? "side-nav open" : "side-nav"}>
      <nav className="side-nav-links">
        <NavLink
          to="/dashboard"
          onClick={onNavigate}
          className={({ isActive }) =>
            isActive ? "side-nav-link active" : "side-nav-link"
          }
        >
          Dashboard
        </NavLink>

        <NavLink
          to="/learn"
          onClick={onNavigate}
          className={({ isActive }) =>
            isActive ? "side-nav-link active" : "side-nav-link"
          }
        >
          Learn
        </NavLink>
      </nav>

      <div className="side-nav-footer">
        <ActionButton label="Add Assessment" to="/assessment" onClick={startNewAssessment} />
      </div>
    </aside>
  );
}

export default SideNav;
