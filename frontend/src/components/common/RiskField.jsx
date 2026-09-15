import Dropdown from "./Dropdown";
import InputTextField from "./InputTextField";
import BooleanField from "./BooleanField";

// function to convert mg/dl to mmo/l
function canonicalToDisplay(value, unit, factor) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (unit === "mmol/L" && factor) {
    return Number((Number(value) / factor).toFixed(2));
  }

  return value;
}

// function to convert mmo/l to mg/dl
function displayToCanonical(value, unit, factor) {
  if (value === "") {
    return "";
  }

  if (unit === "mmol/L" && factor) {
    return Number((Number(value) * factor).toFixed(2));
  }

  return value;
}

function getNumberPlaceholder(field) {
    const { min, max, units } = field;
    if (min == null || max == null) return "";
    const unitSuffix = units ? ` ${units}` : "";
    return `Enter a value between ${min}\u2013${max}${unitSuffix}`;
}

function RiskField({ field, value, onChange, error, disabled = false, disabledMessage, clinicalUnit }) {
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
        case "number": {
            const isConvertible = Boolean(field.mmolConversionFactor);

            const displayUnit = isConvertible
                ? clinicalUnit
                : field.units;

            const displayValue = canonicalToDisplay(
                value,
                displayUnit,
                field.mmolConversionFactor
            );

            const displayMin = canonicalToDisplay(
                field.min,
                displayUnit,
                field.mmolConversionFactor
            );

            const displayMax = canonicalToDisplay(
                field.max,
                displayUnit,
                field.mmolConversionFactor
            );

            return (
                <InputTextField
                label={field.input_label}
                value={displayValue}
                onChange={(e) =>
                    onChange(
                        displayToCanonical(
                        e.target.value,
                        displayUnit,
                        field.mmolConversionFactor
                        )
                    )
                }
                min={displayMin}
                max={displayMax}
                step={displayUnit === "mmol/L" ? 0.01 : field.step || 1}
                error={error}
                required={field.required}
                placeholder={
                    displayMin != null && displayMax != null
                    ? `Enter a value between ${displayMin}–${displayMax}${
                        displayUnit ? ` ${displayUnit}` : ""
                        }`
                    : ""
                }
                tooltip={field.tooltip}
                disabled={disabled}
                disabledMessage={disabledMessage}
                onKeyDown={(e) => {
                    const blockedKeys = field.blockKeys || [];

                    if (blockedKeys.includes(e.key)) {
                    e.preventDefault();
                    }
                }}
                />
            );
            }
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