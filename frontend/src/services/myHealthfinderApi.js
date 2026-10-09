import { API_URL } from "./apiConfig";

const UNAVAILABLE = "We couldn't load prevention recommendations. Please try again.";
const INVALID_RESPONSE = "We couldn't read the recommendations. Please try again.";
const REQUEST_TIMEOUT_MS = 15000;
const ALLOWED_HOSTS = ["health.gov", "www.health.gov", "odphp.health.gov"];

function isRecommendation(item) {
  if (!item || typeof item !== "object") return false;
  if (!["id", "title", "url"].every((key) => typeof item[key] === "string" && item[key].trim())) return false;
  if (typeof item.summary !== "string" || item.source !== "MyHealthfinder") return false;
  if (item.topic_id !== null && item.topic_id !== undefined && !Number.isInteger(item.topic_id)) return false;
  try {
    const url = new URL(item.url);
    return url.protocol === "https:" && !url.username && !url.password && ALLOWED_HOSTS.includes(url.host);
  } catch {
    return false;
  }
}

/**
 * Prevention recommendations from MyHealthfinder through our FastAPI adapter.
 * @param {{topicIds: number[], age?: number, sex?: "male" | "female", tobaccoUse?: boolean, signal?: AbortSignal}} options
 * Age and sex are sent only together; omit them for topic-only results.
 * @returns {Promise<Array<{id: string, title: string, summary: string, url: string, source: string, topicId: number | null}>>}
 * Failures reject with a user-facing Error; a caller's cancellation rejects with AbortError.
 */
export async function getPreventionRecommendations({ topicIds = [], age, sex, tobaccoUse, signal } = {}) {
  if (signal?.aborted) throw new DOMException("Request cancelled", "AbortError");
  const params = new URLSearchParams({ topic_ids: topicIds.slice(0, 6).join(",") });
  if (Number.isInteger(age) && (sex === "male" || sex === "female")) {
    params.set("age", String(age));
    params.set("sex", sex);
    if (typeof tobaccoUse === "boolean") params.set("tobacco_use", String(tobaccoUse));
  }

  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  const timeout = setTimeout(cancel, REQUEST_TIMEOUT_MS);
  try {
    let response;
    try {
      response = await fetch(`${API_URL.replace(/\/$/, "")}/prevention?${params}`, {
        signal: controller.signal,
        credentials: "omit",
        headers: { Accept: "application/json" },
      });
    } catch {
      if (signal?.aborted) throw new DOMException("Request cancelled", "AbortError");
      throw new Error(UNAVAILABLE);
    }
    if (!response.ok) throw new Error(UNAVAILABLE);
    let body;
    try {
      body = await response.json();
    } catch {
      if (signal?.aborted) throw new DOMException("Request cancelled", "AbortError");
      throw new Error(INVALID_RESPONSE);
    }
    if (!body || !Array.isArray(body.recommendations) || !body.recommendations.every(isRecommendation)) {
      throw new Error(INVALID_RESPONSE);
    }
    return body.recommendations.map(({ id, title, summary, url, source, topic_id: topicId = null }) => (
      { id, title, summary, url, source, topicId }
    ));
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
  }
}
