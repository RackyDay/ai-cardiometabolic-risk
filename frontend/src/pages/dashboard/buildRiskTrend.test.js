import { describe, expect, it } from "vitest";
import { buildRiskTrend } from "./buildRiskTrend";

const history = [
  { riskcalc_id: "new", risk_score: 30, riskcalc_timestamp: "2026-09-10T12:00:00Z" },
  { riskcalc_id: "selected", risk_score: 20, riskcalc_timestamp: "2026-09-10T10:00:00Z" },
  { riskcalc_id: "old", risk_score: 0, riskcalc_timestamp: "2026-09-01T10:00:00Z" },
];

describe("risk trend", () => {
  //TC066
  it("includes the selected calculation and earlier scores in time order", () => {
    expect(buildRiskTrend(history, "selected").map((point) => point.risk)).toEqual([0, 20]);
  });
  //TC067
  it("uses the displayed latest assessment's timestamp as the cutoff", () => {
    expect(buildRiskTrend(history, null, history[0].riskcalc_timestamp)).toHaveLength(3);
  });
  //TC068
  it("does not substitute another assessment when the selection is missing", () => {
    expect(buildRiskTrend(history, "missing")).toEqual([]);
  });
});
