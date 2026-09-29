import { useId } from "react";
import { Link } from "react-router-dom";
import "./AssessmentModuleCard.css";

// Presentation only: the assessment page supplies configuration and completion.
export default function AssessmentModuleCard({
  title, category, description, icon, topics = [], required = false,
  complete = false, to, footer, actionLabel = "Start module",
  completedActionLabel = "Review module", editTo = to,
}) {
  const titleId = useId();

  return (
    <article className="assessment-module" aria-labelledby={titleId}>
      <div className="assessment-module-body">
        <div className="assessment-module-heading">
          {icon && <div className="assessment-module-icon" aria-hidden="true">{icon}</div>}
          <span className="assessment-module-label">{category}</span>
          <div className="assessment-module-badges">
            <span className={`assessment-module-badge ${required ? "required" : "optional"}`}>
              {required && <span aria-hidden="true">*</span>}
              {required ? "Required" : "Optional"}
            </span>
            <span className={`assessment-module-badge ${complete ? "complete" : "incomplete"}`}>
              <span aria-hidden="true">{complete ? "✓" : "○"}</span>
              {complete ? "Complete" : "Incomplete"}
            </span>
          </div>
        </div>
        <h2 id={titleId}>{title}</h2>
        <p>{description}</p>
        {topics.length > 0 && (
          <ul className="assessment-module-topics" aria-label={`Included in ${title}`}>
            {topics.map((topic) => <li key={topic}>{topic}</li>)}
          </ul>
        )}
      </div>
      <div className="assessment-module-footer">
        {footer && <p>{footer}</p>}
        <div className="assessment-module-actions">
          {complete ? (
            <Link className="assessment-edit" to={editTo} aria-describedby={titleId}>
              Edit inputs
            </Link>
          ) : (
            <button className="assessment-edit" type="button" disabled
              title="Complete this module to edit its inputs" aria-describedby={titleId}>
              Edit inputs
            </button>
          )}
        <Link className="assessment-start" to={to} aria-describedby={titleId}>
          {complete ? completedActionLabel : actionLabel} <span aria-hidden="true">&rarr;</span>
        </Link>
        </div>
      </div>
    </article>
  );
}
