type RiskSchema = Record<string, any>

export function createInitalRiskInputs(schema: RiskSchema) {
    return Object.entries(schema).reduce<Record<string, any>>((acc, [key, field]) => {
        acc[key] = field.defaultValue ?? "";
        return acc;
    }, {});
}