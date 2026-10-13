import { act, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../context/AuthContext";
import { RiskContext } from "../../context/RiskContext";
import {
  getLatestPrediction,
  getRiskCalculation,
  getRiskCalculationHistory,
  predictRisk,
} from "../../services/api";
import { useDashboardViewModel } from "./useDashboardViewModel";

vi.mock("../../services/api", () => ({
  predictRisk: vi.fn(),
  getLatestPrediction: vi.fn(),
  getRiskCalculationHistory: vi.fn(),
  getRiskCalculation: vi.fn(),
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

describe("past calculation status", () => {
  // Regression test: a returning user who logs back in (or refreshes)
  // without submitting anything new this session was previously having
  // their own current/latest assessment mislabeled as a "past
  // calculation", which also disabled the "Edit original assessment"
  // button. Simply auto-loading the latest saved assessment - with
  // nothing picked from history - must never count as "past".
  it("does not treat the auto-loaded latest assessment as a past calculation", async () => {
    const timestamp = "2026-09-16T10:00:00Z";
    getLatestPrediction.mockResolvedValue({
      has_history: true, risk_score: 10, riskcalc_timestamp: timestamp,
    });
    getRiskCalculationHistory.mockResolvedValue([
      { riskcalc_id: "latest", riskcalc_timestamp: timestamp, risk_score: 10 },
      { riskcalc_id: "older", riskcalc_timestamp: "2026-09-01T10:00:00Z", risk_score: 12 },
    ]);
    getRiskCalculation.mockResolvedValue({
      riskcalc_id: "older", risk_score: 12, inputs: originalInputs, top_contributors: [],
    });
    const { result } = renderHook(useDashboardViewModel, { wrapper: AuthenticatedWrapper });
    await waitFor(() => {
      expect(result.current.isLoadingAssessment).toBe(false);
      expect(result.current.isLoadingTrend).toBe(false);
    });
    expect(result.current.pastCalculation).toBeNull();
  });

  it("treats an explicitly selected history entry as a past calculation", async () => {
    getLatestPrediction.mockResolvedValue({ has_history: false });
    getRiskCalculationHistory.mockResolvedValue([]);
    const timestamp = "2026-09-01T10:00:00Z";
    function HistoryWrapper({ children }) {
      return <MemoryRouter>
        <AuthContext.Provider value={{ isAuthenticated: true, accessToken: "token" }}>
          <RiskContext.Provider value={{
            ...context,
            selectedCalculation: {
              riskcalc_id: "older", risk_score: 12, calculationNumber: 1, riskcalc_timestamp: timestamp,
            },
          }}>
            {children}
          </RiskContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>;
    }
    const { result } = renderHook(useDashboardViewModel, { wrapper: HistoryWrapper });
    await waitFor(() => expect(result.current.isLoadingTrend).toBe(false));
    expect(result.current.pastCalculation).toEqual({
      number: 1,
      date: new Date(timestamp).toLocaleString(undefined, {
        day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
      }),
    });
  });
});

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

describe("insights", () => {
  // `context.riskScore` (10), `context.topContributors` and
  // `context.riskInputs` (originalInputs) stand in for "the current
  // assessment" throughout - only the previous one varies per test.
  const history = [
    { riskcalc_id: "calc-current", risk_score: 10, riskcalc_timestamp: "2026-01-02T00:00:00Z" },
    { riskcalc_id: "calc-previous", risk_score: 20, riskcalc_timestamp: "2026-01-01T00:00:00Z" },
  ];

  it("compares against the previous assessment by score and by changed factors", async () => {
    getLatestPrediction.mockResolvedValue({ has_history: false });
    getRiskCalculationHistory.mockResolvedValue(history);
    getRiskCalculation.mockResolvedValue({
      riskcalc_id: "calc-previous",
      risk_score: 20,
      inputs: { cigsPerDay: 8, age: 45, currentSmoker: true },
      top_contributors: [
        { feature: "age", contribution: 80 },
        { feature: "cigsPerDay", contribution: 15 },
      ],
    });

    const { result } = renderHook(useDashboardViewModel, { wrapper: AuthenticatedWrapper });
    await act(async () => {});

    expect(getRiskCalculation).toHaveBeenCalledWith("token", "calc-previous");
    expect(result.current.hasPreviousAssessment).toBe(true);
    expect(result.current.isLoadingInsights).toBe(false);
    expect(result.current.insightsError).toBe("");
    // Age changed too (45 -> 50, contribution 80 -> 98) and would dominate
    // by magnitude, but age is deliberately excluded from factor insights
    // (see "Removed age from insights") - only cigsPerDay surfaces here.
    expect(result.current.insights.map((insight) => insight.key)).toEqual(["overall-risk-score", "cigsPerDay"]);
    expect(result.current.insights[0]).toMatchObject({
      text: "Overall risk score decreased from 20.0% to 10.0%.",
      positive: true,
    });
    // cigsPerDay's contribution went from 15 to -2 (improved).
    expect(result.current.insights[1]).toMatchObject({
      text: "Number of cigarettes smoked per day changed from 8 to 5.",
      positive: true,
    });
  });

  it("never reports an age insight, even when age changed and would otherwise dominate by magnitude", async () => {
    getLatestPrediction.mockResolvedValue({ has_history: false });
    getRiskCalculationHistory.mockResolvedValue(history);
    getRiskCalculation.mockResolvedValue({
      riskcalc_id: "calc-previous",
      risk_score: 20,
      inputs: { cigsPerDay: 5, age: 45, currentSmoker: true },
      top_contributors: [{ feature: "age", contribution: 80 }],
    });

    const { result } = renderHook(useDashboardViewModel, { wrapper: AuthenticatedWrapper });
    await act(async () => {});

    // Only the overall-score insight survives - age changed (45 -> 50) and
    // its contribution shifted (80 -> 98), which would otherwise produce
    // an "age" factor insight, but that's deliberately suppressed.
    expect(result.current.insights.map((insight) => insight.key)).toEqual(["overall-risk-score"]);
  });

  it("reports loading (not 'no previous assessment') while history is still being fetched", async () => {
    let resolveHistory;
    getLatestPrediction.mockResolvedValue({ has_history: false });
    getRiskCalculationHistory.mockImplementation(
      () => new Promise((resolve) => { resolveHistory = resolve; })
    );

    const { result } = renderHook(useDashboardViewModel, { wrapper: AuthenticatedWrapper });
    await act(async () => {});

    // History hasn't resolved yet, so whether there's a previous
    // assessment is genuinely unknown - this must not be reported the
    // same way as "loaded, and there isn't one".
    expect(result.current.isLoadingInsights).toBe(true);

    await act(async () => resolveHistory([history[0]]));

    expect(result.current.isLoadingInsights).toBe(false);
    expect(result.current.hasPreviousAssessment).toBe(false);
  });

  it("reports no previous assessment when there's only one history entry", async () => {
    getLatestPrediction.mockResolvedValue({ has_history: false });
    getRiskCalculationHistory.mockResolvedValue([history[0]]);

    const { result } = renderHook(useDashboardViewModel, { wrapper: AuthenticatedWrapper });
    await act(async () => {});

    expect(getRiskCalculation).not.toHaveBeenCalled();
    expect(result.current.hasPreviousAssessment).toBe(false);
    expect(result.current.insights).toEqual([]);
  });

  it("surfaces an error when the previous assessment fails to load", async () => {
    getLatestPrediction.mockResolvedValue({ has_history: false });
    getRiskCalculationHistory.mockResolvedValue(history);
    getRiskCalculation.mockRejectedValue(new Error("not found"));

    const { result } = renderHook(useDashboardViewModel, { wrapper: AuthenticatedWrapper });
    await act(async () => {});

    expect(result.current.hasPreviousAssessment).toBe(true);
    expect(result.current.insightsError).toBe("Couldn't load your previous assessment.");
    expect(result.current.insights).toEqual([]);
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

describe("history transition loading", () => {
  it("hides the previous assessment until the post-deletion refresh finishes", async () => {
    let revision = 0;
    let activity = "";
    let finishRefresh;
    getLatestPrediction.mockResolvedValueOnce({ has_history: true, risk_score: 10 });
    getLatestPrediction.mockImplementationOnce(() => new Promise((resolve) => { finishRefresh = resolve; }));
    getRiskCalculationHistory.mockResolvedValue([]);
    function HistoryWrapper({ children }) {
      return <MemoryRouter>
        <AuthContext.Provider value={{ isAuthenticated: true, accessToken: "token" }}>
          <RiskContext.Provider value={{ ...context, historyRevision: revision, historyActivity: activity }}>
            {children}
          </RiskContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>;
    }
    const { result, rerender } = renderHook(useDashboardViewModel, { wrapper: HistoryWrapper });
    await waitFor(() => expect(result.current.isLoadingAssessment).toBe(false));
    activity = "Deleting calculation�";
    rerender();
    expect(result.current.isLoadingAssessment).toBe(true);
    expect(result.current.assessmentLoadingMessage).toBe(activity);
    activity = "";
    revision = 1;
    rerender();
    expect(result.current.isLoadingAssessment).toBe(true);
    await act(async () => finishRefresh({ has_history: false }));
    expect(result.current.isLoadingAssessment).toBe(false);
    expect(context.setRiskScore).toHaveBeenLastCalledWith(null);
    activity = "Loading calculation�";
    rerender();
    expect(result.current.isLoadingAssessment).toBe(true);
    activity = "";
    rerender();
    expect(result.current.isLoadingAssessment).toBe(false);
  });
});
