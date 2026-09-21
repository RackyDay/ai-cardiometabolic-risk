import { describe, expect, it } from "vitest";
import { formatSavedValue } from "./formatSavedValue";

describe("formatSavedValue with clinical units", () => {
  it("defaults to mg/dL", () => {
    expect(formatSavedValue("glucose", 100)).toBe("100.0 mg/dL");
  });

  it("shows convertible fields in mmol/L when selected", () => {
    expect(formatSavedValue("glucose", 100, "mmol/L")).toBe("5.5 mmol/L");
    expect(formatSavedValue("totChol", 200, "mmol/L")).toBe("5.2 mmol/L");
  });

  it("does not convert fields without a conversion factor", () => {
    expect(formatSavedValue("heartRate", 72, "mmol/L")).toBe("72.0 bpm");
  });
});
