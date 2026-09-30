import { API_URL } from "./apiConfig";

const UNAVAILABLE = "We couldn't load MedlinePlus articles. Please try again.";
const INVALID_RESPONSE = "We couldn't read the article results. Please try again.";
const REQUEST_TIMEOUT_MS = 15000;

function isArticle(article) {
  if (!article || typeof article !== "object") return false;
  if (!["id", "title", "url"].every((key) => typeof article[key] === "string" && article[key].trim())) return false;
  if (typeof article.summary !== "string" || article.source !== "MedlinePlus") return false;
  try {
    const url = new URL(article.url);
    return url.protocol === "https:" && !url.username && !url.password &&
      ["medlineplus.gov", "www.medlineplus.gov"].includes(url.host);
  } catch {
    return false;
  }
}

/**
 * Search public MedlinePlus topics through our FastAPI XML adapter.
 * @param {string} query Keyword search, independent of assessment/login state.
 * @param {{limit?: number, signal?: AbortSignal}} options 1–5 results; default 3.
 * @returns {Promise<Array<{id: string, title: string, summary: string, url: string, source: string}>>}
 * Empty/blank searches resolve to []; failures reject with a user-facing Error.
 * A caller's cancellation rejects with AbortError, suitable for search-as-you-type.
 */
export async function searchMedlinePlus(query, { limit = 3, signal } = {}) {
  if (typeof query !== "string") throw new Error("Enter a search term.");
  const term = query.trim().replace(/\s+/g, " ");
  if (term.length > 200) throw new Error("Keep your search to 200 characters or fewer.");
  if (!Number.isInteger(limit) || limit < 1 || limit > 5) throw new Error("Choose between 1 and 5 articles.");
  if (signal?.aborted) throw new DOMException("Search cancelled", "AbortError");
  if (!term) return [];

  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  const timeout = setTimeout(cancel, REQUEST_TIMEOUT_MS);
  try {
    const params = new URLSearchParams({ query: term, limit: String(limit) });
    let response;
    try {
      response = await fetch(`${API_URL.replace(/\/$/, "")}/learn?${params}`, {
        signal: controller.signal,
        credentials: "omit",
        headers: { Accept: "application/json" },
      });
    } catch {
      if (signal?.aborted) throw new DOMException("Search cancelled", "AbortError");
      throw new Error(UNAVAILABLE);
    }
    if (!response.ok) throw new Error(UNAVAILABLE);
    let body;
    try {
      body = await response.json();
    } catch {
      if (signal?.aborted) throw new DOMException("Search cancelled", "AbortError");
      throw new Error(INVALID_RESPONSE);
    }
    if (!body || !Array.isArray(body.articles) || !body.articles.every(isArticle)) {
      throw new Error(INVALID_RESPONSE);
    }
    const seen = new Set();
    return body.articles.filter((article) => {
      if (seen.has(article.url)) return false;
      seen.add(article.url);
      return true;
    }).slice(0, limit).map(({ id, title, summary, url, source }) => ({ id, title, summary, url, source }));
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
  }
}
