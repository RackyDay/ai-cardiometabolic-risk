import { useEffect, useRef, useState } from "react";
import RiskField from "../../components/common/RiskField";
import { useEditAssessmentViewModel } from "./useEditAssessmentViewModel";

import "../input/InputPage.css";

function EditAssessmentModal({ onClose, onSaved }) {

    const {
        draftInputs,
        errors,
        set,
        categories,
        pageOrder,
        page,
        setPage,
        handleSave,
        isSubmitting,
        submitError,
        isDirty,
        saveSuccess,
    } = useEditAssessmentViewModel();


    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

    const requestClose = () => {
        if (isDirty && !saveSuccess) {
            setShowDiscardConfirm(true);
            return;
        }
        onClose();
    };


    // onClose/onSaved are inline callbacks from the parent, so they're a
    // new reference on every render - if this effect called onSaved()
    // unconditionally, that state update would re-render the parent, hand
    // down new callback references, and re-run the effect again (loop).
    // hasNotifiedSaveRef makes onSaved() fire at most once per genuine
    // saveSuccess transition, no matter how many times the effect re-runs.
    const hasNotifiedSaveRef = useRef(false);

    useEffect(() => {
        if (!saveSuccess) {
            hasNotifiedSaveRef.current = false;
            return;
        }

        if (!hasNotifiedSaveRef.current) {
            hasNotifiedSaveRef.current = true;
            // Fires as soon as the save lands, not after the auto-close
            // delay - callers use this to refetch anything derived from
            // assessment history (e.g. the trend chart / Insights'
            // "previous assessment"), which this edit just added a new
            // row to.
            onSaved?.();
        }

        const timer = setTimeout(onClose, 1200);
        return () => clearTimeout(timer);
    }, [saveSuccess, onClose, onSaved]);

    const currentCategory = pageOrder[page];
    const currentFields = categories[currentCategory];
    const isLastPage = page === pageOrder.length - 1;

    return (
        <div
            className="edit-assessment-modal-backdrop"
            onClick={requestClose}
        >

            <div
                className="edit-assessment-modal"
                onClick={(event) => event.stopPropagation()}
            >

                <div className="insight-modal-header">

                    <h2 className="card-title">
                        Edit assessment
                    </h2>

                    <button
                        className="insight-modal-close"
                        aria-label="Close edit assessment"
                        onClick={requestClose}
                    >
                        ×
                    </button>

                </div>


                {saveSuccess ? (

                    <div className="insight-item insight-green">
                        Assessment updated successfully.
                    </div>

                ) : (

                    <>

                        {currentFields.map((field) => {

                            const isCigarettesField =
                                field.name === "cigsPerDay";

                            const isNonSmoker =
                                draftInputs.currentSmoker === false;

                            const shouldDisableCigarettes =
                                isCigarettesField &&
                                isNonSmoker;


                            return (

                                <RiskField
                                    key={field.name}
                                    field={field}
                                    value={draftInputs[field.name]}
                                    onChange={set(field.name)}
                                    error={errors[field.name]}

                                    disabled={
                                        shouldDisableCigarettes
                                    }

                                    disabledMessage={
                                        shouldDisableCigarettes
                                            ? "This field is disabled because you selected No for smoking status."
                                            : undefined
                                    }
                                />

                            );
                        })}


                        {isLastPage && (
                            <div className="submit-wrapper edit-assessment-actions">

                                {submitError && (
                                    <div className="form-error">
                                        {submitError}
                                    </div>
                                )}

                                <button
                                    type="button"
                                    className="page-nav-btn"
                                    onClick={requestClose}
                                >
                                    Cancel
                                </button>

                                <button
                                    className="submit-btn"
                                    onClick={handleSave}
                                    disabled={isSubmitting}
                                >

                                    {isSubmitting
                                        ? "Saving..."
                                        : "Save changes"}

                                </button>

                            </div>
                        )}


                        <nav className="pagination">

                            <button
                                className="page-nav-btn"
                                onClick={() => setPage((p) => p - 1)}
                                disabled={page === 0}
                            >
                                ← Previous
                            </button>

                            {pageOrder.map((n, idx) => (
                                <button
                                    key={idx}
                                    className={`page-num-btn${page === idx ? " active" : ""}`}
                                    onClick={() => setPage(idx)}
                                >
                                    {idx + 1}
                                </button>
                            ))}

                            <button
                                className="page-nav-btn"
                                onClick={() => setPage((p) => p + 1)}
                                disabled={page === pageOrder.length - 1}
                            >
                                Next →
                            </button>

                        </nav>

                    </>

                )}


                {/*  */}

                {showDiscardConfirm && (

                    <div
                        className="discard-confirm-backdrop"
                        onClick={() => setShowDiscardConfirm(false)}
                    >

                        <div
                            className="discard-confirm-panel"
                            onClick={(event) => event.stopPropagation()}
                        >

                            <p className="discard-confirm-text">
                                You have unsaved changes. Discard them?
                            </p>

                            <div className="discard-confirm-actions">

                                <button
                                    type="button"
                                    className="page-nav-btn"
                                    onClick={() => setShowDiscardConfirm(false)}
                                >
                                    Keep editing
                                </button>

                                <button
                                    type="button"
                                    className="discard-confirm-btn"
                                    onClick={onClose}
                                >
                                    Discard changes
                                </button>

                            </div>

                        </div>

                    </div>

                )}

            </div>

        </div>
    );
}

export default EditAssessmentModal;