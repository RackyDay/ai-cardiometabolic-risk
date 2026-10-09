import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { searchMedlinePlus } from "./medlinePlusApi";

const article = {
  id: "https://medlineplus.gov/heartdiseases.html",
  title: "Heart Diseases", summary: "A topic overview.",
  url: "https://medlineplus.gov/heartdiseases.html", source: "MedlinePlus",
};

beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
const reply = (body) => ({ ok: true, json: async () => body });

it("encodes keywords and returns only the public article fields", async () => {
  fetch.mockResolvedValue(reply({ articles: [{ ...article, extra: "internal" }, article] }));
  expect(await searchMedlinePlus('heart & blood + "pressure"', { limit: 2 })).toEqual([article]);
  const [url, options] = fetch.mock.calls[0];
  expect(new URL(url).pathname).toBe("/learn");
  expect(new URL(url).searchParams.get("query")).toBe('heart & blood + "pressure"');
  expect(new URL(url).searchParams.get("limit")).toBe("2");
  expect(options.credentials).toBe("omit");
  expect(options.headers.Authorization).toBeUndefined();
});

it("handles empty searches and empty results", async () => {
  expect(await searchMedlinePlus("  ")).toEqual([]);
  expect(fetch).not.toHaveBeenCalled();
  fetch.mockResolvedValue(reply({ articles: [] }));
  expect(await searchMedlinePlus("no results")).toEqual([]);
});

it.each([null, {}, { articles: null }, { articles: [{}] },
  { articles: [{ ...article, url: "javascript:alert(1)" }] },
  { articles: [{ ...article, url: "https://medlineplus.gov.evil.example" }] },
])("rejects malformed or unsafe article responses: %j", async (body) => {
  fetch.mockResolvedValue(reply(body));
  await expect(searchMedlinePlus("heart")).rejects.toThrow("couldn't read");
});

it("handles failed HTTP, network, and JSON responses", async () => {
  fetch.mockResolvedValueOnce({ ok: false, status: 503 });
  await expect(searchMedlinePlus("heart")).rejects.toThrow("couldn't load");
  fetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
  await expect(searchMedlinePlus("heart")).rejects.toThrow("couldn't load");
  fetch.mockResolvedValueOnce({ ok: true, json: async () => { throw new SyntaxError("HTML instead of JSON"); } });
  await expect(searchMedlinePlus("heart")).rejects.toThrow("couldn't read");
});

it("validates public search arguments", async () => {
  await expect(searchMedlinePlus(null)).rejects.toThrow("Enter a search term");
  await expect(searchMedlinePlus("x".repeat(201))).rejects.toThrow("200 characters");
  await expect(searchMedlinePlus("heart", { limit: 6 })).rejects.toThrow("1 and 5");
  expect(fetch).not.toHaveBeenCalled();
});

function pendingFetch() {
  fetch.mockImplementation((url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
  }));
}

it("supports caller cancellation", async () => {
  pendingFetch();
  const controller = new AbortController();
  const result = searchMedlinePlus("heart", { signal: controller.signal });
  controller.abort();
  await expect(result).rejects.toMatchObject({ name: "AbortError" });
});

it("times out a stalled request instead of leaving the page loading forever", async () => {
  vi.useFakeTimers();
  pendingFetch();
  const result = searchMedlinePlus("heart");
  const assertion = expect(result).rejects.toThrow("couldn't load");
  await vi.advanceTimersByTimeAsync(15000);
  await assertion;
});
