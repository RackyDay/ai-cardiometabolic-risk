import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { RiskContext } from "../../context/RiskContext";
import { riskInputSchema } from "../../schemas/riskInputSchema";
import { learnRiskFactors } from "./learnRiskFactors";
import LearnPage from "./LearnPage";

it("offers every schema factor to a guest without requiring providers", () => {
  render(<LearnPage />);

  const explore = screen.getByRole("region", { name: "Explore heart health" });
  expect(within(explore).getAllByRole("article")).toHaveLength(Object.keys(riskInputSchema).length);
  for (const field of Object.values(riskInputSchema)) {
    expect(within(explore).getByRole("heading", { level: 4, name: field.print_name })).toBeInTheDocument();
  }
  expect(within(explore).getAllByRole("heading", { level: 3 })).toHaveLength(4);
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

  expect(screen.getAllByRole("article")).toHaveLength(15);
  expect(screen.getByRole("region", { name: "Based on your assessment" }))
    .toHaveTextContent("with or without an assessment");
});

it("provides a keyboard-accessible link from the reserved section to general education", async () => {
  const user = userEvent.setup();
  render(<LearnPage />);

  await user.tab();
  const link = screen.getByRole("link", { name: "Explore heart health" });
  expect(link).toHaveFocus();
  expect(link).toHaveAttribute("href", "#learn-explore");
  expect(screen.getByRole("region", { name: "Explore heart health" })).toHaveAttribute("id", "learn-explore");
});

it("covers the schema exactly and preserves the backend's two feature aliases", () => {
  expect(learnRiskFactors.map((factor) => factor.schemaKey).sort())
    .toEqual(Object.keys(riskInputSchema).sort());

  expect(learnRiskFactors.find((factor) => factor.schemaKey === "gender"))
    .toMatchObject({ featureKey: "male", aliases: ["male"] });
  expect(learnRiskFactors.find((factor) => factor.schemaKey === "bpMeds"))
    .toMatchObject({ featureKey: "BPMeds", aliases: ["BPMeds"] });
});
