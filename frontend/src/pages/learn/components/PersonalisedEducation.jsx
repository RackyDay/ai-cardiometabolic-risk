import ArticleCard from "./ArticleCard";
import usePersonalisedEducationViewModel from "../usePersonalisedEducationViewModel";

// MyHealthfinder recommendations from a signed-in user's completed assessment
// only (see the view model). Guests see a disabled card, matching the
// dashboard's Insights card.
function PersonalisedEducation() {
  const { isAuthenticated, hasAssessment, status, recommendations } = usePersonalisedEducationViewModel();

  return (
    <section
      className={`learn-personalised${!isAuthenticated ? " learn-personalised-disabled" : ""}`}
      aria-labelledby="learn-personalised-title"
      aria-disabled={!isAuthenticated}
    >
      <h2 id="learn-personalised-title" className="learn-section-title">
        Based on your assessment
      </h2>
      {!isAuthenticated ? (
        <p className="learn-personalised-message">Sign in to view personalised education.</p>
      ) : hasAssessment ? (
        <>
          <p className="learn-section-description">
            Prevention recommendations picked from the answers in your latest
            assessment, from MyHealthfinder (U.S. Office of Disease Prevention
            and Health Promotion), which follows U.S. guidelines. This is general
            information, not medical advice.
          </p>
          <div aria-busy={status === "loading"}>
            {status === "loading" && <p className="learn-article-status">Loading recommendations…</p>}
            {status === "error" && (
              <p className="learn-article-status">Recommendations are unavailable right now. Please try again later.</p>
            )}
            {status === "empty" && (
              <p className="learn-article-status">No MyHealthfinder recommendations found for your assessment.</p>
            )}
            {status === "ready" && (
              <ul className="learn-factor-grid learn-personalised-list" aria-label="Prevention recommendations for your assessment">
                {recommendations.map((recommendation) => (
                  <li key={recommendation.id} className="learn-factor-card">
                    <p className="learn-factor-description">{recommendation.reason}</p>
                    <div className="learn-articles">
                      <ul className="learn-article-list">
                        <ArticleCard article={recommendation} />
                      </ul>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
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
