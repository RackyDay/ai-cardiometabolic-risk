import { useState, useRef, useEffect } from "react";

function FieldLabel({ label, required, tooltip }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!showTooltip) return;

    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowTooltip(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showTooltip]);

  return (
    <label className="form-label">
      {label}
      <span className={`field-tag ${required ? "field-tag--required" : "field-tag--optional"}`}>
        {required ? "Required" : "Optional"}
      </span>
      {tooltip && (
        <span className="field-tooltip-wrapper" ref={wrapperRef}>
          <button
            type="button"
            className="field-tooltip-trigger"
            onClick={() => setShowTooltip((prev) => !prev)}
            aria-expanded={showTooltip}
            aria-label={`More information: ${label}`}
          >
            i
          </button>
          <div className={`field-tooltip-panel ${showTooltip ? "open" : ""}`}>
            {tooltip}
          </div>
        </span>
      )}
    </label>
  );
}

export default FieldLabel;