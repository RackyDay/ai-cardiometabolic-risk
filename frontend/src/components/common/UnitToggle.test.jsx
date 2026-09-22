import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UnitToggle from "./UnitToggle";
import { MG_DL, MMOL_L } from "../../utils/unitConversion";

describe("UnitToggle", () => {
  it("marks the current unit as active and the other as inactive", () => {
    render(<UnitToggle unit={MG_DL} onChange={() => {}} ariaLabel="Units" />);
    expect(screen.getByRole("button", { name: "mg/dL" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "mmol/L" })).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onChange with the clicked unit, not a flip of the current one", () => {
    const onChange = vi.fn();
    render(<UnitToggle unit={MG_DL} onChange={onChange} ariaLabel="Units" />);
    fireEvent.click(screen.getByRole("button", { name: "mmol/L" }));
    expect(onChange).toHaveBeenCalledWith(MMOL_L);
  });

  it("still calls onChange when the already-active option is clicked", () => {
    const onChange = vi.fn();
    render(<UnitToggle unit={MG_DL} onChange={onChange} ariaLabel="Units" />);
    fireEvent.click(screen.getByRole("button", { name: "mg/dL" }));
    expect(onChange).toHaveBeenCalledWith(MG_DL);
  });
});
