import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RiskGauge from "./RiskGauge";

function headlineText(container) {
  return container.querySelector(".risk-level-label").textContent;
}

function summaryText(container) {
  return container.querySelector(".risk-level-summary").textContent;
}

describe("RiskGauge severity breakdown", () => {
  it("shows the specific high-risk severity in the headline, not just 'High Risk'", () => {
    const { container } = render(<RiskGauge score={45} />);
    expect(headlineText(container)).toBe("Very High Risk");
  });

  it("shows 'Severe Risk' partway up the top band", () => {
    const { container } = render(<RiskGauge score={60} />);
    expect(headlineText(container)).toBe("Severe Risk");
  });

  it("shows 'Critical Risk' higher still", () => {
    const { container } = render(<RiskGauge score={85} />);
    expect(headlineText(container)).toBe("Critical Risk");
  });

  it("shows 'Extreme Risk' at the very top of the scale", () => {
    const { container } = render(<RiskGauge score={95} />);
    expect(headlineText(container)).toBe("Extreme Risk");
  });

  it("still shows plain 'High Risk' just above the 20% threshold", () => {
    const { container } = render(<RiskGauge score={22} />);
    expect(headlineText(container)).toBe("High Risk");
  });

  it("lists every severity tier in the always-visible legend, not only on hover", () => {
    render(<RiskGauge score={10} />);
    const legend = screen.getByLabelText("Risk level reference");
    expect(legend).toHaveTextContent("High Risk");
    expect(legend).toHaveTextContent("Very High Risk");
    expect(legend).toHaveTextContent("Severe Risk");
    expect(legend).toHaveTextContent("Critical Risk");
    expect(legend).toHaveTextContent("Extreme Risk");
  });

  it("highlights only the matching zone's legend row as the current range", () => {
    render(<RiskGauge score={85} />);
    const legend = screen.getByLabelText("Risk level reference");
    const rows = [...legend.querySelectorAll(".risk-legend-row")];
    const activeRows = rows.filter((row) => row.className.includes("risk-legend-row-active"));
    expect(activeRows).toHaveLength(1);
    expect(activeRows[0]).toHaveTextContent("Critical Risk");
  });

  it("appends a short severity tag to the headline label for every zone", () => {
    const { container: high } = render(<RiskGauge score={25} />);
    expect(summaryText(high)).toBe("High Risk – Medical review advised");

    const { container: veryHigh } = render(<RiskGauge score={45} />);
    expect(summaryText(veryHigh)).toBe("Very High Risk – Needs treatment");

    const { container: critical } = render(<RiskGauge score={85} />);
    expect(summaryText(critical)).toBe("Critical Risk – Specialist care");

    const { container: extreme } = render(<RiskGauge score={97} />);
    expect(summaryText(extreme)).toBe("Extreme Risk – Emergency care");
  });
});
