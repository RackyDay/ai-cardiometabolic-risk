import { act, renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { AuthContext } from "../../context/AuthContext";
import { RiskContext } from "../../context/RiskContext";
import { predictRisk } from "../../services/api";
import { useAssessmentViewModel } from "./useAssessmentViewModel";

vi.mock("../../services/api", () => ({ predictRisk: vi.fn() }));
beforeEach(() => { vi.resetAllMocks(); predictRisk.mockResolvedValue({ risk_score: 12, top_contributors: [] }); });

it.each([["token", true, true], ["token", false, false], [null, true, false]])(
  "sends saved stress only for authenticated calculations (token=%s, complete=%s)", async (accessToken, complete, included) => {
    const stressInputs = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`pss${i + 1}`, 2]));
    const risk = {
      riskInputs: { gender: "M", age: 45, education: 2, currentSmoker: false, cigsPerDay: 0,
        bpMeds: false, prevalentStroke: false, prevalentHyp: false, diabetes: false },
      stressInputs, isModuleComplete: (id) => id === "base-risk" || complete,
      setRiskScore: vi.fn(), selectCalculation: vi.fn(), setTopContributors: vi.fn(), setRiskCalculationId: vi.fn(),
    };
    const wrapper = ({ children }) => <MemoryRouter><AuthContext.Provider value={{ accessToken }}>
      <RiskContext.Provider value={risk}>{children}</RiskContext.Provider>
    </AuthContext.Provider></MemoryRouter>;
    const { result } = renderHook(useAssessmentViewModel, { wrapper });
    await act(() => result.current.calculateRisk());
    const payload = predictRisk.mock.calls[0][0];
    expect(payload.stress).toEqual(included ? { answers: stressInputs } : undefined);
  },
);
