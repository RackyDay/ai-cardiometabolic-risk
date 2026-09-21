export const MG_DL = "mg/dL";
export const MMOL_L = "mmol/L";

// Values are always stored and sent to the backend in mg/dL (the schema's
// min/max/units are mg/dL too); mmol/L only ever exists on screen.

// mg/dL -> mmol/L (when the display unit is mmol/L), otherwise unchanged.
export function canonicalToDisplay(value, unit, factor) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (unit === MMOL_L && factor) {
    return Number((Number(value) / factor).toFixed(2));
  }

  return value;
}

// mmol/L -> mg/dL (when the display unit is mmol/L), otherwise unchanged.
export function displayToCanonical(value, unit, factor) {
  if (value === "") {
    return "";
  }

  if (unit === MMOL_L && factor) {
    return Number((Number(value) * factor).toFixed(2));
  }

  return value;
}

// The unit a schema field should be shown in: convertible fields follow the
// app-wide clinical unit, everything else keeps its own fixed unit.
export function getDisplayUnit(field, clinicalUnit) {
  return field.mmolConversionFactor ? clinicalUnit : field.units;
}
