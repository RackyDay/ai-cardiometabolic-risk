import useLearnViewModel from "./useLearnViewModel";
import "./LearnPage.css";

function LearnPage() {
  const {
    visibleSections,
    cardScrollRef,
    canScrollLeft,
    canScrollRight,
    scrollCardsLeft,
    scrollCardsRight,
    updateScrollButtons,
  } = useLearnViewModel();

  return (
    <section className="learn-page">
      {visibleSections.map((section) => (
        <section key={section.id} className="learn-section">
          <h2 className="learn-section-title">{section.title}</h2>

          <div className="learn-carousel">
            {canScrollLeft && (
              <button
                type="button"
                className="learn-arrow-button learn-arrow-left"
                onClick={scrollCardsLeft}
                aria-label="Scroll articles left"
              >
                ‹
              </button>
            )}

            <div
              ref={cardScrollRef}
              className="learn-card-grid"
              onScroll={updateScrollButtons}
            >
              {section.articles.map((article) => (
                <a key={article.id} href={article.url} className="learn-card">
                  {article.title}
                </a>
              ))}
            </div>

            {canScrollRight && (
              <button
                type="button"
                className="learn-arrow-button learn-arrow-right"
                onClick={scrollCardsRight}
                aria-label="Scroll articles right"
              >
                ›
              </button>
            )}
          </div>
        </section>
      ))}
    </section>
  );
}

export default LearnPage;