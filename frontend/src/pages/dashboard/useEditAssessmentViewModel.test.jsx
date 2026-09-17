import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../context/AuthContext";
import { RiskContext } from "../../context/RiskContext";
import { editRiskCalculation, predictRisk } from "../../services/api";
import { useEditAssessmentViewModel } from "./useEditAssessmentViewModel";

vi.mock("../../services/api", () => ({
  predictRisk: vi.fn(),
  editRiskCalculation: vi.fn(),
}));

// A fully valid, already-passing set of inputs so handleSave's validation
// succeeds without needing to drive the multi-page form UI.
const validInputs = {
  gender: "M",
  age: 45,
  education: 2,
  currentSmoker: true,
  cigsPerDay: 10,
  bpMeds: false,
  prevalentStroke: false,
  prevalentHyp: false,
  diabetes: false,
  sysBP: 130,
  diaBP: 85,
  BMI: 26.5,
  heartRate: 75,
  glucose: 90,
  totChol: 210,
};

function baseContext(overrides) {
  return {
    riskInputs: validInputs,
    setRiskInputs: vi.fn(),
    setRiskScore: vi.fn(),
    setTopContributors: vi.fn(),
    setRiskCalculationId: vi.fn(),
    riskCalculationId: null,
    selectedCalculation: null,
    ...overrides,
  };
}

function Wrapper(context) {
  return function ({ children }) {
    return (
      <AuthContext.Provider value={{ accessToken: "token-123" }}>
        <RiskContext.Provider value={context}>{children}</RiskContext.Provider>
      </AuthContext.Provider>
    );
  };
}

beforeEach(() => vi.resetAllMocks());

describe("saving an edited assessment", () => {
  it("updates the existing assessment in place when its riskcalc_id is known", async () => {
    const context = baseContext({ riskCalculationId: "calc-1" });
    editRiskCalculation.mockResolvedValue({ risk_score: 22, top_contributors: [], riskcalc_id: "calc-1" });

    const { result } = renderHook(useEditAssessmentViewModel, { wrapper: Wrapper(context) });
    await act(async () => {
      await result.current.handleSave();
    });

    expect(editRiskCalculation).toHaveBeenCalledWith("token-123", "calc-1", expect.any(Object));
    expect(predictRisk).not.toHaveBeenCalled();
    expect(result.current.saveSuccess).toBe(true);
    expect(context.setRiskScore).toHaveBeenCalledWith(22);
    expect(context.setRiskCalculationId).toHaveBeenCalledWith("calc-1");
  });

  it("prefers the selected history entry's id over the tracked current one", async () => {
    const context = baseContext({
      riskCalculationId: "calc-current",
      selectedCalculation: { riskcalc_id: "calc-from-history" },
    });
    editRiskCalculation.mockResolvedValue({ risk_score: 5, top_contributors: [], riskcalc_id: "calc-from-history" });

    const { result } = renderHook(useEditAssessmentViewModel, { wrapper: Wrapper(context) });
    await act(async () => {
      await result.current.handleSave();
    });

    expect(editRiskCalculation).toHaveBeenCalledWith("token-123", "calc-from-history", expect.any(Object));
  });

  it("falls back to a plain (unpersisted) prediction when no assessment id is known yet", async () => {
    const context = baseContext();
    predictRisk.mockResolvedValue({ risk_score: 22, top_contributors: [] });

    const { result } = renderHook(useEditAssessmentViewModel, { wrapper: Wrapper(context) });
    await act(async () => {
      await result.current.handleSave();
    });

    // Still passes the access token: an authenticated user with no known
    // riskcalc_id yet should still hit /predict as themselves, not
    // anonymously - see backend/main.py's `if auth is not None`.
    expect(predictRisk).toHaveBeenCalledWith(expect.any(Object), "token-123");
    expect(editRiskCalculation).not.toHaveBeenCalled();
    expect(result.current.saveSuccess).toBe(true);
    expect(context.setRiskScore).toHaveBeenCalledWith(22);
  });
});
