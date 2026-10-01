import { useId } from "react";

function LearnSearch({ query, onQueryChange, onSubmit }) {
  const inputId = useId();
  const hintId = useId();

  return (
    <form className="learn-search" role="search" aria-label="Search health topics" onSubmit={onSubmit}>
      <label htmlFor={inputId} className="learn-sr-only">Search MedlinePlus health topics</label>
      <input
        id={inputId}
        className="learn-search-input"
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search health topics, e.g. cholesterol"
        maxLength={200}
        aria-describedby={hintId}
      />
      <button className="learn-search-button" type="submit">
        Search
      </button>
      <p id={hintId} className="learn-search-hint">
        Searches are sent to MedlinePlus (U.S. National Library of Medicine).
      </p>
    </form>
  );
}

export default LearnSearch;
