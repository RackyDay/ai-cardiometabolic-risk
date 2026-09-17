import { act, renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../context/AuthContext";
import { RiskContext } from "../../context/RiskContext";
import { getLatestPrediction, getRiskCalculationHistory, predictRisk } from "../../services/api";
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
  setRiskInputs: vi.fn(),
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

function AuthenticatedWrapper({ children }) {
  return <MemoryRouter>
    <AuthContext.Provider value={{ isAuthenticated: true, accessToken: "token" }}>
      <RiskContext.Provider value={context}>{children}</RiskContext.Provider>
    </AuthContext.Provider>
  </MemoryRouter>;
}

beforeEach(() => vi.resetAllMocks());

describe("loading the latest saved assessment", () => {
  it("defaults the what-if sliders to the inputs stored with the latest prediction", async () => {
    getRiskCalculationHistory.mockResolvedValue([]);
    getLatestPrediction.mockResolvedValue({
      has_history: true,
      risk_score: 20,
      top_contributors: [],
      riskcalc_timestamp: "2026-01-01T00:00:00Z",
      inputs: { age: 55, cigsPerDay: 3, currentSmoker: false },
    });

    renderHook(useDashboardViewModel, { wrapper: AuthenticatedWrapper });
    await act(async () => {});

    expect(context.setRiskInputs)
      .toHaveBeenCalledWith({ age: 55, cigsPerDay: 3, currentSmoker: false });
  });

  it("resets to blank inputs when the account has no saved history", async () => {
    getRiskCalculationHistory.mockResolvedValue([]);
    getLatestPrediction.mockResolvedValue({ has_history: false });

    renderHook(useDashboardViewModel, { wrapper: AuthenticatedWrapper });
    await act(async () => {});

    const [resetInputs] = context.setRiskInputs.mock.calls.at(-1);
    expect(resetInputs).toMatchObject({ age: "", gender: "" });
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
