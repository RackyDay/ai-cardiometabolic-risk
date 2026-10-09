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

// Topic cards are laid out three per row, two rows per page.
export const CARDS_PER_PAGE = 6;

export function paginate(items, requestedPage = 0) {
  const pageCount = Math.max(1, Math.ceil(items.length / CARDS_PER_PAGE));
  const page = Math.min(Math.max(requestedPage, 0), pageCount - 1);
  return { items: items.slice(page * CARDS_PER_PAGE, (page + 1) * CARDS_PER_PAGE), page, pageCount };
}

function useLearnViewModel(focusedFactor) {
  const [attempt, setAttempt] = useState(0);
  // A factor link shows one topic until the user chooses a category or "All".
  // General category changes only hide cards and keep their requests running.
  const focusedKey = focusedFactor?.schemaKey ?? null;
  const initialGroupId = focusedFactor?.category.replaceAll(" ", "-") ?? "all";
  const [filter, setFilter] = useState({ factorKey: focusedKey, groupId: initialGroupId, isManual: false });
  // A new deep link restores its topic; manual filter changes remain local.
  const activeGroupId = filter.factorKey === focusedKey ? filter.groupId : initialGroupId;
  const setActiveGroupId = (groupId) => setFilter({ factorKey: focusedKey, groupId, isManual: true });
  const selectedFactor = focusedFactor && (filter.factorKey !== focusedKey || !filter.isManual)
    ? focusedFactor
    : null;
  const [response, setResponse] = useState({ attempt: 0, byQuery: {} });
  const reloadArticles = useCallback(() => setAttempt((current) => current + 1), []);
  // Current page per category; categories with six or fewer topics have one.
  const [pageByGroup, setPageByGroup] = useState({});
  const setGroupPage = useCallback((groupId, page) => {
    setPageByGroup((current) => ({ ...current, [groupId]: page }));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const queries = selectedFactor
      ? [...new Set(selectedFactor.searchTerms)]
      : topicQueries;
    let next = 0;
    const store = (query, content) => {
      if (controller.signal.aborted) return;
      setResponse((previous) => ({
        attempt,
        byQuery: { ...(previous.attempt === attempt ? previous.byQuery : {}), [query]: content },
      }));
    };
    const worker = async () => {
      while (!controller.signal.aborted && next < queries.length) {
        const query = queries[next++];
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
  }, [attempt, selectedFactor]);

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
  const states = selectedFactor ? [articleContent[selectedFactor.schemaKey]] : Object.values(articleContent);
  return {
    riskFactorGroups,
    visibleGroups: riskFactorGroups
      .filter((group) => activeGroupId === "all" || group.id === activeGroupId)
      .map((group) => selectedFactor
        ? { ...group, factors: group.factors.filter((factor) => factor === selectedFactor) }
        : group)
      .map((group) => {
        const { items, page, pageCount } = paginate(group.factors, pageByGroup[group.id]);
        return { ...group, factors: items, page, pageCount };
      }),
    activeGroupId,
    setActiveGroupId,
    selectedFactor,
    setGroupPage,
    articleContent,
    isLoadingArticles: states.some((content) => content.status === "loading"),
    hasArticleErrors: states.some((content) => content.status === "error" || content.partialError),
    reloadArticles,
  };
}

export default useLearnViewModel;
