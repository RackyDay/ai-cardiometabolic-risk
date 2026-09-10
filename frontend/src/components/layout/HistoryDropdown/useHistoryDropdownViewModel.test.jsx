import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getRiskCalculationHistory } from "../../../services/api.js";
import useHistoryDropdownViewModel from "./useHistoryDropdownViewModel";

vi.mock("../../../services/api.js", () => ({
  getRiskCalculationHistory: vi.fn(),
  getRiskCalculation: vi.fn(),
}));

describe("history loading", () => {
  //TC062
  it("shows an error and recovers when retried", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    getRiskCalculationHistory.mockRejectedValueOnce(new Error("Backend unavailable"));
    getRiskCalculationHistory.mockResolvedValueOnce([{ riskcalc_id: "saved" }]);
    const { result } = renderHook(() => useHistoryDropdownViewModel("token", vi.fn()));
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.error).toContain("Couldn't load history"));
    act(() => result.current.retryHistory());
    await waitFor(() => expect(result.current.history).toEqual([{ riskcalc_id: "saved" }]));
    expect(result.current.error).toBe("");
    log.mockRestore();
  });
  //TC063
  it("ignores an earlier session's response and clears history on logout", async () => {
    let resolveOld;
    getRiskCalculationHistory.mockImplementationOnce(() => new Promise((resolve) => {
      resolveOld = resolve;
    }));
    getRiskCalculationHistory.mockResolvedValueOnce([{ riskcalc_id: "new" }]);
    const onLoad = vi.fn();
    const { result, rerender } = renderHook(
      ({ token }) => useHistoryDropdownViewModel(token, onLoad),
      { initialProps: { token: "old-token" } },
    );
    rerender({ token: "new-token" });
    await waitFor(() => expect(result.current.history).toEqual([{ riskcalc_id: "new" }]));
    await act(async () => resolveOld([{ riskcalc_id: "old" }]));
    expect(result.current.history).toEqual([{ riskcalc_id: "new" }]);
    rerender({ token: null });
    expect(result.current.history).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});
