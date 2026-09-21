import { describe, expect, it } from "vitest";
import { riskInputSchema } from "../schemas/riskInputSchema";
import {
  MG_DL,
  MMOL_L,
  canonicalToDisplay,
  displayToCanonical,
  getDisplayUnit,
} from "./unitConversion";

const GLUCOSE_FACTOR = riskInputSchema.glucose.mmolConversionFactor;

describe("canonicalToDisplay", () => {
  it("converts mg/dL to mmol/L, rounded to 2 decimals", () => {
    expect(canonicalToDisplay(100, MMOL_L, GLUCOSE_FACTOR)).toBe(5.55);
  });

  it("leaves the value alone in mg/dL", () => {
    expect(canonicalToDisplay(100, MG_DL, GLUCOSE_FACTOR)).toBe(100);
  });

  it("leaves the value alone when the field has no conversion factor", () => {
    expect(canonicalToDisplay(120, MMOL_L, undefined)).toBe(120);
  });

  it("returns an empty string for empty values", () => {
    expect(canonicalToDisplay(null, MMOL_L, GLUCOSE_FACTOR)).toBe("");
    expect(canonicalToDisplay(undefined, MMOL_L, GLUCOSE_FACTOR)).toBe("");
    expect(canonicalToDisplay("", MMOL_L, GLUCOSE_FACTOR)).toBe("");
  });
});

describe("displayToCanonical", () => {
  it("converts mmol/L back to mg/dL", () => {
    expect(displayToCanonical("5.55", MMOL_L, GLUCOSE_FACTOR)).toBe(100);
  });

  it("leaves the value alone in mg/dL", () => {
    expect(displayToCanonical("100", MG_DL, GLUCOSE_FACTOR)).toBe("100");
  });

  it("keeps an empty input empty", () => {
    expect(displayToCanonical("", MMOL_L, GLUCOSE_FACTOR)).toBe("");
  });
});

describe("getDisplayUnit", () => {
  it("follows the app-wide unit for convertible fields", () => {
    expect(getDisplayUnit(riskInputSchema.glucose, MMOL_L)).toBe(MMOL_L);
    expect(getDisplayUnit(riskInputSchema.totChol, MG_DL)).toBe(MG_DL);
  });

  it("keeps the fixed unit for non-convertible fields", () => {
    expect(getDisplayUnit(riskInputSchema.heartRate, MMOL_L)).toBe("bpm");
  });
});
