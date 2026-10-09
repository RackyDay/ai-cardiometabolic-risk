import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getPreventionRecommendations } from "./myHealthfinderApi";

const item = {
  id: "533", title: "Get Your Blood Pressure Checked", summary: "Plain-language advice.",
  url: "https://odphp.health.gov/myhealthfinder/topics/533", source: "MyHealthfinder", topic_id: 533,
};

beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
afterEach(() => vi.unstubAllGlobals());
const reply = (body) => ({ ok: true, json: async () => body });

it("sends topics with age, sex and tobacco use, and returns only public fields", async () => {
  fetch.mockResolvedValue(reply({ recommendations: [{ ...item, extra: "internal" }, { ...item, id: "25", topic_id: null }] }));
  const result = await getPreventionRecommendations({ topicIds: [533, 30610], age: 52, sex: "male", tobaccoUse: true });
  expect(result).toEqual([
    { id: "533", title: item.title, summary: item.summary, url: item.url, source: "MyHealthfinder", topicId: 533 },
    { id: "25", title: item.title, summary: item.summary, url: item.url, source: "MyHealthfinder", topicId: null },
  ]);
  const [url, options] = fetch.mock.calls[0];
  const params = new URL(url).searchParams;
  expect(new URL(url).pathname).toBe("/prevention");
  expect(Object.fromEntries(params)).toEqual({ topic_ids: "533,30610", age: "52", sex: "male", tobacco_use: "true" });
  expect(options.credentials).toBe("omit");
});

it("omits demographics unless both age and a supported sex are known", async () => {
  fetch.mockResolvedValue(reply({ recommendations: [] }));
  await getPreventionRecommendations({ topicIds: [25], age: 52, sex: undefined, tobaccoUse: true });
  expect(Object.fromEntries(new URL(fetch.mock.calls[0][0]).searchParams)).toEqual({ topic_ids: "25" });
});

it.each([null, {}, { recommendations: null }, { recommendations: [{}] },
  { recommendations: [{ ...item, source: "MedlinePlus" }] },
  { recommendations: [{ ...item, topic_id: "533" }] },
  { recommendations: [{ ...item, url: "javascript:alert(1)" }] },
  { recommendations: [{ ...item, url: "https://health.gov.evil.example/page" }] },
])("rejects malformed or unsafe responses: %j", async (body) => {
  fetch.mockResolvedValue(reply(body));
  await expect(getPreventionRecommendations({ topicIds: [533] })).rejects.toThrow("couldn't read");
});

it("handles failed requests and cancellation", async () => {
  fetch.mockResolvedValue({ ok: false });
  await expect(getPreventionRecommendations({ topicIds: [533] })).rejects.toThrow("couldn't load");
  fetch.mockRejectedValue(new TypeError("Failed to fetch"));
  await expect(getPreventionRecommendations({ topicIds: [533] })).rejects.toThrow("couldn't load");

  const controller = new AbortController();
  controller.abort();
  await expect(getPreventionRecommendations({ topicIds: [533], signal: controller.signal }))
    .rejects.toMatchObject({ name: "AbortError" });
});
