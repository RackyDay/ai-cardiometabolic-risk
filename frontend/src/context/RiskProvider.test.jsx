import { useContext } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { AuthContext } from "./AuthContext";
import { RiskContext } from "./RiskContext";
import { RiskProvider } from "./RiskProvider";

function Dashboard() {
  const { selectedCalculation, selectCalculation } = useContext(RiskContext);
  return <>
    <span>{selectedCalculation?.riskcalc_id ?? "latest"}</span>
    <button onClick={() => selectCalculation({ riskcalc_id: "older-assessment", risk_score: 12 })}>Select older</button>
    <button onClick={() => selectCalculation(null)}>New calculation</button>
  </>;
}

function App({ page = "dashboard", userId = "user-a" }) {
  return <AuthContext.Provider value={{ user: userId ? { id: userId } : null, isAuthenticated: Boolean(userId) }}>
    <RiskProvider>{page === "dashboard" ? <Dashboard /> : <div>Another screen</div>}</RiskProvider>
  </AuthContext.Provider>;
}
//TC064
it("keeps a selected calculation when the dashboard unmounts and resets for a new calculation", () => {
  const { rerender } = render(<App />);
  fireEvent.click(screen.getByText("Select older"));
  rerender(<App page="other" />);
  rerender(<App />);
  expect(screen.getByText("older-assessment")).toBeInTheDocument();
  fireEvent.click(screen.getByText("New calculation"));
  expect(screen.getByText("latest")).toBeInTheDocument();
});

//TC065
it("does not carry a selection across accounts or sign-out", () => {
  const { rerender } = render(<App />);
  fireEvent.click(screen.getByText("Select older"));
  rerender(<App userId="user-b" />);
  expect(screen.getByText("latest")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Select older"));
  rerender(<App userId={null} />);
  rerender(<App userId="user-b" />);
  expect(screen.getByText("latest")).toBeInTheDocument();
});
