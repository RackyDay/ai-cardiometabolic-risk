import { describe, it, expect } from "vitest";
import { buildPredictionPayload } from "../pages/input/riskInputTransform";

describe("buildPredictionPayload", () => {

  it("UT-FE-001 - converts number fields from strings to numbers", () => {
    const schema = {
      age: {
        type: "number",
        decimal: false
      },
      BMI: {
        type: "number",
        decimal: true
      }
    };

    const riskInputs = {
      age: "45",
      BMI: "26.5"
    };

    const result = buildPredictionPayload(riskInputs, schema);

    expect(result.age).toBe(45);
    expect(result.BMI).toBe(26.5);
  });


  it("UT-FE-002 - converts numeric select values from strings to numbers", () => {
    const schema = {
      education: {
        type: "select",
        options: [
          { value: 1, label: "High School" },
          { value: 2, label: "University" }
        ]
      }
    };

    const riskInputs = {
      education: "2"
    };

    const result = buildPredictionPayload(riskInputs, schema);

    expect(result.education).toBe(2);
    expect(typeof result.education).toBe("number");
  });


  it("UT-FE-003 - converts empty numeric fields to null", () => {
    const schema = {
      age: {
        type: "number",
        decimal: false
      }
    };

    const riskInputs = {
      age: ""
    };

    const result = buildPredictionPayload(riskInputs, schema);

    expect(result.age).toBeNull();
  });


  it("UT-FE-004 - preserves boolean values", () => {
    const schema = {
      currentSmoker: {
        type: "boolean"
      },
      diabetes: {
        type: "boolean"
      }
    };

    const riskInputs = {
      currentSmoker: true,
      diabetes: false
    };

    const result = buildPredictionPayload(riskInputs, schema);

    expect(result.currentSmoker).toBe(true);
    expect(result.diabetes).toBe(false);
  });


  it("UT-FE-005 - preserves string select values", () => {
    const schema = {
      gender: {
        type: "select",
        options: [
          { value: "M", label: "Male" },
          { value: "F", label: "Female" }
        ]
      }
    };

    const riskInputs = {
      gender: "M"
    };

    const result = buildPredictionPayload(riskInputs, schema);

    expect(result.gender).toBe("M");
    expect(typeof result.gender).toBe("string");
  });

});