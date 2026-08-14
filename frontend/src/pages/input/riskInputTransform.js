// Converts the InputPage form state (where every value comes off the DOM as
// a string, `""`, or a boolean) into the typed JSON body the /predict API
// expects. Driven entirely by riskInputSchema so it stays correct if fields
// are added/removed there without needing to be updated in two places.
export function buildPredictionPayload(riskInputs, schema) {
  return Object.entries(schema).reduce((payload, [key, field]) => {
    const raw = riskInputs[key];
    const isEmpty = raw === "" || raw === null || raw === undefined;
    // <select> options always come back as strings, even when the schema
    // defines them with numeric values (e.g. education: 1-4), so numeric
    // selects need the same string -> number coercion as number fields.
    const isNumericSelect = field.type === "select" && typeof field.options[0]?.value === "number";

    if (field.type === "number" || isNumericSelect) {
      payload[key] = isEmpty ? null : Number(raw);
      return payload;
    }

    // Booleans (currentSmoker, bpMeds, ...) and string selects (gender)
    // are already the right type/value — pass through as-is.
    payload[key] = raw;
    return payload;
  }, {});
}
