import { useSearchParams } from "react-router-dom";
import useLearnViewModel from "./useLearnViewModel";
import { getLearnRiskFactor } from "./learnRiskFactors";
import useLearnSearchViewModel from "./useLearnSearchViewModel";
import PersonalisedEducation from "./components/PersonalisedEducation";
import RiskFactorEducationCard from "./components/RiskFactorEducationCard";
import LearnSearch from "./components/LearnSearch";
import LearnSearchResults from "./components/LearnSearchResults";
import RiskFactorFilter from "./components/RiskFactorFilter";
import "./LearnPage.css";

function LearnPage() {
  const [searchParams] = useSearchParams();
  const focusedFactor = getLearnRiskFactor(searchParams.get("factor"));
  const {
    riskFactorGroups, visibleGroups, activeGroupId, setActiveGroupId, selectedFactor,
    articleContent, isLoadingArticles, hasArticleErrors, reloadArticles,
  } = useLearnViewModel(focusedFactor);
  const { query, setQuery, search, submitSearch, clearSearch } = useLearnSearchViewModel();

  return (
    <div className="learn-page">
      {!selectedFactor && <PersonalisedEducation />}

      <section
        className="learn-explore"
        aria-labelledby="learn-explore-title"
      >
        <div className="learn-explore-header">
          <div className="learn-explore-intro">
            <h2 id="learn-explore-title" className="learn-section-title">
              Explore heart health
            </h2>
            <p className="learn-section-description">
              Learn about the information used in your cardiovascular risk assessment.
            </p>
          </div>
          <LearnSearch
            query={query}
            onQueryChange={setQuery}
            onSubmit={submitSearch}
          />
        </div>

        <LearnSearchResults search={search} onClear={clearSearch} />

        <div className="learn-feedback">
          <div className="learn-content-status" role="status">
            {isLoadingArticles && <p>Loading educational articles from MedlinePlus…</p>}
            {hasArticleErrors && <p>Some articles couldn't be loaded. The topic overviews are still available.</p>}
          </div>
          {hasArticleErrors && (
            <button className="learn-reload-button" type="button" onClick={reloadArticles} disabled={isLoadingArticles}>
              Reload articles
            </button>
          )}
        </div>

        <RiskFactorFilter groups={riskFactorGroups} activeGroupId={activeGroupId} onChange={setActiveGroupId} />

        {visibleGroups.map((group) => (
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
                  isFocused={factor === selectedFactor}
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
