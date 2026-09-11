import { describe, expect, it } from "vitest";
import { buildPieData } from "./buildPieData";

const age = { feature: "age", label: "Age", weightPercent: 60, raisesRisk: true };
const bmi = { feature: "BMI", label: "Body mass index", weightPercent: 40, raisesRisk: true };

describe("risk-raising pie contributions", () => {
  it("shrinks a slice when its positive share decreases", () => {
    const original = buildPieData([age, bmi]);
    const edited = buildPieData([
      { ...age, weightPercent: 10 },
      { ...bmi, weightPercent: 90 },
    ]);
    expect(original[0].value).toBe(60);
    expect(edited[0].value).toBe(10);
  });

  it("gives risk-lowering age no slice even with 26.15% overall influence", () => {
    const editedAge = { ...age, weightPercent: 26.15, raisesRisk: false };
    const result = buildPieData([editedAge, { ...bmi, weightPercent: 73.85 }]);
    expect(result[0].value).toBe(0);
    expect(result[1].value).toBe(100);
    // Retain the signed influence information for the factor list.
    expect(editedAge.weightPercent).toBe(26.15);
    expect(editedAge.raisesRisk).toBe(false);
  });

  it("preserves original slice order through sign changes and normalizes positive effects", () => {
    const glucose = { feature: "glucose", label: "Glucose", raisesRisk: true, weightPercent: 10 };
    const original = [age, bmi, glucose];
    const changed = [glucose, { ...bmi, weightPercent: 30 }, { ...age, raisesRisk: false }];
    const result = buildPieData(changed, original);
    expect(result.map((factor) => factor.feature)).toEqual(["age", "BMI", "glucose"]);
    expect(result.map((factor) => factor.value)).toEqual([0, 75, 25]);
    expect(result.reduce((sum, factor) => sum + factor.value, 0)).toBe(100);
    expect(changed.map((factor) => factor.feature)).toEqual(["glucose", "BMI", "age"]);
    expect(buildPieData(original).map((factor) => factor.feature)).toEqual(["age", "BMI", "glucose"]);
  });

  it("returns zero values without NaN when there are no positive effects", () => {
    const result = buildPieData([
      { ...age, raisesRisk: false },
      { ...bmi, weightPercent: 0, raisesRisk: false },
    ]);
    expect(result.map((factor) => factor.value)).toEqual([0, 0]);
    expect(buildPieData([])).toEqual([]);
  });
});
