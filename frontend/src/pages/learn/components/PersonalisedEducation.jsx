import ArticleCard from "./ArticleCard";
import usePersonalisedEducationViewModel from "../usePersonalisedEducationViewModel";

// Topics come from a completed assessment only (see the view model); the
// placeholder stays for guests and anyone without an assessment yet.
function PersonalisedEducation() {
  const { hasAssessment, topics } = usePersonalisedEducationViewModel();

  return (
    <section className="learn-personalised" aria-labelledby="learn-personalised-title">
      <h2 id="learn-personalised-title" className="learn-section-title">
        Based on your assessment
      </h2>
      {hasAssessment ? (
        <>
          <p className="learn-section-description">
            Topics picked from the answers in your latest assessment. This is
            general education, not medical advice.
          </p>
          <ul className="learn-factor-grid learn-personalised-list" aria-label="Topics related to your assessment">
            {topics.map(({ searchTerm, reason, content }) => (
              <li key={searchTerm} className="learn-factor-card" aria-busy={content.status === "loading"}>
                <p className="learn-factor-description">{reason}</p>
                <div className="learn-articles">
                  {content.status === "loading" && <p className="learn-article-status">Loading articles…</p>}
                  {content.status === "error" && (
                    <p className="learn-article-status">Articles are unavailable right now. Please try again later.</p>
                  )}
                  {content.status === "empty" && (
                    <p className="learn-article-status">No MedlinePlus articles found for this topic.</p>
                  )}
                  {content.status === "ready" && (
                    <ul className="learn-article-list" aria-label={`MedlinePlus articles about ${searchTerm}`}>
                      {content.articles.map((article) => <ArticleCard key={article.id} article={article} />)}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <p className="learn-empty-title">Your personalised learning space</p>
          <p className="learn-section-description">
            Personalised education will appear here when it is available. You can
            explore all the topics below, with or without an assessment.
          </p>
        </>
      )}
    </section>
  );
}

export default PersonalisedEducation;
