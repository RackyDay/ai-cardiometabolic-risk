function ArticleCard({ article }) {
  return (
    <li className="learn-article-card">
      <h5 className="learn-article-title">
        <a href={article.url} target="_blank" rel="noopener noreferrer">
          {article.title}{" "}
          <span className="learn-sr-only">(opens in a new tab)</span>
        </a>
      </h5>
      {article.summary && <p className="learn-article-summary">{article.summary}</p>}
      <p className="learn-article-source">Source: {article.source}</p>
    </li>
  );
}

export default ArticleCard;
