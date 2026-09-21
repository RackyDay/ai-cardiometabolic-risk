import { useContext } from "react";
import Dropdown from "./Dropdown";
import InputTextField from "./InputTextField";
import BooleanField from "./BooleanField";
import { UnitContext } from "../../context/UnitContext";
import {
  MMOL_L,
  canonicalToDisplay,
  displayToCanonical,
  getDisplayUnit,
} from "../../utils/unitConversion";

function getNumberPlaceholder(field) {
    const { min, max, units } = field;
    if (min == null || max == null) return "";
    const unitSuffix = units ? ` ${units}` : "";
    return `Enter a value between ${min}\u2013${max}${unitSuffix}`;
}

function RiskField({ field, value, onChange, error, disabled = false, disabledMessage }) {
    const { clinicalUnit } = useContext(UnitContext);

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
            const displayUnit = getDisplayUnit(field, clinicalUnit);

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
                step={displayUnit === MMOL_L ? 0.01 : field.step || 1}
                error={error}
                required={field.required}
                placeholder={
                    displayMin != null && displayMax != null
                    ? `Enter a value between ${displayMin}–${displayMax}${
                        displayUnit ? ` ${displayUnit}` : ""
                        }`
                    : ""
                }
                tooltip={
                    displayUnit === MMOL_L && field.tooltipMmol
                        ? field.tooltipMmol
                        : field.tooltip
                }
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