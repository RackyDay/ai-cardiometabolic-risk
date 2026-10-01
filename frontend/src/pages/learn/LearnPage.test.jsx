import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { AuthContext } from "../../context/AuthContext";
import { RiskContext } from "../../context/RiskContext";
import { riskInputSchema } from "../../schemas/riskInputSchema";
import { learnRiskFactors } from "./learnRiskFactors";
import LearnPage from "./LearnPage";
import RiskFactorEducationCard from "./components/RiskFactorEducationCard";
import { searchMedlinePlus } from "../../services/medlinePlusApi";

vi.mock("../../services/medlinePlusApi", () => ({ searchMedlinePlus: vi.fn() }));
beforeEach(() => {
  searchMedlinePlus.mockReset().mockImplementation(() => new Promise(() => {}));
});

const schemaFields = Object.values(riskInputSchema);

it("offers every schema factor to a guest without requiring providers", () => {
  render(<LearnPage />);

  const explore = screen.getByRole("region", { name: "Explore heart health" });
  expect(within(explore).getAllByRole("article")).toHaveLength(schemaFields.length);
  for (const field of schemaFields) {
    expect(within(explore).getByRole("heading", { level: 4, name: field.print_name })).toBeInTheDocument();
    expect(within(explore).getByRole("article", { name: field.print_name })).toBeInTheDocument();
  }
  expect(within(explore).getAllByRole("heading", { level: 3 }))
    .toHaveLength(new Set(schemaFields.map((field) => field.category)).size);
});

it.each([
  { riskInputs: null, riskScore: null, topContributors: null },
  { riskInputs: {}, riskScore: null, topContributors: [] },
  {
    riskInputs: { currentSmoker: false, cigsPerDay: 0, BMI: null, glucose: null, totChol: null },
    riskScore: 0,
    topContributors: [],
  },
])("keeps general education available with missing or partial assessment data: %j", (assessment) => {
  render(
    <RiskContext.Provider value={assessment}>
      <LearnPage />
    </RiskContext.Provider>,
  );

  expect(screen.getAllByRole("article")).toHaveLength(schemaFields.length);
  expect(screen.getByRole("region", { name: "Based on your assessment" }))
    .toHaveTextContent("with or without an assessment");
});

it("keeps general education available across sign-in and sign-out without changing an assessment", () => {
  const setRiskInputs = vi.fn();
  const setRiskScore = vi.fn();
  const selectCalculation = vi.fn();
  const assessment = {
    riskInputs: Object.freeze({ age: 50, bpMeds: false, glucose: null }),
    riskScore: 12,
    topContributors: [{ feature: "male", contribution: 0.5 }],
    selectedCalculation: { riskcalc_id: "saved", inputs: { age: 45, BMI: null } },
    setRiskInputs,
    setRiskScore,
    selectCalculation,
  };
  const page = (isAuthenticated) => (
    <AuthContext.Provider value={{ isAuthenticated, user: isAuthenticated ? { id: "user-a" } : null }}>
      <RiskContext.Provider value={assessment}>
        <LearnPage />
      </RiskContext.Provider>
    </AuthContext.Provider>
  );

  const { rerender } = render(page(false));
  for (const signedIn of [true, false]) {
    rerender(page(signedIn));
    expect(screen.getAllByRole("article")).toHaveLength(schemaFields.length);
    expect(screen.getByRole("region", { name: "Based on your assessment" }))
      .toHaveTextContent("Personalised education will appear here when it is available.");
  }
  const publicQueries = learnRiskFactors.flatMap((factor) => factor.searchTerms);
  expect(searchMedlinePlus).toHaveBeenCalled();
  for (const [query] of searchMedlinePlus.mock.calls) expect(publicQueries).toContain(query);
  expect(setRiskInputs).not.toHaveBeenCalled();
  expect(setRiskScore).not.toHaveBeenCalled();
  expect(selectCalculation).not.toHaveBeenCalled();
});

const article = {
  id: "https://medlineplus.gov/heartdiseases.html", title: "Heart Diseases",
  summary: "An educational overview.", url: "https://medlineplus.gov/heartdiseases.html", source: "MedlinePlus",
};

it("loads real article links through the service with bounded, deduplicated queries", async () => {
  let resolve;
  const pending = new Promise((done) => { resolve = done; });
  searchMedlinePlus.mockReturnValue(pending);
  render(<LearnPage />);
  expect(screen.getByRole("status")).toHaveTextContent("Loading educational articles");
  expect(screen.queryByRole("button", { name: "Reload articles" })).not.toBeInTheDocument();
  expect(searchMedlinePlus).toHaveBeenCalledTimes(3);
  await act(async () => resolve([article]));

  await waitFor(() => expect(screen.getByRole("status")).not.toHaveTextContent("Loading"));
  const queries = new Set(learnRiskFactors.flatMap((factor) => factor.searchTerms));
  expect(searchMedlinePlus).toHaveBeenCalledTimes(queries.size);
  const links = screen.getAllByRole("link", { name: /Heart Diseases/ });
  expect(links).toHaveLength(schemaFields.length);
  expect(links[0]).toHaveAttribute("href", article.url);
  expect(links[0]).toHaveAttribute("rel", "noopener noreferrer");
  expect(links[0]).toHaveAccessibleName("Heart Diseases (opens in a new tab)");
  expect(screen.getAllByText("Source: MedlinePlus")).toHaveLength(schemaFields.length);
  expect(screen.queryByRole("button", { name: "Reload articles" })).not.toBeInTheDocument();
  for (const [, options] of searchMedlinePlus.mock.calls) expect(options.limit).toBe(1);
});

it("distinguishes empty results from failures, keeps the overview, and can reload", async () => {
  searchMedlinePlus.mockImplementation(async (query) => {
    if (query === learnRiskFactors[0].searchTerms[0]) throw new Error("Unavailable");
    return [];
  });
  render(<LearnPage />);
  const reload = await screen.findByRole("button", { name: "Reload articles" });
  await waitFor(() => expect(reload).toBeEnabled());
  expect(screen.getAllByText(/No MedlinePlus articles found/)).toHaveLength(schemaFields.length - 1);
  expect(screen.getByText(/Articles are unavailable right now/)).toBeInTheDocument();
  expect(screen.getByText(learnRiskFactors[0].description)).toBeInTheDocument();

  searchMedlinePlus.mockResolvedValue([article]);
  fireEvent.click(reload);
  expect(screen.queryByRole("button", { name: "Reload articles" })).not.toBeInTheDocument();
  await waitFor(() => expect(screen.getAllByRole("link", { name: /Heart Diseases/ })).toHaveLength(schemaFields.length));
  expect(screen.queryByRole("button", { name: "Reload articles" })).not.toBeInTheDocument();
  expect(screen.queryByText(/Articles are unavailable right now/)).not.toBeInTheDocument();
});

it("cancels pending article searches when leaving Learn", async () => {
  let resolve;
  searchMedlinePlus.mockReturnValue(new Promise((done) => { resolve = done; }));
  const { unmount } = render(<LearnPage />);
  const signals = searchMedlinePlus.mock.calls.map(([, options]) => options.signal);
  unmount();
  expect(signals.every((signal) => signal.aborted)).toBe(true);
  await act(async () => resolve([article]));
  expect(searchMedlinePlus).toHaveBeenCalledTimes(3);
});

it("combines configured topics and retains available articles when another topic fails", async () => {
  const factor = learnRiskFactors.find((item) => item.searchTerms.length === 2);
  const secondArticle = {
    ...article, id: "https://medlineplus.gov/cholesterol.html",
    url: "https://medlineplus.gov/cholesterol.html", title: "Cholesterol",
  };
  searchMedlinePlus.mockImplementation(async (query) => (
    query === factor.searchTerms[1] ? [secondArticle] : [article]
  ));
  const { unmount } = render(<LearnPage />);
  let card = screen.getByRole("article", { name: factor.title });
  await waitFor(() => expect(within(card).getAllByRole("link")).toHaveLength(2));
  expect(within(card).getByRole("link", { name: /Cholesterol/ })).toHaveAttribute("href", secondArticle.url);
  unmount();

  searchMedlinePlus.mockImplementation(async (query) => {
    if (query === factor.searchTerms[1]) throw new Error("Unavailable");
    return [article];
  });
  render(<LearnPage />);
  card = screen.getByRole("article", { name: factor.title });
  await waitFor(() => expect(within(card).getAllByRole("link")).toHaveLength(1));
  expect(within(card).getByText(/Some additional articles couldn't be loaded/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Reload articles" })).toBeInTheDocument();
});

it("gives repeated factor cards distinct accessible heading IDs", () => {
  const factor = learnRiskFactors[0];
  render(<>
    <RiskFactorEducationCard factor={factor} />
    <RiskFactorEducationCard factor={factor} />
  </>);

  const cards = screen.getAllByRole("article", { name: factor.title });
  const titleIds = cards.map((card) => card.getAttribute("aria-labelledby"));
  expect(new Set(titleIds).size).toBe(2);
  cards.forEach((card, index) => {
    expect(within(card).getByRole("heading", { name: factor.title }))
      .toHaveAttribute("id", titleIds[index]);
  });
});

it("covers the schema exactly and preserves the backend's two feature aliases", () => {
  expect(learnRiskFactors.map((factor) => factor.schemaKey).sort())
    .toEqual(Object.keys(riskInputSchema).sort());

  expect(learnRiskFactors.find((factor) => factor.schemaKey === "gender"))
    .toMatchObject({ featureKey: "male", aliases: ["male"] });
  expect(learnRiskFactors.find((factor) => factor.schemaKey === "bpMeds"))
    .toMatchObject({ featureKey: "BPMeds", aliases: ["BPMeds"] });
});
