import { Children, cloneElement, isValidElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RiskFactorPieChart from "./RiskFactorPieChart";
import { buildPieData } from "../buildPieData";

// Supply dimensions in jsdom and remove animation timing while exercising
// Recharts' real slices, events, active shapes, and tooltip behavior.
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => {
      const chart = Children.only(children);
      return cloneElement(chart, { width: 400, height: 400 },
        Children.map(chart.props.children, (child) =>
          isValidElement(child) && child.type === actual.Pie
            ? cloneElement(child, { isAnimationActive: false }) : child
        )
      );
    },
  };
});

const age = { feature: "age", label: "Age", weightPercent: 100, raisesRisk: true };

describe("pie hover highlighting", () => {
  const data = buildPieData([
    { ...age, weightPercent: 60 },
    { feature: "BMI", label: "Body mass index", weightPercent: 40, raisesRisk: true },
  ]);

  it("brightens only the hovered slice and clears the card highlight after click and leave", () => {
    const onFactorHover = vi.fn();
    const { container } = render(<RiskFactorPieChart data={data} onFactorHover={onFactorHover} />);
    const sectors = () => [...container.querySelectorAll(".recharts-pie-sector")];
    const opacities = () => sectors().map((sector) => sector.querySelector("path").getAttribute("opacity"));
    expect(opacities()).toEqual(["0.65", "0.65"]);
    fireEvent.mouseEnter(sectors()[0]);
    expect(opacities()).toEqual(["1", "0.65"]);
    expect(onFactorHover).toHaveBeenLastCalledWith("age");
    expect(container.querySelector(".recharts-active-shape")).toBeInTheDocument();
    fireEvent.click(sectors()[0]);
    fireEvent.mouseLeave(sectors()[0]);
    expect(opacities()).toEqual(["0.65", "0.65"]);
    expect(onFactorHover).toHaveBeenLastCalledWith(null);
    expect(container.querySelector(".recharts-active-shape")).not.toBeInTheDocument();
    expect(container.querySelector(".risk-chart-selected-factor")).not.toBeInTheDocument();
    expect(screen.getByText("Hover over a factor to see its contribution.")).toBeInTheDocument();
  });

  it("transfers hover between slices and clears it when the pointer leaves the chart", () => {
    const onFactorHover = vi.fn();
    const { container } = render(<RiskFactorPieChart data={data} onFactorHover={onFactorHover} />);
    const sectors = () => container.querySelectorAll(".recharts-pie-sector");
    fireEvent.mouseEnter(sectors()[0]);
    fireEvent.mouseLeave(sectors()[0]);
    fireEvent.mouseEnter(sectors()[1]);
    expect(onFactorHover).toHaveBeenLastCalledWith("BMI");
    expect(sectors()[0].querySelector("path")).toHaveAttribute("opacity", "0.65");
    expect(sectors()[1].querySelector("path")).toHaveAttribute("opacity", "1");
    fireEvent.mouseLeave(container.querySelector(".risk-chart-container"));
    expect(onFactorHover).toHaveBeenLastCalledWith(null);
    expect(container.querySelector(".recharts-active-shape")).not.toBeInTheDocument();
    expect(sectors()[1].querySelector("path")).toHaveAttribute("opacity", "0.65");
  });
});

describe("fixed factors grouped under Fixed factors", () => {
  it("folds a single fixed factor into its own Fixed factors slice, leaving changeable factors individually labelled", () => {
    const data = buildPieData(
      [
        { ...age, weightPercent: 70 },
        { feature: "BMI", label: "Body mass index", weightPercent: 30, raisesRisk: true },
      ],
      { isFixedFactor: (feature) => feature === "age" }
    );
    const { container } = render(<RiskFactorPieChart data={data} />);
    const labelText = [...container.querySelectorAll(".risk-chart-slice-label")]
      .map((label) => label.textContent)
      .join(" | ");
    expect(labelText).not.toContain("Age");
    expect(labelText).toContain("Body mass index");
    expect(labelText).toContain("Fixed factors");

    const sectors = container.querySelectorAll(".recharts-pie-sector");
    fireEvent.mouseEnter(sectors[sectors.length - 1]);
    const membersList = container.querySelector(".risk-chart-tooltip-members");
    expect(membersList).toBeInTheDocument();
    expect(membersList).toHaveTextContent("Age");
  });

  it("keeps a tiny changeable factor as its own slice instead of grouping it away", () => {
    const data = buildPieData([
      { feature: "BMI", label: "Body mass index", weightPercent: 97, raisesRisk: true },
      { feature: "glucose", label: "Glucose", weightPercent: 3, raisesRisk: true },
    ]);
    const { container } = render(<RiskFactorPieChart data={data} />);
    const labelText = [...container.querySelectorAll(".risk-chart-slice-label")]
      .map((label) => label.textContent)
      .join(" | ");
    expect(labelText).toContain("Glucose");
    expect(labelText).not.toContain("Other factors");
    expect(labelText).not.toContain("Fixed factors");
  });
});

describe("pie without risk-raising effects", () => {
  it("explains an assessment with only risk-lowering factors", () => {
    render(<RiskFactorPieChart data={buildPieData([{ ...age, raisesRisk: false }])} />);
    expect(screen.getByRole("status")).toHaveTextContent("No risk-raising effects");
    expect(screen.getByRole("status")).toHaveTextContent("does not mean the overall risk is zero");
    expect(screen.queryByText(/Submit your health information/)).not.toBeInTheDocument();
  });

  it("does not fall back to the original positive slice when a what-if effect becomes negative", () => {
    render(<RiskFactorPieChart
      data={buildPieData([age])}
      hypotheticalData={buildPieData([{ ...age, raisesRisk: false }])}
      isHypotheticalActive
    />);
    expect(screen.getByRole("status")).toHaveTextContent("in this what-if scenario");
    expect(document.querySelector(".recharts-pie")).not.toBeInTheDocument();
  });

  it("still prompts for an assessment when there are no factors", () => {
    render(<RiskFactorPieChart data={[]} />);
    expect(screen.getByText(/Submit your health information/)).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
