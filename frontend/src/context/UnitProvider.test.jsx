import { useContext } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { UnitContext } from "./UnitContext";
import { UnitProvider } from "./UnitProvider";

function Toggle() {
  const { clinicalUnit, toggleClinicalUnit } = useContext(UnitContext);
  return <button onClick={toggleClinicalUnit}>{clinicalUnit}</button>;
}

it("defaults to mg/dL and toggles to mmol/L and back", () => {
  render(<UnitProvider><Toggle /></UnitProvider>);
  fireEvent.click(screen.getByText("mg/dL"));
  expect(screen.getByText("mmol/L")).toBeInTheDocument();
  fireEvent.click(screen.getByText("mmol/L"));
  expect(screen.getByText("mg/dL")).toBeInTheDocument();
});

it("remembers the chosen unit across a remount", () => {
  const { unmount } = render(<UnitProvider><Toggle /></UnitProvider>);
  fireEvent.click(screen.getByText("mg/dL"));
  unmount();

  render(<UnitProvider><Toggle /></UnitProvider>);
  expect(screen.getByText("mmol/L")).toBeInTheDocument();
});

it("ignores an unrecognised stored value", () => {
  localStorage.setItem("clinicalUnit", "stone");
  render(<UnitProvider><Toggle /></UnitProvider>);
  expect(screen.getByText("mg/dL")).toBeInTheDocument();
});
