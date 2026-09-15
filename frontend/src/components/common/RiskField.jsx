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

function RiskField({ field, value, onChange, error, disabled = false, disabledMessage, unit, onUnitChange }) {
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
            const selectedUnit = unit || field.units;

            const displayValue = canonicalToDisplay(
                value,
                selectedUnit,
                field.mmolConversionFactor
            );

            const displayMin = canonicalToDisplay(
                field.min,
                selectedUnit,
                field.mmolConversionFactor
            );

            const displayMax = canonicalToDisplay(
                field.max,
                selectedUnit,
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
                        selectedUnit,
                        field.mmolConversionFactor
                    )
                    )
                }
                min={displayMin}
                max={displayMax}
                step={selectedUnit === "mmol/L" ? 0.01 : field.step || 1}
                error={error}
                required={field.required}
                placeholder={
                    displayMin != null && displayMax != null
                    ? `Enter a value between ${displayMin}–${displayMax}${
                        selectedUnit ? ` ${selectedUnit}` : ""
                        }`
                    : ""
                }
                tooltip={field.tooltip}
                disabled={disabled}
                disabledMessage={disabledMessage}
                unit={selectedUnit}
                unitOptions={field.unitOptions}
                onUnitChange={onUnitChange}
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