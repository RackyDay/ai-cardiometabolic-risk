import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MenuBar from "./MenuBar";
import { AuthContext } from "../../../context/AuthContext";
import { RiskContext } from "../../../context/RiskContext";
import { UnitProvider } from "../../../context/UnitProvider";

// jsdom doesn't implement <dialog>'s close()/showModal() - MenuBar renders
// HistoryDropdown, which calls close() on mount to keep its delete
// confirmation dialog closed by default. Unrelated to the unit toggle this
// file tests.
if (!HTMLDialogElement.prototype.close) {
  HTMLDialogElement.prototype.close = function close() {};
}
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {};
}

const UNIT_GROUP_NAME = /units for glucose and cholesterol/i;

function renderMenuBar(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthContext.Provider
        value={{ user: null, isAuthenticated: false, logOut: vi.fn(), accessToken: null }}
      >
        <RiskContext.Provider
          value={{
            setRiskInputs: vi.fn(),
            selectCalculation: vi.fn(),
            setRiskScore: vi.fn(),
            setTopContributors: vi.fn(),
            calculationDeleted: null,
            setHistoryActivity: vi.fn(),
            viewingCalculationId: null,
            historyActivity: "",
          }}
        >
          <UnitProvider>
            <MenuBar />
          </UnitProvider>
        </RiskContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe("MenuBar unit toggle", () => {
  it("shows the unit toggle on the dashboard", () => {
    renderMenuBar("/dashboard");
    expect(screen.getByRole("group", { name: UNIT_GROUP_NAME })).toBeInTheDocument();
  });

  it("does not show the unit toggle on the input form", () => {
    renderMenuBar("/inputs");
    expect(screen.queryByRole("group", { name: UNIT_GROUP_NAME })).not.toBeInTheDocument();
  });

  it("does not show the unit toggle on other pages", () => {
    renderMenuBar("/");
    expect(screen.queryByRole("group", { name: UNIT_GROUP_NAME })).not.toBeInTheDocument();
  });

  it("switches the active unit when a segment is clicked", () => {
    renderMenuBar("/dashboard");

    const mmolButton = screen.getByRole("button", { name: "mmol/L" });
    const mgButton = screen.getByRole("button", { name: "mg/dL" });

    expect(mgButton).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(mmolButton);

    expect(mmolButton).toHaveAttribute("aria-pressed", "true");
    expect(mgButton).toHaveAttribute("aria-pressed", "false");
  });
});
