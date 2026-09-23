import Dropdown from "./Dropdown";
import InputTextField from "./InputTextField";
import BooleanField from "./BooleanField";
import UnitToggle from "./UnitToggle";
import {
  MG_DL,
  MMOL_L,
  canonicalToDisplay,
  displayToCanonical,
  getDisplayUnit,
} from "../../utils/unitConversion";

// unit/onUnitChange are per-field, not app-wide: each convertible question
// (glucose, cholesterol) tracks and shows its own mg/dL <-> mmol/L choice,
// independently of every other question and of the dashboard's own unit
// setting. The caller (InputPage/EditAssessmentModal, via their view
// models) owns that state so it can also word validation errors in
// whichever unit is currently on screen for that field.
function RiskField({ field, value, onChange, error, disabled = false, disabledMessage, unit = MG_DL, onUnitChange }) {
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
            const displayUnit = getDisplayUnit(field, unit);

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
                unitToggle={
                    isConvertible && onUnitChange ? (
                        <UnitToggle
                            unit={displayUnit}
                            onChange={onUnitChange}
                            ariaLabel={`Units for ${field.print_name}`}
                            className="unit-toggle--compact"
                        />
                    ) : null
                }
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