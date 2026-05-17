import useLearnViewModel from "../viewmodels/useLearnViewModel";
import "./learn.css";

function LearnPage() {
  const { visibleSections } = useLearnViewModel();

  return (
    <section className="learn-page">
      {visibleSections.map((section) => (
        <section key={section.id} className="learn-section">
          <h2 className="learn-section-title">{section.title}</h2>

          <div className="learn-card-grid">
            {section.articles.map((article) => (
              <a
                key={article.id}
                href={article.url}
                className="learn-card"
              >
                {article.title}
              </a>
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}

export default LearnPage;