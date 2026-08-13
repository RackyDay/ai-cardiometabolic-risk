import FieldLabel from "./FieldLabel";

function BooleanField({ label, value, onChange, error, required = true, tooltip }) {
        return (
        <div className="form-field">
            <FieldLabel label={label} required={required} tooltip={tooltip} />
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