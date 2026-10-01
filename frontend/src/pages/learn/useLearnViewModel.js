import { useCallback, useEffect, useState } from "react";
import { learnRiskFactors } from "./learnRiskFactors";
import { searchMedlinePlus } from "../../services/medlinePlusApi";

// Group the configured factors without repeating either labels or card JSX.
const riskFactorGroups = Array.from(
  new Set(learnRiskFactors.map((factor) => factor.category)),
  (category) => ({
    id: category.replaceAll(" ", "-"),
    title: category,
    factors: learnRiskFactors.filter((factor) => factor.category === category),
  }),
);

// Search each configured term independently. A word-level OR between multiword
// terms produces overly broad matches. Shared terms still use one request.
const topicQueries = [...new Set(learnRiskFactors.flatMap((factor) => factor.searchTerms))];
const loadingContent = { status: "loading", articles: [] };

function useLearnViewModel() {
  const [attempt, setAttempt] = useState(0);
  // Category filter for the topic cards. It only hides cards, so articles
  // keep loading for every topic and switching back needs no new requests.
  const [activeGroupId, setActiveGroupId] = useState("all");
  const [response, setResponse] = useState({ attempt: 0, byQuery: {} });
  const reloadArticles = useCallback(() => setAttempt((current) => current + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let next = 0;
    const store = (query, content) => {
      if (controller.signal.aborted) return;
      setResponse((previous) => ({
        attempt,
        byQuery: { ...(previous.attempt === attempt ? previous.byQuery : {}), [query]: content },
      }));
    };
    const worker = async () => {
      while (!controller.signal.aborted && next < topicQueries.length) {
        const query = topicQueries[next++];
        try {
          const articles = await searchMedlinePlus(query, { limit: 1, signal: controller.signal });
          store(query, { status: articles.length ? "ready" : "empty", articles });
        } catch {
          if (!controller.signal.aborted) store(query, { status: "error", articles: [] });
        }
      }
    };
    // Keep at most three topic requests in flight at once.
    for (let index = 0; index < 3; index++) void worker();
    return () => controller.abort();
  }, [attempt]);

  const byQuery = response.attempt === attempt ? response.byQuery : {};
  const articleContent = Object.fromEntries(learnRiskFactors.map((factor) => {
    const results = factor.searchTerms.map((query) => byQuery[query] ?? loadingContent);
    if (results.some((result) => result.status === "loading")) return [factor.schemaKey, loadingContent];
    const articles = [...new Map(results.flatMap((result) => result.articles)
      .map((article) => [article.url, article])).values()].slice(0, 2);
    const failed = results.some((result) => result.status === "error");
    return [factor.schemaKey, {
      status: articles.length ? "ready" : failed ? "error" : "empty",
      articles,
      partialError: articles.length > 0 && failed,
    }];
  }));
  const states = Object.values(articleContent);
  return {
    riskFactorGroups,
    visibleGroups: riskFactorGroups.filter((group) => activeGroupId === "all" || group.id === activeGroupId),
    activeGroupId,
    setActiveGroupId,
    articleContent,
    isLoadingArticles: states.some((content) => content.status === "loading"),
    hasArticleErrors: states.some((content) => content.status === "error" || content.partialError),
    reloadArticles,
  };
}

export default useLearnViewModel;
