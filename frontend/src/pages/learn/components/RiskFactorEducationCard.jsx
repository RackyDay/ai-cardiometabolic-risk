import { useEffect, useId, useRef } from "react";
import ArticleCard from "./ArticleCard";

function RiskFactorEducationCard({ factor, content, isFocused = false }) {
  // A factor can appear in more than one section without duplicate DOM IDs.
  const titleId = useId();
  const cardRef = useRef(null);
  const headingRef = useRef(null);

  useEffect(() => {
    if (!isFocused) return;
    headingRef.current?.focus({ preventScroll: true });
  }, [isFocused]);

  useEffect(() => {
    // Keep the requested articles in view as they load, unless the user has
    // already moved focus to another control (such as search or a filter).
    if (isFocused && document.activeElement === headingRef.current) {
      cardRef.current?.scrollIntoView?.({ block: "start" });
    }
  }, [isFocused, content?.status]);

  return (
    <article
      ref={cardRef}
      className={`learn-factor-card${isFocused ? " learn-factor-card-focused" : ""}`}
      aria-labelledby={titleId}
    >
      <h4 ref={headingRef} id={titleId} className="learn-factor-title" tabIndex={isFocused ? -1 : undefined}>
        {factor.title}
      </h4>
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
