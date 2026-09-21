import { riskInputSchema } from "../../schemas/riskInputSchema";
import {
  MG_DL,
  canonicalToDisplay,
  getDisplayUnit,
} from "../../utils/unitConversion";


export function formatSavedValue(
  schemaKey,
  rawValue,
  clinicalUnit = MG_DL
) {

  const field =
    riskInputSchema[schemaKey];

  if (!field) {
    return null;
  }

  if (
    rawValue === null ||
    rawValue === undefined ||
    rawValue === ""
  ) {
    return null;
  }

  if (field.type === "boolean") {
    return rawValue ? "Yes" : "No";
  }

  if (field.type === "select") {

    const option =
      field.options.find(
        (opt) =>
          String(opt.value) ===
          String(rawValue)
      );

    return option
      ? option.label
      : String(rawValue);
  }

  if (field.type === "number") {

    const canonicalValue =
      Number(rawValue);

    if (Number.isNaN(canonicalValue)) {
      return String(rawValue);
    }

    // Saved values are always mg/dL; show them in the app-wide unit.
    const displayUnit =
      getDisplayUnit(field, clinicalUnit);

    const numericValue =
      canonicalToDisplay(
        canonicalValue,
        displayUnit,
        field.mmolConversionFactor
      );

    const formatted =
      field.decimal
        ? numericValue.toFixed(1)
        : String(numericValue);

    return displayUnit
      ? `${formatted} ${displayUnit}`
      : formatted;
  }

  return String(rawValue);
}