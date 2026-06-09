import Dropdown from "./Dropdown";
import InputTextField from "./InputTextField";
import BooleanField from "./BooleanField";

function RiskField({ field, value, onChange, error }) {
    switch (field.type) {
        case "select":
            return (
                <Dropdown
                    label={field.input_label}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    options={field.options}
                    error={error}
                    required={field.required}
                />
            )
        case "number":
            return (
                <InputTextField
                    label = {field.input_label}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    min={field.min}
                    step={field.max}
                    error={error}
                    required={field.required}
                    placeholder={field.defaultValue}
                />
            )
        case "boolean":
            return (
                <BooleanField
                    label = {field.input_label}
                    value = {value}
                    onChange={onChange}
                    error={error}
                    required={field.required}
                />
            )
    }
}

export default RiskField;