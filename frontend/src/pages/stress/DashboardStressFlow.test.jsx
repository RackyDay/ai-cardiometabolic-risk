import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { RiskContext } from "../../context/RiskContext";
import DashboardStress from "../dashboard/components/DashboardStress";
import StressPage from "./StressPage";
import { getRiskCalculation, saveStressResult } from "../../services/api";

vi.mock("../../services/api", () => ({ getRiskCalculation: vi.fn(), saveStressResult: vi.fn() }));
const answers = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`pss${i + 1}`, 2]));
beforeEach(() => vi.resetAllMocks());
it.each([null, 20])("shows historical stress read-only (score=%s)", async (score) => {
  getRiskCalculation.mockResolvedValue({ context_JSON: score === null ? null : { stress: { answers, score } } });
  setup({ riskcalc_id: "past-id" });
  expect(await screen.findByText(score === null ? "Stress was not calculated for this assessment." : "20 / 40")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /stress module/ })).not.toBeInTheDocument();
  expect(saveStressResult).not.toHaveBeenCalled();
});
function setup(selectedCalculation = null) {
  render(<MemoryRouter initialEntries={["/dashboard"]}>
    <AuthContext.Provider value={{ isAuthenticated: true, accessToken: "token" }}>
      <RiskContext.Provider value={{ selectedCalculation, riskCalculationId: "latest-id",
        stressInputs: {}, completeModule: vi.fn(), setStressInputs: vi.fn() }}>
        <Routes><Route path="/dashboard" element={<DashboardStress />} /><Route path="/stress" element={<StressPage />} /></Routes>
      </RiskContext.Provider>
    </AuthContext.Provider>
  </MemoryRouter>);
}
it("edits the selected assessment, retries a failed save, and reloads on return", async () => {
  let saved = { answers, score: 20 };
  getRiskCalculation.mockImplementation(async () => ({ context_JSON: { stress: saved } }));
  saveStressResult.mockRejectedValueOnce(new Error("offline")).mockImplementationOnce(async () => {
    saved = { answers: { ...answers, pss1: 4 }, score: 22 };
    return { context_JSON: { stress: saved } };
  });
  setup();
  fireEvent.click(await screen.findByRole("link", { name: "Edit stress module" }));
  const fields = await screen.findAllByRole("combobox");
  expect(fields[0]).toHaveValue("2");
  fireEvent.change(fields[0], { target: { value: "4" } });
  fireEvent.click(screen.getByRole("button", { name: "Page 5" }));
  fireEvent.click(screen.getByRole("button", { name: "Save inputs" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save");
  fireEvent.click(screen.getByRole("button", { name: "Save inputs" }));
  expect(await screen.findByText("22 / 40")).toBeInTheDocument();
  expect(saveStressResult).toHaveBeenLastCalledWith("token", "latest-id", { ...answers, pss1: 4 });
});
it("offers completion for missing results and leaves stored data unchanged on back", async () => {
  getRiskCalculation.mockResolvedValue({ context_JSON: null });
  setup();
  fireEvent.click(await screen.findByRole("link", { name: "Complete stress module" }));
  const fields = await screen.findAllByRole("combobox");
  fireEvent.change(fields[0], { target: { value: "1" } });
  fireEvent.click(screen.getByRole("button", { name: /Back to dashboard/ }));
  await waitFor(() => expect(screen.getByRole("link", { name: "Complete stress module" })).toBeInTheDocument());
  expect(saveStressResult).not.toHaveBeenCalled();
});
