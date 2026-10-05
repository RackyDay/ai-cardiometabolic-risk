// Shown only when a category has more topics than fit on one page.
function RiskFactorPagination({ groupTitle, page, pageCount, onPageChange }) {
  if (pageCount <= 1) return null;

  return (
    <nav className="learn-pagination" aria-label={`${groupTitle} topic pages`}>
      <button
        className="learn-pagination-button"
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 0}
      >
        Previous
      </button>
      <span className="learn-pagination-status" aria-live="polite">
        Page {page + 1} of {pageCount}
      </span>
      <button
        className="learn-pagination-button"
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page === pageCount - 1}
      >
        Next
      </button>
    </nav>
  );
}

export default RiskFactorPagination;
