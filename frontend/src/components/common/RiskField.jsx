import Dropdown from "./Dropdown";
import InputTextField from "./InputTextField";
import BooleanField from "./BooleanField";

function getNumberPlaceholder(field) {
    const { min, max, units } = field;
    if (min == null || max == null) return "";
    const unitSuffix = units ? ` ${units}` : "";
    return `Enter a value between ${min}\u2013${max}${unitSuffix}`;
}

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
                    tooltip={field.tooltip}
                />
            )
        case "number":
            return (
                <InputTextField
                    label = {field.input_label}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    min={field.min}
                    step={field.step || 1}
                    max={field.max}
                    error={error}
                    required={field.required}
                    placeholder={getNumberPlaceholder(field)}
                    tooltip={field.tooltip}
                    onKeyDown={(e) => {
                        const blockedKeys = field.blockKeys || [];
                        if (blockedKeys.includes(e.key)) {
                            e.preventDefault();
                        }
                    }}
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
                    tooltip={field.tooltip}
                />
            )
    }
}

export default RiskField;