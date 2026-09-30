import useLearnViewModel from "./useLearnViewModel";
import PersonalisedEducation from "./components/PersonalisedEducation";
import RiskFactorEducationCard from "./components/RiskFactorEducationCard";
import "./LearnPage.css";

function LearnPage() {
  const { riskFactorGroups, articleContent, isLoadingArticles, hasArticleErrors, retryArticles } = useLearnViewModel();

  return (
    <div className="learn-page">
      <PersonalisedEducation />

      <section
        className="learn-explore"
        aria-labelledby="learn-explore-title"
      >
        <h2 id="learn-explore-title" className="learn-section-title">
          Explore heart health
        </h2>
        <p className="learn-section-description">
          Learn about the information used in your cardiovascular risk assessment.
        </p>

        <div className="learn-content-status" role="status">
          {isLoadingArticles && <p>Loading educational articles from MedlinePlus…</p>}
          {hasArticleErrors && <p>Some articles couldn't be loaded. The topic overviews are still available.</p>}
        </div>
        {hasArticleErrors && (
          <button className="learn-retry-button" type="button" onClick={retryArticles} disabled={isLoadingArticles}>
            Retry articles
          </button>
        )}

        {riskFactorGroups.map((group) => (
          <section
            key={group.id}
            className="learn-factor-group"
            aria-labelledby={`learn-group-${group.id}`}
          >
            <h3 id={`learn-group-${group.id}`} className="learn-group-title">
              {group.title}
            </h3>
            <div className="learn-factor-grid">
              {group.factors.map((factor) => (
                <RiskFactorEducationCard
                  key={factor.schemaKey}
                  factor={factor}
                  content={articleContent[factor.schemaKey]}
                />
              ))}
            </div>
          </section>
        ))}
      </section>
    </div>
  );
}

export default LearnPage;
