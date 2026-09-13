import { riskInputSchema } from "../../schemas/riskInputSchema";


export function formatSavedValue(schemaKey, rawValue) {

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

    const numericValue =
      Number(rawValue);

    if (Number.isNaN(numericValue)) {
      return String(rawValue);
    }

    const formatted =
      field.decimal
        ? numericValue.toFixed(1)
        : String(numericValue);

    return field.units
      ? `${formatted} ${field.units}`
      : formatted;
  }

  return String(rawValue);
}