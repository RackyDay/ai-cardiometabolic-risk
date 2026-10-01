import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { RiskContext } from "../../context/RiskContext";
import { RiskProvider } from "../../context/RiskProvider";
import { useContext } from "react";
import InputPage from "../input/InputPage";
import AssessmentPage from "./AssessmentPage";
import { predictRisk } from "../../services/api";

vi.mock("../../services/api", () => ({ predictRisk: vi.fn() }));
const inputs = {
  gender: "M", age: 45, education: 2, currentSmoker: false, cigsPerDay: 0,
  bpMeds: false, prevalentStroke: false, prevalentHyp: false, diabetes: false,
  sysBP: 130, diaBP: 85, BMI: 26.5, heartRate: 75, glucose: 90, totChol: 210,
};
function SeedInputs() {
  const risk = useContext(RiskContext);
  return <button onClick={() => risk.setRiskInputs(inputs)}>Fill valid inputs</button>;
}
function setup() {
  render(
    <MemoryRouter initialEntries={["/inputs"]}>
      <AuthContext.Provider value={{ isAuthenticated: false, accessToken: "token" }}>
        <RiskProvider>
          <SeedInputs />
          <Routes>
            <Route path="/inputs" element={<InputPage />} />
            <Route path="/assessment" element={<AssessmentPage />} />
            <Route path="/dashboard" element={<h1>Dashboard result</h1>} />
          </Routes>
        </RiskProvider>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}
function lastPage() {
  const pages = screen.getAllByRole("button", { name: /^\d+$/ });
  fireEvent.click(pages[pages.length - 1]);
}
beforeEach(() => vi.resetAllMocks());

it("loops modules in both directions without an end stop", () => {
  setup();
  fireEvent.click(screen.getByRole("button", { name: /Back/ }));
  const previous = screen.getByRole("button", { name: "Previous module" });
  const next = screen.getByRole("button", { name: "Next module" });
  vi.useFakeTimers();
  const move = (button) => {
    fireEvent.click(button);
    act(() => vi.advanceTimersByTime(450));
  };
  expect(previous).toBeEnabled();
  expect(screen.getByRole("heading", { name: "Base risk inputs" })).toBeInTheDocument();
  move(next);
  expect(screen.getByRole("heading", { name: "Stress Levels" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Coming soon" })).toBeDisabled();
  move(next);
  expect(screen.getByRole("heading", { name: "More modules coming soon" })).toBeInTheDocument();
  expect(next).toBeEnabled();
  move(next);
  expect(screen.getByRole("heading", { name: "Base risk inputs" })).toBeInTheDocument();
  move(previous);
  expect(screen.getByRole("heading", { name: "More modules coming soon" })).toBeInTheDocument();
  move(previous);
  expect(screen.getByRole("heading", { name: "Stress Levels" })).toBeInTheDocument();
  expect(predictRisk).not.toHaveBeenCalled();
  vi.useRealTimers();
});

it("returns Back to modules and prevents calculation before saving", () => {
  setup();
  fireEvent.click(screen.getByRole("button", { name: /Back/ }));
  expect(screen.getByRole("button", { name: "Calculate risk score" })).toBeDisabled();
  expect(predictRisk).not.toHaveBeenCalled();
});

it("validates before saving inputs", () => {
  setup();
  lastPage();
  fireEvent.click(screen.getByRole("button", { name: "Save inputs" }));
  expect(screen.getAllByText("This field is required").length).toBeGreaterThan(0);
  expect(screen.queryByRole("button", { name: "Calculate risk score" })).not.toBeInTheDocument();
  expect(predictRisk).not.toHaveBeenCalled();
});

it("saves without predicting, then calculates from modules with retry on failure", async () => {
  setup();
  fireEvent.click(screen.getByRole("button", { name: "Fill valid inputs" }));
  lastPage();
  fireEvent.click(screen.getByRole("button", { name: "Save inputs" }));
  expect(predictRisk).not.toHaveBeenCalled();
  const calculate = screen.getByRole("button", { name: "Calculate risk score" });
  expect(calculate).toBeEnabled();
  predictRisk.mockRejectedValueOnce(new Error("Offline"));
  fireEvent.click(calculate);
  expect(calculate).toBeDisabled();
  expect(await screen.findByRole("alert")).toHaveTextContent("Please try again");
  predictRisk.mockResolvedValueOnce({ risk_score: 22, top_contributors: [], riskcalc_id: "calc-1" });
  fireEvent.click(calculate);
  await waitFor(() => expect(screen.getByText("Dashboard result")).toBeInTheDocument());
  expect(predictRisk).toHaveBeenCalledTimes(2);
  expect(predictRisk).toHaveBeenLastCalledWith(expect.any(Object), "token");
});
