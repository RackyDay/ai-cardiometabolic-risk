import { useId } from "react";
import ArticleCard from "./ArticleCard";

function RiskFactorEducationCard({ factor, content }) {
  // A factor can appear in more than one section without duplicate DOM IDs.
  const titleId = useId();

  return (
    <article className="learn-factor-card" aria-labelledby={titleId}>
      <h4 id={titleId} className="learn-factor-title">{factor.title}</h4>
      <p className="learn-factor-description">{factor.description}</p>
      {content && (
        <div className="learn-articles" aria-busy={content.status === "loading"}>
          {content.status === "loading" && <p className="learn-article-status">Loading articles…</p>}
          {content.status === "error" && (
            <p className="learn-article-status">
              Articles are unavailable right now. You can still read the overview above.
            </p>
          )}
          {content.status === "empty" && (
            <p className="learn-article-status">
              No MedlinePlus articles found for this topic. The overview above is still available.
            </p>
          )}
          {content.status === "ready" && (
            <ul className="learn-article-list" aria-label={`MedlinePlus articles about ${factor.title}`}>
              {content.articles.map((article) => <ArticleCard key={article.id} article={article} />)}
            </ul>
          )}
          {content.partialError && <p className="learn-article-status">Some additional articles couldn't be loaded.</p>}
        </div>
      )}
    </article>
  );
}

export default RiskFactorEducationCard;
