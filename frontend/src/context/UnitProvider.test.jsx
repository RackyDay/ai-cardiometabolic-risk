import { useContext } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { UnitContext } from "./UnitContext";
import { UnitProvider } from "./UnitProvider";
import { MG_DL, MMOL_L } from "../utils/unitConversion";

function Toggle() {
  const { clinicalUnit, toggleClinicalUnit } = useContext(UnitContext);
  return <button onClick={toggleClinicalUnit}>{clinicalUnit}</button>;
}

function Setter() {
  const { clinicalUnit, setClinicalUnit } = useContext(UnitContext);
  return (
    <>
      <span>{clinicalUnit}</span>
      <button onClick={() => setClinicalUnit(MMOL_L)}>set mmol/L</button>
      <button onClick={() => setClinicalUnit(MG_DL)}>set mg/dL</button>
    </>
  );
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

it("setClinicalUnit sets the unit clicked, not a flip of the current one", () => {
  render(<UnitProvider><Setter /></UnitProvider>);

  fireEvent.click(screen.getByText("set mmol/L"));
  expect(screen.getByText(MMOL_L)).toBeInTheDocument();

  // Clicking the already-active option is a no-op, not a flip back.
  fireEvent.click(screen.getByText("set mmol/L"));
  expect(screen.getByText(MMOL_L)).toBeInTheDocument();

  fireEvent.click(screen.getByText("set mg/dL"));
  expect(screen.getByText(MG_DL)).toBeInTheDocument();
});
