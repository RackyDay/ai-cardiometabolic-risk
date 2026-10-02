import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { AuthContext } from "../../context/AuthContext";
import { RiskContext } from "../../context/RiskContext";
import LearnMoreLink from "../dashboard/components/LearnMoreLink";
import { searchMedlinePlus } from "../../services/medlinePlusApi";
import { getLearnRiskFactor, learnRiskFactors } from "./learnRiskFactors";
import LearnPage from "./LearnPage";

vi.mock("../../services/medlinePlusApi", () => ({ searchMedlinePlus: vi.fn() }));
beforeEach(() => {
  searchMedlinePlus.mockReset().mockResolvedValue([]);
});

const smokingArticle = {
  id: "https://medlineplus.gov/quittingsmoking.html",
  title: "Quitting Smoking",
  summary: "Information about quitting smoking.",
  url: "https://medlineplus.gov/quittingsmoking.html",
  source: "MedlinePlus",
};

it.each(learnRiskFactors)("links the model feature $featureKey to its schema topic", (factor) => {
  render(<MemoryRouter><LearnMoreLink feature={factor.featureKey} /></MemoryRouter>);
  expect(screen.getByRole("link", { name: `Learn more about ${factor.title}` }))
    .toHaveAttribute("href", `/learn?factor=${factor.schemaKey}`);
});

it("opens only the linked factor, focuses its card, and loads only its articles", async () => {
  const factor = getLearnRiskFactor("currentSmoker");
  searchMedlinePlus.mockImplementation(async (query) => factor.searchTerms.includes(query) ? [smokingArticle] : []);
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route path="/dashboard" element={<LearnMoreLink feature="currentSmoker" />} />
        <Route path="/learn" element={<LearnPage />} />
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("link", { name: `Learn more about ${factor.title}` }));
  const card = screen.getByRole("article", { name: factor.title });
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.queryByRole("region", { name: "Based on your assessment" })).not.toBeInTheDocument();
  expect(card).toHaveClass("learn-factor-card-focused");
  expect(within(card).getByRole("heading", { name: factor.title })).toHaveFocus();
  expect(screen.getByRole("button", { name: factor.category })).toHaveAttribute("aria-pressed", "true");
  expect(searchMedlinePlus.mock.calls.slice(0, factor.searchTerms.length).map(([query]) => query))
    .toEqual(factor.searchTerms);
  expect(await within(card).findByRole("link", { name: /Quitting Smoking/ }))
    .toHaveAttribute("href", smokingArticle.url);
  await waitFor(() => expect(screen.getByRole("status")).not.toHaveTextContent("Loading"));
  expect(searchMedlinePlus.mock.calls.map(([query]) => query)).toEqual(factor.searchTerms);
});

it.each([...learnRiskFactors.map((factor) => factor.schemaKey), "male", "BPMeds"])("shows one factor on direct links and refreshes for %s", async (key) => {
  const factor = getLearnRiskFactor(key);
  render(<MemoryRouter initialEntries={[`/learn?factor=${key}`]}><LearnPage /></MemoryRouter>);
  expect(screen.getByRole("article", { name: factor.title })).toHaveClass("learn-factor-card-focused");
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getByRole("button", { name: factor.category })).toHaveAttribute("aria-pressed", "true");
  expect(searchMedlinePlus.mock.calls[0][0]).toBe(factor.searchTerms[0]);
  await waitFor(() => expect(screen.getByRole("status")).not.toHaveTextContent("Loading"));
  expect(searchMedlinePlus.mock.calls.map(([query]) => query)).toEqual(factor.searchTerms);
});

it.each([false, true])("hides other assessment topics in the factor view when authenticated=%s", async (isAuthenticated) => {
  const factor = getLearnRiskFactor("currentSmoker");
  render(
    <MemoryRouter initialEntries={["/learn?factor=currentSmoker"]}>
      <AuthContext.Provider value={{ isAuthenticated, user: isAuthenticated ? { id: "user-a" } : null }}>
        <RiskContext.Provider value={{ assessedInputs: { currentSmoker: true, BMI: 31.2, sysBP: 150 } }}>
          <LearnPage />
        </RiskContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
  await waitFor(() => expect(screen.getByRole("status")).not.toHaveTextContent("Loading"));
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getByRole("article", { name: factor.title })).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Based on your assessment" })).not.toBeInTheDocument();
  expect(searchMedlinePlus.mock.calls.map(([query]) => query)).toEqual(factor.searchTerms);
});

it("falls back to general topics for an unknown feature", async () => {
  render(<MemoryRouter initialEntries={["/learn?factor=unknown"]}><LearnPage /></MemoryRouter>);
  expect(screen.getAllByRole("article")).toHaveLength(learnRiskFactors.length);
  expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
  expect(document.querySelector(".learn-factor-card-focused")).not.toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole("status")).not.toHaveTextContent("Loading"));
});

it("keeps filters and independent search available after following a factor link", async () => {
  render(<MemoryRouter initialEntries={["/learn?factor=currentSmoker"]}><LearnPage /></MemoryRouter>);
  await waitFor(() => expect(screen.getByRole("status")).not.toHaveTextContent("Loading"));
  const calls = searchMedlinePlus.mock.calls.length;
  fireEvent.click(screen.getByRole("button", { name: "All" }));
  expect(screen.getAllByRole("article")).toHaveLength(learnRiskFactors.length);
  expect(screen.getByRole("region", { name: "Based on your assessment" })).toBeInTheDocument();
  expect(document.querySelector(".learn-factor-card-focused")).not.toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole("status")).not.toHaveTextContent("Loading"));
  const generalQueries = [...new Set(learnRiskFactors.flatMap((factor) => factor.searchTerms))];
  expect(searchMedlinePlus.mock.calls.slice(calls).map(([query]) => query)).toEqual(generalQueries);

  searchMedlinePlus.mockResolvedValueOnce([smokingArticle]);
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "quitting smoking" } });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  expect(await screen.findByRole("list", { name: "Search results for quitting smoking" })).toBeInTheDocument();
});

it("keeps independent search available without revealing other factor cards", async () => {
  render(<MemoryRouter initialEntries={["/learn?factor=currentSmoker"]}><LearnPage /></MemoryRouter>);
  await waitFor(() => expect(screen.getByRole("status")).not.toHaveTextContent("Loading"));
  searchMedlinePlus.mockResolvedValueOnce([smokingArticle]);
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "quitting smoking" } });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  expect(await screen.findByRole("list", { name: "Search results for quitting smoking" })).toBeInTheDocument();
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getByRole("article", { name: getLearnRiskFactor("currentSmoker").title })).toBeInTheDocument();
  expect(searchMedlinePlus).toHaveBeenLastCalledWith("quitting smoking", expect.objectContaining({ limit: 5 }));
});

it("reloads failures only for the selected factor without getting stuck loading hidden topics", async () => {
  const factor = getLearnRiskFactor("currentSmoker");
  searchMedlinePlus.mockRejectedValue(new Error("Unavailable"));
  render(<MemoryRouter initialEntries={["/learn?factor=currentSmoker"]}><LearnPage /></MemoryRouter>);
  const reload = await screen.findByRole("button", { name: "Reload articles" });
  await waitFor(() => expect(reload).toBeEnabled());
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getByRole("status")).not.toHaveTextContent("Loading");

  searchMedlinePlus.mockResolvedValue([smokingArticle]);
  fireEvent.click(reload);
  const card = screen.getByRole("article", { name: factor.title });
  expect(await within(card).findByRole("link", { name: /Quitting Smoking/ })).toHaveAttribute("href", smokingArticle.url);
  await waitFor(() => expect(screen.getByRole("status")).not.toHaveTextContent("Loading"));
  expect(screen.queryByRole("button", { name: "Reload articles" })).not.toBeInTheDocument();
  expect(searchMedlinePlus.mock.calls.map(([query]) => query)).toEqual([...factor.searchTerms, ...factor.searchTerms]);
});

it("handles a second topic link on the same page and cancels the superseded requests", async () => {
  searchMedlinePlus.mockImplementation(() => new Promise(() => {}));
  render(
    <MemoryRouter initialEntries={["/learn?factor=currentSmoker"]}>
      <Link to="/learn?factor=totChol">Cholesterol topic</Link>
      <LearnPage />
    </MemoryRouter>,
  );
  const firstSignals = searchMedlinePlus.mock.calls.map(([, options]) => options.signal);
  fireEvent.click(screen.getByRole("button", { name: "demographic" }));
  fireEvent.click(screen.getByRole("link", { name: "Cholesterol topic" }));
  const factor = getLearnRiskFactor("totChol");
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getByRole("article", { name: factor.title })).toHaveClass("learn-factor-card-focused");
  expect(within(screen.getByRole("article", { name: factor.title })).getByRole("heading")).toHaveFocus();
  expect(firstSignals.every((signal) => signal.aborted)).toBe(true);
  expect(searchMedlinePlus.mock.calls.slice(-factor.searchTerms.length).map(([query]) => query)).toEqual(factor.searchTerms);
});
