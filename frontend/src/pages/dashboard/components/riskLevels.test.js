import { describe, expect, it } from "vitest";
import { RISK_ZONES, getRiskZone, formatRiskRange } from "./riskLevels";

describe("getRiskZone", () => {
  it("resolves scores under 20% to their single-zone level", () => {
    expect(getRiskZone(2).key).toBe("low");
    expect(getRiskZone(6).key).toBe("borderline");
    expect(getRiskZone(15).key).toBe("moderate");
  });

  it("splits the high-risk band (20-100%) into five distinct severities", () => {
    expect(getRiskZone(20).key).toBe("high-20");
    expect(getRiskZone(25).key).toBe("high-20");
    expect(getRiskZone(30).key).toBe("high-30");
    expect(getRiskZone(45).key).toBe("high-30");
    expect(getRiskZone(50).key).toBe("high-50");
    expect(getRiskZone(79).key).toBe("high-50");
    expect(getRiskZone(80).key).toBe("high-80");
    expect(getRiskZone(89).key).toBe("high-80");
    expect(getRiskZone(90).key).toBe("high-90");
    expect(getRiskZone(99).key).toBe("high-90");
  });

  it("gives every high-risk zone a different, progressively darker color", () => {
    const colors = ["high-20", "high-30", "high-50", "high-80", "high-90"].map(
      (key) => RISK_ZONES.find((zone) => zone.key === key).color
    );
    expect(new Set(colors).size).toBe(5);
  });

  it("clamps out-of-range scores to the nearest boundary zone", () => {
    expect(getRiskZone(-5).key).toBe("low");
    expect(getRiskZone(150).key).toBe("high-90");
  });

  it("labels 45%, 60% and 95% differently even though all are 'high' by the old coarse grouping", () => {
    expect(getRiskZone(45).label).toBe("Very High Risk");
    expect(getRiskZone(60).label).toBe("Severe Risk");
    expect(getRiskZone(95).label).toBe("Extreme Risk");
    const labels = [getRiskZone(45).label, getRiskZone(60).label, getRiskZone(95).label];
    expect(new Set(labels).size).toBe(3);
  });
});

describe("severityTag", () => {
  // The headline reads "{label} – {severityTag}" on one line - this stays
  // a regression guard on combined length so a future wording change
  // doesn't silently reintroduce wrapping at mobile widths (verified
  // visually: ~34 combined characters is the practical ceiling before it
  // wraps around 390px, even lower on a 320px phone).
  it("keeps every zone's label + severity tag short enough to fit on one line", () => {
    const tooLong = RISK_ZONES.filter(
      (zone) => zone.label.length + 3 + zone.severityTag.length > 34
    );
    expect(tooLong.map((zone) => zone.key)).toEqual([]);
  });
});

describe("formatRiskRange", () => {
  it("formats a closed range and leaves the open-ended top zone as a plus", () => {
    expect(formatRiskRange({ min: 30, max: 50 })).toBe("30–50%");
    expect(formatRiskRange({ min: 90, max: 100 })).toBe("90%+");
  });
});
