import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RiskFactorStackedBars from "./RiskFactorStackedBars";
import { buildPieData } from "../buildPieData";

const changeableFactor = {
  feature: "BMI",
  label: "Body mass index",
  weightPercent: 60,
  raisesRisk: true,
};

const fixedFactor = {
  feature: "age",
  label: "Age",
  weightPercent: 40,
  raisesRisk: true,
};

describe("RiskFactorStackedBars", () => {
  it("splits the pie's data into one bar per category and sums both to the risk score", () => {
    const data = buildPieData([changeableFactor, fixedFactor], {
      riskScore: 20,
      isFixedFactor: (feature) => feature === "age",
    });

    const { container } = render(<RiskFactorStackedBars data={data} />);

    expect(screen.getByText("Changeable factors")).toBeInTheDocument();
    expect(screen.getByText("Fixed factors")).toBeInTheDocument();

    // 60/100 * 20 = 12, 40/100 * 20 = 8, summing back to the 20% risk score.
    expect(screen.getByText("12.00% of 20.00%")).toBeInTheDocument();
    expect(screen.getByText("8.00% of 20.00%")).toBeInTheDocument();
    expect(screen.getByText("12.00% changeable")).toBeInTheDocument();
    expect(screen.getByText("8.00% fixed")).toBeInTheDocument();
    expect(screen.getByText("20.00% total risk score")).toBeInTheDocument();

    const segments = container.querySelectorAll(".risk-stacked-bar-segment");
    expect(segments).toHaveLength(2);
  });

  it("shows a per-category empty message when one category has no risk-raising factors", () => {
    const data = buildPieData([changeableFactor], {
      riskScore: 12,
      isFixedFactor: () => false,
    });

    render(<RiskFactorStackedBars data={data} />);

    expect(screen.getByText(/No risk-raising fixed factors/)).toBeInTheDocument();
    expect(screen.queryByText(/No risk-raising changeable factors/)).not.toBeInTheDocument();
  });

  it("renders nothing when there are no risk-raising factors at all", () => {
    const data = buildPieData([{ ...changeableFactor, raisesRisk: false }]);
    const { container } = render(<RiskFactorStackedBars data={data} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the hovered segment's exact contribution in a tooltip", () => {
    const data = buildPieData([changeableFactor, fixedFactor], {
      riskScore: 20,
      isFixedFactor: (feature) => feature === "age",
    });
    const { container } = render(<RiskFactorStackedBars data={data} />);

    const segment = container.querySelector(".risk-stacked-bar-segment");
    fireEvent.mouseEnter(segment);

    expect(container.querySelector(".risk-stacked-bar-tooltip")).toBeInTheDocument();
    expect(container.querySelector(".risk-stacked-bar-tooltip")).toHaveTextContent("Body mass index");
    expect(container.querySelector(".risk-stacked-bar-tooltip")).toHaveTextContent("12.00% of 20.00%");
  });
});
