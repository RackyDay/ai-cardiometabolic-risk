import { render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AuthContext } from "../../context/AuthContext";
import { RiskContext } from "../../context/RiskContext";
import { riskInputSchema } from "../../schemas/riskInputSchema";
import { learnRiskFactors } from "./learnRiskFactors";
import LearnPage from "./LearnPage";
import RiskFactorEducationCard from "./components/RiskFactorEducationCard";

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

it("keeps static education available across sign-in and sign-out without fetching or changing an assessment", () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
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

  try {
    const { rerender } = render(page(false));
    for (const signedIn of [true, false]) {
      rerender(page(signedIn));
      expect(screen.getAllByRole("article")).toHaveLength(schemaFields.length);
      expect(screen.getByRole("region", { name: "Based on your assessment" }))
        .toHaveTextContent("Personalised education will appear here when it is available.");
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(setRiskInputs).not.toHaveBeenCalled();
    expect(setRiskScore).not.toHaveBeenCalled();
    expect(selectCalculation).not.toHaveBeenCalled();
  } finally {
    fetchSpy.mockRestore();
  }
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
