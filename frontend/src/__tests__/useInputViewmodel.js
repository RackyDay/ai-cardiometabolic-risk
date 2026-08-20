import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RiskContext } from "../../context/RiskContext";
import { useInputViewModel } from "../../pages/input/useInputViewModel";

const initialRiskInputs = {
  gender: "M",
  age: "",
  education: "",
  currentSmoker: false,
  cigsPerDay: "",
  bpMeds: false,
  prevalentStroke: false,
  prevalentHyp: false,
  diabetes: false,
  sysBP: "",
  diaBP: "",
  BMI: "",
  heartRate: "",
  glucose: "",
  totChol: "",
};

function wrapper({ children }) {
  const contextValue = {
    riskInputs: initialRiskInputs,
    setRiskInputs: vi.fn(),
    setRiskScore: vi.fn(),
    setTopContributors: vi.fn(),
  };

  return (
    <MemoryRouter>
      <RiskContext.Provider value={contextValue}>
        {children}
      </RiskContext.Provider>
    </MemoryRouter>
  );
}

describe("useInputViewModel validation", () => {

  it("UT-FE-006 - rejects missing required field", () => {
    const { result } = renderHook(() => useInputViewModel(), {
      wrapper,
    });

    act(() => {
      result.current.set("age")("");
    });

    expect(result.current.errors.age).toBe("This field is required");
  });


  it("UT-FE-007 - rejects non-numeric input", () => {
    const { result } = renderHook(() => useInputViewModel(), {
      wrapper,
    });

    act(() => {
      result.current.set("age")("abc");
    });

    expect(result.current.errors.age).toContain("valid number");
  });


  it("UT-FE-008 - rejects decimal when integer is required", () => {
    const { result } = renderHook(() => useInputViewModel(), {
      wrapper,
    });

    act(() => {
      result.current.set("age")("45.5");
    });

    expect(result.current.errors.age).toContain("integer");
  });


  it("UT-FE-009 - rejects value below minimum", () => {
    const { result } = renderHook(() => useInputViewModel(), {
      wrapper,
    });

    act(() => {
      result.current.set("age")("1");
    });

    expect(result.current.errors.age).toContain("between");
  });


  it("UT-FE-010 - rejects value above maximum", () => {
    const { result } = renderHook(() => useInputViewModel(), {
      wrapper,
    });

    act(() => {
      result.current.set("age")("999");
    });

    expect(result.current.errors.age).toContain("between");
  });


  it("UT-FE-011 - rejects scientific notation", () => {
    const { result } = renderHook(() => useInputViewModel(), {
      wrapper,
    });

    act(() => {
      result.current.set("age")("1e3");
    });

    expect(result.current.errors.age).toContain("valid number");
  });

});