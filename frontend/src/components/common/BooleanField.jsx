function BooleanField({ label, value, onChange, error, required = true}) {
    return (
        <div className="form-field">
            <label className="form-label">
                {label}
                <span className={`field-tag ${required ? "field-tag--required" : "field-tag--optional"}`}>
                    {required ? "Required" : "Optional"}
                </span>
            </label>
            <div className ="boolean-wrapper">
                <button 
                    className = {`boolean-button ${value === true ? "boolean-button--selected" : ""}`}
                    type="button"
                    onClick={() => onChange(true)}
                >
                    Yes
                </button>
                <button 
                    className = {`boolean-button ${value === false ? "boolean-button--selected" : ""}`}
                    type="button"
                    onClick={() => onChange(false)}
                >
                    No
                </button>
            </div>
            {error && <div className="form-error">{error}</div>}
        </div>
    );
}

export default BooleanField;