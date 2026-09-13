import { useEffect, useState } from "react";
import RiskField from "../../components/common/RiskField";
import { useEditAssessmentViewModel } from "./useEditAssessmentViewModel";

import "../input/InputPage.css";

function EditAssessmentModal({ onClose }) {

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

   
    useEffect(() => {
        if (!saveSuccess) return;
        const timer = setTimeout(onClose, 1200);
        return () => clearTimeout(timer);
    }, [saveSuccess, onClose]);

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

                        {currentFields.map((field) => (
                            <RiskField
                                key={field.name}
                                field={field}
                                value={draftInputs[field.name]}
                                onChange={set(field.name)}
                                error={errors[field.name]}
                            />
                        ))}


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