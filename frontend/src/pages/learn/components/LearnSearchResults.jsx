import ArticleCard from "./ArticleCard";

function searchMessage({ status, term, articles, error }) {
  if (status === "loading") return `Searching MedlinePlus for “${term}”…`;
  if (status === "ready") return `${articles.length} ${articles.length === 1 ? "result" : "results"} for “${term}” from MedlinePlus.`;
  if (status === "empty") return `No MedlinePlus articles found for “${term}”. Try a different keyword.`;
  if (status === "error") return error;
  return "";
}

function LearnSearchResults({ search, onClear }) {
  const isIdle = search.status === "idle";

  // The live region stays mounted so screen readers announce each new result.
  return (
    <div className={isIdle ? undefined : "learn-search-results"} aria-busy={search.status === "loading"}>
      <div className="learn-feedback">
        <div className="learn-article-status learn-search-status" aria-live="polite">
          {searchMessage(search)}
        </div>
        {!isIdle && (
          <button className="learn-reload-button" type="button" onClick={onClear}>
            Clear search
          </button>
        )}
      </div>
      {search.status === "ready" && (
        <ul className="learn-article-list" aria-label={`Search results for ${search.term}`}>
          {search.articles.map((article) => <ArticleCard key={article.id} article={article} />)}
        </ul>
      )}
    </div>
  );
}

export default LearnSearchResults;
