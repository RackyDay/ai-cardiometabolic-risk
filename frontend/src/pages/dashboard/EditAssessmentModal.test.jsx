import { useState } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EditAssessmentModal from "./EditAssessmentModal";
import { useEditAssessmentViewModel } from "./useEditAssessmentViewModel";

vi.mock("./useEditAssessmentViewModel", () => ({
  useEditAssessmentViewModel: vi.fn(),
}));

function baseViewModel(overrides) {
  return {
    draftInputs: {},
    errors: {},
    set: () => () => {},
    categories: { demographic: [] },
    pageOrder: ["demographic"],
    page: 0,
    setPage: () => {},
    handleSave: () => {},
    isSubmitting: false,
    submitError: "",
    isDirty: false,
    saveSuccess: false,
    ...overrides,
  };
}

describe("EditAssessmentModal save notification", () => {
  it("calls onSaved exactly once even when the parent re-renders with new callback references", () => {
    useEditAssessmentViewModel.mockReturnValue(baseViewModel({ saveSuccess: true }));

    // Mirrors how DashboardPage actually renders this: onClose/onSaved are
    // inline arrows re-created every render, and onSaved's own effect
    // (calling setCount) is what triggers that re-render - the exact
    // shape that caused "Maximum update depth exceeded" in production.
    function Harness() {
      const [count, setCount] = useState(0);
      return (
        <>
          <span data-testid="count">{count}</span>
          <EditAssessmentModal onClose={() => {}} onSaved={() => setCount((c) => c + 1)} />
        </>
      );
    }

    render(<Harness />);

    expect(screen.getByTestId("count").textContent).toBe("1");
  });

  it("fires onSaved again on a later, independent save", () => {
    useEditAssessmentViewModel.mockReturnValue(baseViewModel({ saveSuccess: false }));
    const onSaved = vi.fn();
    const { rerender } = render(<EditAssessmentModal onClose={() => {}} onSaved={onSaved} />);
    expect(onSaved).not.toHaveBeenCalled();

    useEditAssessmentViewModel.mockReturnValue(baseViewModel({ saveSuccess: true }));
    rerender(<EditAssessmentModal onClose={() => {}} onSaved={onSaved} />);
    expect(onSaved).toHaveBeenCalledTimes(1);

    // Closing (saveSuccess back to false) and saving again should notify
    // again - the guard resets per save, it doesn't latch forever.
    useEditAssessmentViewModel.mockReturnValue(baseViewModel({ saveSuccess: false }));
    rerender(<EditAssessmentModal onClose={() => {}} onSaved={onSaved} />);
    useEditAssessmentViewModel.mockReturnValue(baseViewModel({ saveSuccess: true }));
    rerender(<EditAssessmentModal onClose={() => {}} onSaved={onSaved} />);
    expect(onSaved).toHaveBeenCalledTimes(2);
  });
});
