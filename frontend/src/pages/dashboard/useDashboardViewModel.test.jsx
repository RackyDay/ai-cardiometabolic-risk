import { act, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../context/AuthContext";
import { RiskContext } from "../../context/RiskContext";
import { predictRisk, getLatestPrediction, getRiskCalculationHistory } from "../../services/api";
import { useDashboardViewModel } from "./useDashboardViewModel";

vi.mock("../../services/api", () => ({
  predictRisk: vi.fn(),
  getLatestPrediction: vi.fn(),
  getRiskCalculationHistory: vi.fn(),
}));

const originalInputs = { cigsPerDay: 5, age: 50, currentSmoker: true };
const context = {
  riskInputs: originalInputs,
  riskScore: 10,
  topContributors: [
    { feature: "age", contribution: 98 },
    { feature: "cigsPerDay", contribution: -2 },
  ],
  setRiskScore: vi.fn(),
  setTopContributors: vi.fn(),
};
const prediction = {
  risk_score: 15,
  top_contributors: [
    { feature: "cigsPerDay", contribution: 10 },
    { feature: "age", contribution: 90 },
  ],
};

function Wrapper({ children }) {
  return <MemoryRouter>
    <AuthContext.Provider value={{ isAuthenticated: false, accessToken: null }}>
      <RiskContext.Provider value={context}>{children}</RiskContext.Provider>
    </AuthContext.Provider>
  </MemoryRouter>;
}

beforeEach(() => vi.resetAllMocks());

describe("automatically loaded calculation title", () => {
  it.each([false, true])("handles a fresh submission flag of %s", async (hasFreshCalculation) => {
    const timestamp = "2026-09-16T10:00:00Z";
    getLatestPrediction.mockResolvedValue({
      has_history: true, risk_score: 10, riskcalc_timestamp: timestamp,
    });
    getRiskCalculationHistory.mockResolvedValue([
      { riskcalc_id: "latest", riskcalc_timestamp: timestamp, risk_score: 10 },
      { riskcalc_id: "older", riskcalc_timestamp: "2026-09-01T10:00:00Z", risk_score: 12 },
    ]);
    function AuthenticatedWrapper({ children }) {
      return <MemoryRouter>
        <AuthContext.Provider value={{ isAuthenticated: true, accessToken: "token" }}>
          <RiskContext.Provider value={{ ...context, hasFreshCalculation }}>
            {children}
          </RiskContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>;
    }
    const { result } = renderHook(useDashboardViewModel, { wrapper: AuthenticatedWrapper });
    await waitFor(() => {
      expect(result.current.isLoadingAssessment).toBe(false);
      expect(result.current.isLoadingTrend).toBe(false);
    });
    if (hasFreshCalculation) {
      expect(result.current.pastCalculation).toBeNull();
    } else {
      expect(result.current.pastCalculation).toEqual({
        number: 2,
        date: new Date(timestamp).toLocaleString(undefined, {
          day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
        }),
      });
    }
  });
});

describe("what-if contribution updates", () => {
  it("uses the newest slider prediction even when an older response arrives last", async () => {
    let resolveOld;
    predictRisk.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    predictRisk.mockResolvedValueOnce(prediction);
    const { result } = renderHook(useDashboardViewModel, { wrapper: Wrapper });
    act(() => { void result.current.updateHypotheticalInput("cigsPerDay", 20); });
    expect(result.current.isCalculatingHypothetical).toBe(true);
    await act(async () => { await result.current.updateHypotheticalInput("cigsPerDay", 41); });
    expect(predictRisk).toHaveBeenLastCalledWith(expect.objectContaining({ cigsPerDay: 41 }));
    expect(result.current.hypotheticalRiskFactors.find((factor) => factor.feature === "cigsPerDay"))
      .toMatchObject({ weightPercent: 10, raisesRisk: true });
    await act(async () => resolveOld({ risk_score: 5, top_contributors: context.topContributors }));
    expect(result.current.hypotheticalScore).toBe(15);
    expect(result.current.isCalculatingHypothetical).toBe(false);
    expect(result.current.riskFactors.find((factor) => factor.feature === "cigsPerDay"))
      .toMatchObject({ weightPercent: 2, raisesRisk: false });
  });

  it.each(["reset", "original slider value"])("ignores pending responses after returning to the original with %s", async (method) => {
    let resolvePending;
    predictRisk.mockImplementationOnce(() => new Promise((resolve) => { resolvePending = resolve; }));
    const { result } = renderHook(useDashboardViewModel, { wrapper: Wrapper });
    act(() => { void result.current.updateHypotheticalInput("cigsPerDay", 41); });
    act(() => {
      if (method === "reset") result.current.resetHypothetical();
      else void result.current.updateHypotheticalInput("cigsPerDay", 5);
    });
    expect(result.current.isHypotheticalActive).toBe(false);
    expect(result.current.isCalculatingHypothetical).toBe(false);
    await act(async () => resolvePending(prediction));
    expect(result.current.hypotheticalRiskFactors).toEqual([]);
    expect(result.current.hypotheticalScore).toBeNull();
  });

  it("reports a failed prediction so the badge can hide obsolete values", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    predictRisk.mockRejectedValueOnce(new Error("Network unavailable"));
    const { result } = renderHook(useDashboardViewModel, { wrapper: Wrapper });
    await act(async () => { await result.current.updateHypotheticalInput("cigsPerDay", 41); });
    expect(result.current.hypotheticalError).toContain("Couldn't update");
    expect(result.current.isCalculatingHypothetical).toBe(false);
    log.mockRestore();
  });
});
