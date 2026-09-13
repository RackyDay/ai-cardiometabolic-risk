import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RiskFactorInfluenceBadge from "./RiskFactorInfluenceBadge";

const original = { feature: "cigsPerDay", label: "Cigarettes per day", weightPercent: 2, raisesRisk: false };
const updated = { ...original, weightPercent: 14.25, raisesRisk: true };

describe("factor contribution badge", () => {
  it("changes a negative original percentage to the positive what-if result and resets", () => {
    const { rerender } = render(<RiskFactorInfluenceBadge originalFactor={original} />);
    expect(screen.getByText("-2%")).toHaveClass("risk-factor-tag-down");
    rerender(<RiskFactorInfluenceBadge originalFactor={original} hypotheticalFactor={updated} isHypotheticalActive />);
    expect(screen.getByText("+14.3%")).toHaveClass("risk-factor-tag-up");
    expect(screen.getByText("+14.3%")).toHaveAttribute("title", expect.stringContaining("Original: -2%"));
    rerender(<RiskFactorInfluenceBadge originalFactor={original} hypotheticalFactor={updated} />);
    expect(screen.getByText("-2%")).toBeInTheDocument();
  });

  it("shows pending and failed states instead of an obsolete percentage", () => {
    const { rerender } = render(<RiskFactorInfluenceBadge originalFactor={original} hypotheticalFactor={updated} isHypotheticalActive isCalculating />);
    expect(screen.getByText("…")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText("+14.3%")).not.toBeInTheDocument();
    rerender(<RiskFactorInfluenceBadge originalFactor={original} hypotheticalFactor={updated} isHypotheticalActive error="Couldn't update contribution" />);
    expect(screen.getByText("—")).toHaveAttribute("title", "Couldn't update contribution");
  });

  it("does not reuse the original percentage for a factor omitted from the latest top contributors", () => {
    render(<RiskFactorInfluenceBadge originalFactor={original} isHypotheticalActive />);
    expect(screen.getByText("—")).toHaveAttribute("title", expect.stringContaining("outside the returned top contributors"));
  });

  it("shows a neutral zero without a misleading sign", () => {
    render(<RiskFactorInfluenceBadge originalFactor={original} hypotheticalFactor={{ ...updated, weightPercent: 0 }} isHypotheticalActive />);
    expect(screen.getByText("0%")).toHaveClass("risk-factor-tag-neutral");
  });
});
