import { act, fireEvent, render as renderPage, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../context/AuthContext";
import { RiskContext } from "../../context/RiskContext";
import { riskInputSchema } from "../../schemas/riskInputSchema";
import { learnRiskFactors } from "./learnRiskFactors";
import { buildPersonalisedTopics, generalTopic } from "./learnPersonalisedTopics";
import LearnPage from "./LearnPage";
import RiskFactorEducationCard from "./components/RiskFactorEducationCard";
import RiskFactorPagination from "./components/RiskFactorPagination";
import { CARDS_PER_PAGE, paginate } from "./useLearnViewModel";
import { searchMedlinePlus } from "../../services/medlinePlusApi";
import { getPreventionRecommendations } from "../../services/myHealthfinderApi";

vi.mock("../../services/medlinePlusApi", () => ({ searchMedlinePlus: vi.fn() }));
vi.mock("../../services/myHealthfinderApi", () => ({ getPreventionRecommendations: vi.fn() }));
beforeEach(() => {
  searchMedlinePlus.mockReset().mockImplementation(() => new Promise(() => {}));
  getPreventionRecommendations.mockReset().mockImplementation(() => new Promise(() => {}));
});

const schemaFields = Object.values(riskInputSchema);
const render = (ui, options) => renderPage(ui, { wrapper: MemoryRouter, ...options });

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
    .toHaveTextContent("Sign in to view personalised education.");
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
      .toHaveTextContent(signedIn ? "Prevention recommendations picked from the answers in your latest assessment" : "Sign in to view personalised education.");
  }
  const publicQueries = [
    ...learnRiskFactors.flatMap((factor) => factor.searchTerms),
    ...buildPersonalisedTopics(assessment.selectedCalculation.inputs, []).map((topic) => topic.searchTerm),
  ];
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

describe("personalised education", () => {
  const signedIn = (ui) => (
    <AuthContext.Provider value={{ isAuthenticated: true, user: { id: "user-a" } }}>{ui}</AuthContext.Provider>
  );
  const completed = {
    gender: "M", age: 52, education: 2, currentSmoker: true, cigsPerDay: 10, bpMeds: false,
    prevalentStroke: false, prevalentHyp: false, diabetes: false,
    sysBP: 150, diaBP: 85, BMI: 31.2, heartRate: 72, glucose: 90, totChol: 180,
  };
  const terms = (inputs, contributors = []) =>
    buildPersonalisedTopics(inputs, contributors).map((topic) => topic.searchTerm);

  it("maps values to topics using Australian thresholds", () => {
    expect(terms(completed)).toEqual(["quitting smoking", "high blood pressure", "obesity", "heart health tests"]);
    expect(terms({ sysBP: 139, diaBP: 89, BMI: 24.9, totChol: 212, glucose: 109, heartRate: 60, age: 44 }))
      .toEqual([generalTopic.searchTerm]);
    expect(terms({ totChol: 213, glucose: 110, heartRate: 101 })).toEqual(["prediabetes", "cholesterol levels", "tachycardia"]);
    expect(terms({ glucose: 127, BMI: 26, sysBP: 85, diaBP: 55 })).toEqual(["low blood pressure", "diabetes", "weight control"]);
    expect(terms({ prevalentHyp: true, bpMeds: true, diabetes: true, prevalentStroke: true, BMI: 17 }))
      .toEqual(["high blood pressure", "blood pressure medicines", "diabetic heart disease", "healthy weight", "stroke"]);
    expect(terms({ currentSmoker: true, sysBP: 150, bpMeds: true, diabetes: true, totChol: 250, BMI: 31, prevalentStroke: true, heartRate: 110, age: 60 }))
      .toHaveLength(6);
  });

  it("ranks topics by model contribution, accepts form strings and never returns values in search terms", () => {
    const contributors = [
      { feature: "BMI", contribution: 0.9 },
      { feature: "sysBP", contribution: 0.4 },
      { feature: "currentSmoker", contribution: -0.2 },
    ];
    expect(terms(completed, contributors)).toEqual(["obesity", "high blood pressure", "quitting smoking", "heart health tests"]);
    expect(terms({ ...completed, sysBP: "150", BMI: "31.2", age: "52" })).toEqual(terms(completed));
    const [topic] = buildPersonalisedTopics({ BMI: 31.2 }, []);
    expect(topic.reason).toContain("31.2");
    expect(topic.searchTerm).not.toMatch(/\d/);
    expect(buildPersonalisedTopics(null, [])).toBeNull();
  });

  const recommendation = (topicId, title) => ({
    id: String(topicId ?? title), title, summary: "Plain-language advice.", topicId,
    url: `https://odphp.health.gov/myhealthfinder/topics/${topicId ?? 1}`, source: "MyHealthfinder",
  });

  it("maps every topic to a MyHealthfinder topic and drops duplicates of the same topic", () => {
    expect(buildPersonalisedTopics(completed, []).map((topic) => topic.topicId)).toEqual([30610, 533, 30551, 25]);
    expect(generalTopic.topicId).toBe(25);
    const shared = buildPersonalisedTopics({ diabetes: true, age: 60 }, []);
    expect(shared.map((topic) => topic.searchTerm)).toEqual(["diabetic heart disease"]);
  });

  it("requests recommendations for the completed snapshot, never the live draft inputs", async () => {
    getPreventionRecommendations.mockResolvedValue([
      recommendation(30610, "Quit Smoking"),
      recommendation(533, "Get Your Blood Pressure Checked"),
      recommendation(null, "Get Screened for Colorectal Cancer"),
    ]);
    render(signedIn(
      <RiskContext.Provider value={{ riskInputs: { ...completed, currentSmoker: false }, riskScore: 9, assessedInputs: completed, topContributors: [] }}>
        <LearnPage />
      </RiskContext.Provider>,
    ));
    const region = screen.getByRole("region", { name: "Based on your assessment" });
    expect(region).toHaveTextContent("Loading recommendations…");
    expect(getPreventionRecommendations).toHaveBeenCalledWith(expect.objectContaining({
      topicIds: [30610, 533, 30551, 25], age: 52, sex: "male", tobaccoUse: true,
    }));
    const list = await within(region).findByRole("list", { name: "Prevention recommendations for your assessment" });
    const cards = within(list).getAllByRole("listitem").filter((item) => item.parentElement === list);
    expect(cards).toHaveLength(3);
    expect(cards[0]).toHaveTextContent("You told us that you currently smoke.");
    expect(within(cards[0]).getByRole("link", { name: "Quit Smoking (opens in a new tab)" }))
      .toHaveAttribute("href", "https://odphp.health.gov/myhealthfinder/topics/30610");
    expect(cards[1]).toHaveTextContent("150.0 mmHg");
    expect(cards[2]).toHaveTextContent("Recommended by MyHealthfinder for people of your age and sex.");
    expect(region).toHaveTextContent("Source: MyHealthfinder");
    expect(region).toHaveTextContent("U.S. guidelines");
    for (const [query] of searchMedlinePlus.mock.calls) {
      expect(learnRiskFactors.flatMap((factor) => factor.searchTerms)).toContain(query);
    }
  });

  it("sends no age or sex for \"Rather not say\", so only risk factor topics are requested", () => {
    render(signedIn(
      <RiskContext.Provider value={{ assessedInputs: { ...completed, gender: "O" } }}>
        <LearnPage />
      </RiskContext.Provider>,
    ));
    const [request] = getPreventionRecommendations.mock.calls[0];
    expect(request.topicIds).toEqual([30610, 533, 30551, 25]);
    expect(request).not.toHaveProperty("age");
    expect(request).not.toHaveProperty("sex");
    expect(request).not.toHaveProperty("tobaccoUse");
  });

  it("prefers a selected history calculation and keeps the placeholder for a draft without a score", async () => {
    getPreventionRecommendations.mockResolvedValue([recommendation(25, "Keep Your Heart Healthy")]);
    const { unmount } = render(signedIn(
      <RiskContext.Provider value={{ assessedInputs: completed, selectedCalculation: { inputs: { diabetes: true } } }}>
        <LearnPage />
      </RiskContext.Provider>,
    ));
    const region = screen.getByRole("region", { name: "Based on your assessment" });
    expect(await within(region).findByText(/diagnosed with diabetes/)).toBeInTheDocument();
    expect(region).not.toHaveTextContent("currently smoke");
    expect(getPreventionRecommendations).toHaveBeenLastCalledWith(expect.objectContaining({ topicIds: [25] }));
    unmount();

    getPreventionRecommendations.mockClear();
    render(signedIn(
      <RiskContext.Provider value={{ riskInputs: completed, riskScore: null, assessedInputs: null }}>
        <LearnPage />
      </RiskContext.Provider>,
    ));
    expect(screen.getByRole("region", { name: "Based on your assessment" }))
      .toHaveTextContent("Personalised education will appear here when it is available.");
    expect(getPreventionRecommendations).not.toHaveBeenCalled();
  });

  it("is only available to signed-in users, like the dashboard's Insights card", () => {
    render(
      <AuthContext.Provider value={{ isAuthenticated: false, user: null }}>
        <RiskContext.Provider value={{ assessedInputs: completed, selectedCalculation: { inputs: completed } }}>
          <LearnPage />
        </RiskContext.Provider>
      </AuthContext.Provider>,
    );
    const region = screen.getByRole("region", { name: "Based on your assessment" });
    expect(region).toHaveAttribute("aria-disabled", "true");
    expect(region).toHaveTextContent("Sign in to view personalised education.");
    expect(region).not.toHaveTextContent("currently smoke");
    expect(getPreventionRecommendations).not.toHaveBeenCalled();
  });

  it("shows clear messages when recommendations fail or none are found", async () => {
    getPreventionRecommendations.mockRejectedValueOnce(new Error("Unavailable"));
    const { unmount } = render(signedIn(
      <RiskContext.Provider value={{ assessedInputs: { BMI: 31.2 } }}>
        <LearnPage />
      </RiskContext.Provider>,
    ));
    let region = screen.getByRole("region", { name: "Based on your assessment" });
    expect(await within(region).findByText(/Recommendations are unavailable right now/)).toBeInTheDocument();
    unmount();

    getPreventionRecommendations.mockResolvedValueOnce([]);
    render(signedIn(
      <RiskContext.Provider value={{ assessedInputs: { BMI: 31.2 } }}>
        <LearnPage />
      </RiskContext.Provider>,
    ));
    region = screen.getByRole("region", { name: "Based on your assessment" });
    expect(await within(region).findByText(/No MyHealthfinder recommendations found/)).toBeInTheDocument();
  });
});

describe("search", () => {
  const search = (value) => {
    fireEvent.change(screen.getByRole("searchbox", { name: "Search MedlinePlus health topics" }), { target: { value } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
  };

  it("searches only on submit and shows results without touching the topic cards", async () => {
    render(<LearnPage />);
    const callsBefore = searchMedlinePlus.mock.calls.length;
    fireEvent.change(screen.getByRole("searchbox", { name: "Search MedlinePlus health topics" }), { target: { value: "cholesterol" } });
    expect(searchMedlinePlus).toHaveBeenCalledTimes(callsBefore);

    searchMedlinePlus.mockResolvedValueOnce([article]);
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(searchMedlinePlus).toHaveBeenLastCalledWith("cholesterol", expect.objectContaining({ limit: 5 }));
    const results = await screen.findByRole("list", { name: "Search results for cholesterol" });
    expect(within(results).getByRole("link", { name: "Heart Diseases (opens in a new tab)" })).toHaveAttribute("href", article.url);
    expect(screen.getByText("1 result for “cholesterol” from MedlinePlus.")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(schemaFields.length);
    expect(screen.getByRole("status")).toHaveTextContent("Loading educational articles");

    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.queryByRole("list", { name: /Search results/ })).not.toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search MedlinePlus health topics" })).toHaveValue("");
  });

  it("handles blank, empty and failed searches with clear messages", async () => {
    render(<LearnPage />);
    const callsBefore = searchMedlinePlus.mock.calls.length;
    search("   ");
    expect(screen.getByText("Enter a search term.")).toBeInTheDocument();
    expect(searchMedlinePlus).toHaveBeenCalledTimes(callsBefore);

    searchMedlinePlus.mockResolvedValueOnce([]);
    search("zzzz");
    expect(await screen.findByText(/No MedlinePlus articles found for “zzzz”/)).toBeInTheDocument();

    searchMedlinePlus.mockRejectedValueOnce(new Error("We couldn't load MedlinePlus articles. Please try again."));
    search("stroke");
    expect(await screen.findByText("We couldn't load MedlinePlus articles. Please try again.")).toBeInTheDocument();
  });

  it("cancels a pending search when a new one starts or the page closes", async () => {
    const { unmount } = render(<LearnPage />);
    search("stroke");
    const first = searchMedlinePlus.mock.lastCall[1].signal;
    let resolve;
    searchMedlinePlus.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    search("diabetes");
    expect(first.aborted).toBe(true);
    await act(async () => resolve([article]));
    expect(await screen.findByRole("list", { name: "Search results for diabetes" })).toBeInTheDocument();

    search("cholesterol");
    const last = searchMedlinePlus.mock.lastCall[1].signal;
    unmount();
    expect(last.aborted).toBe(true);
  });
});

describe("risk factor filter", () => {
  it("filters topic cards by category without new article requests", () => {
    render(<LearnPage />);
    const filter = screen.getByRole("group", { name: "Explore by risk factor" });
    expect(within(filter).getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
    const callsBefore = searchMedlinePlus.mock.calls.length;

    fireEvent.click(within(filter).getByRole("button", { name: "clinical" }));
    const clinical = schemaFields.filter((field) => field.category === "clinical");
    expect(screen.getAllByRole("article")).toHaveLength(clinical.length);
    expect(screen.getByRole("heading", { level: 3, name: "clinical" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3, name: "demographic" })).not.toBeInTheDocument();
    expect(within(filter).getByRole("button", { name: "clinical" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(within(filter).getByRole("button", { name: "All" }));
    expect(screen.getAllByRole("article")).toHaveLength(schemaFields.length);
    expect(searchMedlinePlus).toHaveBeenCalledTimes(callsBefore);
  });
});

describe("topic card pages", () => {
  it("shows at most two rows of three cards per page", () => {
    const items = Array.from({ length: 14 }, (_, index) => index);
    expect(CARDS_PER_PAGE).toBe(6);
    expect(paginate(items, 0)).toEqual({ items: [0, 1, 2, 3, 4, 5], page: 0, pageCount: 3 });
    expect(paginate(items, 2)).toEqual({ items: [12, 13], page: 2, pageCount: 3 });
    expect(paginate(items, 9).page).toBe(2);
    expect(paginate([1, 2, 3], undefined)).toEqual({ items: [1, 2, 3], page: 0, pageCount: 1 });
  });

  it("offers previous and next buttons only when a category needs more than one page", () => {
    const onPageChange = vi.fn();
    const { rerender } = render(<RiskFactorPagination groupTitle="clinical" page={0} pageCount={2} onPageChange={onPageChange} />);
    const nav = screen.getByRole("navigation", { name: "clinical topic pages" });
    expect(within(nav).getByText("Page 1 of 2")).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "Previous" })).toBeDisabled();
    fireEvent.click(within(nav).getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenCalledWith(1);

    rerender(<RiskFactorPagination groupTitle="clinical" page={1} pageCount={2} onPageChange={onPageChange} />);
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    rerender(<RiskFactorPagination groupTitle="clinical" page={0} pageCount={1} onPageChange={onPageChange} />);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("fits every current category on one page, so no pagination is shown", () => {
    render(<LearnPage />);
    expect(screen.queryByRole("navigation", { name: /topic pages/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(schemaFields.length);
  });
});
