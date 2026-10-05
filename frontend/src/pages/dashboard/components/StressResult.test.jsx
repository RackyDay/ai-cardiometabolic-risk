import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import StressResult from "./StressResult";

it.each([[0, "Low"], [13, "Low"], [14, "Moderate"], [26, "Moderate"], [27, "High"], [40, "High"]])(
  "highlights the correct informal band for %s", (score, label) => {
    render(<StressResult score={score} />);
    expect(screen.getByText(/Your range/).closest("td")).toHaveTextContent(label);
    expect(screen.getByText(/not validated clinical cutoffs/)).toBeInTheDocument();
    expect(screen.getByText(/does not change your calculated cardiovascular risk/)).toBeInTheDocument();
  },
);
