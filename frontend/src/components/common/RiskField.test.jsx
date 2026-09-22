import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RiskField from "./RiskField";
import { riskInputSchema } from "../../schemas/riskInputSchema";
import { MG_DL, MMOL_L } from "../../utils/unitConversion";

const glucoseField = { name: "glucose", ...riskInputSchema.glucose };
const heartRateField = { name: "heartRate", ...riskInputSchema.heartRate };

describe("RiskField unit toggle", () => {
  it("shows an inline unit toggle for a convertible field", () => {
    render(
      <RiskField
        field={glucoseField}
        value={100}
        onChange={() => {}}
        unit={MG_DL}
        onUnitChange={() => {}}
      />
    );
    expect(
      screen.getByRole("group", { name: `Units for ${glucoseField.print_name}` })
    ).toBeInTheDocument();
  });

  it("does not show a toggle for a field with no conversion factor", () => {
    render(
      <RiskField
        field={heartRateField}
        value={72}
        onChange={() => {}}
        unit={MG_DL}
        onUnitChange={() => {}}
      />
    );
    expect(
      screen.queryByRole("group", { name: `Units for ${heartRateField.print_name}` })
    ).not.toBeInTheDocument();
  });

  it("does not show a toggle when no onUnitChange is supplied", () => {
    render(<RiskField field={glucoseField} value={100} onChange={() => {}} />);
    expect(
      screen.queryByRole("group", { name: `Units for ${glucoseField.print_name}` })
    ).not.toBeInTheDocument();
  });

  it("converts the displayed value and calls onUnitChange with the clicked unit", () => {
    const onUnitChange = vi.fn();
    render(
      <RiskField
        field={glucoseField}
        value={100}
        onChange={() => {}}
        unit={MG_DL}
        onUnitChange={onUnitChange}
      />
    );

    expect(screen.getByRole("spinbutton")).toHaveValue(100);

    fireEvent.click(screen.getByRole("button", { name: "mmol/L" }));
    expect(onUnitChange).toHaveBeenCalledWith(MMOL_L);
  });

  it("displays an already-mmol/L value converted, independently of the mg/dL prop it started with", () => {
    render(
      <RiskField
        field={glucoseField}
        value={100}
        onChange={() => {}}
        unit={MMOL_L}
        onUnitChange={() => {}}
      />
    );
    expect(screen.getByRole("spinbutton")).toHaveValue(5.55);
  });

  it("converts a typed mmol/L value back to mg/dL before calling onChange", () => {
    const onChange = vi.fn();
    render(
      <RiskField
        field={glucoseField}
        value={100}
        onChange={onChange}
        unit={MMOL_L}
        onUnitChange={() => {}}
      />
    );
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "6" } });
    expect(onChange).toHaveBeenCalledWith(108.11);
  });
});
