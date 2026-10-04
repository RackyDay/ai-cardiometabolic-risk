import { useContext } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { MemoryRouter, Routes, Route, Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { RiskContext } from "../../context/RiskContext";
import { RiskProvider } from "../../context/RiskProvider";
import StressPage from "./StressPage";
import { calculateStressScore } from "../../schemas/stressInputSchema";

const answers = (values) => Object.fromEntries(values.map((value, index) => [`pss${index + 1}`, value]));
it("scores the four positive items in reverse and rejects incomplete or invalid answers", () => {
  expect(calculateStressScore(answers([0, 0, 0, 4, 4, 0, 4, 4, 0, 0]))).toBe(0);
  expect(calculateStressScore(answers([4, 4, 4, 0, 0, 4, 0, 0, 4, 4]))).toBe(40);
  expect(calculateStressScore(answers([0, 1, 2, 3, 4, 0, 1, 2, 3, 4]))).toBe(16);
  for (const invalid of ["", null, undefined, -1, 5, 1.5, NaN, "2"]) {
    expect(calculateStressScore({ ...answers(Array(10).fill(2)), pss1: invalid })).toBeNull();
  }
});

function Hub() {
  const risk = useContext(RiskContext);
  return <>
    <p>Saved score: {risk.stressScore ?? "none"}</p>
    <Link to="/stress">Review stress</Link>
    <button onClick={risk.startNewAssessment}>New assessment</button>
  </>;
}
function setup() {
  render(<MemoryRouter initialEntries={["/stress"]}>
    <AuthContext.Provider value={{ isAuthenticated: false }}><RiskProvider>
      <Routes><Route path="/stress" element={<StressPage />} /><Route path="/assessment" element={<Hub />} /></Routes>
    </RiskProvider></AuthContext.Provider>
  </MemoryRouter>);
}
it("requires all answers, saves a score, retains answers for review and resets new assessments", () => {
  setup();
  fireEvent.click(screen.getByRole("button", { name: "Page 5" }));
  fireEvent.click(screen.getByRole("button", { name: "Save inputs" }));
  expect(screen.getByText("Questions 1–2 of 10")).toBeInTheDocument();
  expect(screen.getAllByText("Choose a response to this question.")).toHaveLength(2);
  for (let page = 0; page < 5; page++) {
    for (const select of screen.getAllByRole("combobox")) fireEvent.change(select, { target: { value: "0" } });
    if (page < 4) fireEvent.click(screen.getByRole("button", { name: "Next" }));
  }
  fireEvent.click(screen.getByRole("button", { name: "Save inputs" }));
  expect(screen.getByText("Saved score: 16")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("link", { name: "Review stress" }));
  expect(screen.getAllByRole("combobox")[0]).toHaveValue("0");
  fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "4" } });
  fireEvent.click(screen.getByRole("button", { name: /Back to modules/ }));
  expect(screen.getByText("Saved score: none")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "New assessment" }));
  fireEvent.click(screen.getByRole("link", { name: "Review stress" }));
  expect(screen.getAllByRole("combobox")[0]).toHaveValue("");
});
