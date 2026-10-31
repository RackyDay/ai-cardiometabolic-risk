import { beforeEach, describe, expect, it, vi } from "vitest";
import { API_URL } from "./apiConfig";
import {
  predictRisk, editRiskCalculation, saveStressResult, signUp, logIn,
  updateUsername, updatePassword, deleteAccount, logOut,
  getLatestPrediction, getRiskCalculationHistory, getRiskCalculation,
  deleteRiskCalculation,
} from "./api";

const token = "fake-user-token";
const inputs = { gender: "F", age: 45, currentSmoker: false };
const prediction = {
  risk_score: 12.3,
  top_contributors: [{ feature: "age", value: 45, contribution: 0.25 }],
  riskcalc_id: null,
};
const jsonHeaders = { "Content-Type": "application/json" };
const authHeaders = { Authorization: `Bearer ${token}` };

function reply(body, status = 200) {
  return { ok: status >= 200 && status < 300, json: vi.fn().mockResolvedValue(body) };
}

beforeEach(() => vi.stubGlobal("fetch", vi.fn()));

describe("prediction API contract", () => {
  it("posts guest inputs unchanged and returns score and contributors", async () => {
    fetch.mockResolvedValueOnce(reply(prediction));
    await expect(predictRisk(inputs)).resolves.toEqual(prediction);
    expect(fetch).toHaveBeenCalledExactlyOnceWith(`${API_URL}/predict`, {
      method: "POST", headers: jsonHeaders, body: JSON.stringify(inputs),
    });
  });

  it("adds the bearer token for an authenticated prediction", async () => {
    fetch.mockResolvedValueOnce(reply(prediction));
    await predictRisk(inputs, token);
    expect(fetch).toHaveBeenCalledWith(`${API_URL}/predict`, {
      method: "POST", headers: { ...jsonHeaders, ...authHeaders }, body: JSON.stringify(inputs),
    });
  });

  it.each([
    [422, { detail: [{ loc: ["body", "age"], msg: "Input should be less than or equal to 150" }] },
      "Age: Input should be less than or equal to 150"],
    [401, { detail: "Invalid or expired token" }, "Invalid or expired token"],
    [500, { detail: "Internal server error" }, "Internal server error"],
  ])("rejects HTTP %s instead of treating an error as a prediction", async (status, body, message) => {
    fetch.mockResolvedValueOnce(reply(body, status));
    await expect(predictRisk(inputs)).rejects.toThrow(message);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("joins multiple validation errors and handles a missing location", async () => {
    fetch.mockResolvedValueOnce(reply({ detail: [
      { loc: ["body", "age"], msg: "Field required" },
      { msg: "Invalid input" },
    ] }, 422));
    await expect(predictRisk(inputs)).rejects.toThrow("Age: Field required Value: Invalid input");
  });

  it("uses the existing fallback message for a non-JSON error", async () => {
    fetch.mockResolvedValueOnce({ ok: false, json: vi.fn().mockRejectedValue(new SyntaxError("HTML response")) });
    await expect(predictRisk(inputs)).rejects.toThrow("Prediction request failed - please try again.");
  });

  it("propagates transport failure without a retry or fabricated score", async () => {
    const error = new TypeError("Failed to fetch");
    fetch.mockRejectedValueOnce(error);
    await expect(predictRisk(inputs)).rejects.toBe(error);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe("saved assessment and account request contracts", () => {
  it.each([
    ["edit assessment", () => editRiskCalculation(token, "calc-1", inputs), "PUT", "/api/risk-calculations/calc-1", inputs],
    ["save stress", () => saveStressResult(token, "calc-1", { pss1: 2 }), "PUT", "/api/risk-calculations/calc-1/stress", { answers: { pss1: 2 } }],
    ["update username", () => updateUsername({ username: "tester", accessToken: token }), "PATCH", "/me/username", { username: "tester" }],
    ["update password", () => updatePassword({ currentPassword: "fake-old", newPassword: "fake-new", accessToken: token }), "PATCH", "/me/password", { current_password: "fake-old", new_password: "fake-new" }],
    ["delete account", () => deleteAccount({ currentPassword: "fake-old", accessToken: token }), "POST", "/me/delete", { current_password: "fake-old" }],
  ])("%s preserves its method, path, auth header and JSON body", async (_label, call, method, path, body) => {
    fetch.mockResolvedValueOnce(reply({}));
    await call();
    expect(fetch).toHaveBeenCalledExactlyOnceWith(`${API_URL}${path}`, {
      method, headers: { ...jsonHeaders, ...authHeaders }, body: JSON.stringify(body),
    });
  });

  it.each([
    ["latest", () => getLatestPrediction(token), "/predictions/latest"],
    ["history", () => getRiskCalculationHistory(token), "/api/risk-calculations"],
    ["selected assessment", () => getRiskCalculation(token, "calc-1"), "/api/risk-calculations/calc-1"],
  ])("returns the %s response unchanged with authentication", async (_label, call, path) => {
    const body = { example: "server-response" };
    fetch.mockResolvedValueOnce(reply(body));
    await expect(call()).resolves.toEqual(body);
    expect(fetch).toHaveBeenCalledExactlyOnceWith(`${API_URL}${path}`, { headers: authHeaders });
  });

  it("encodes the assessment id when deleting", async () => {
    const response = reply(undefined, 204);
    fetch.mockResolvedValueOnce(response);
    await expect(deleteRiskCalculation(token, "id&other=value")).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledExactlyOnceWith(`${API_URL}/delete?assessment_id=id%26other%3Dvalue`, {
      method: "POST", headers: authHeaders,
    });
    expect(response.json).not.toHaveBeenCalled();
  });

  it.each([
    ["signup", () => signUp({ email: "qa@example.com", username: "tester", password: "fake-password" }),
      { email: "qa@example.com", username: "tester", password: "fake-password" }],
    ["login", () => logIn({ identifier: "tester", password: "fake-password" }),
      { identifier: "tester", password: "fake-password" }],
  ])("%s sends its existing credential fields", async (action, call, body) => {
    fetch.mockResolvedValueOnce(reply({ user: { id: "fake-user" } }));
    await expect(call()).resolves.toEqual({ user: { id: "fake-user" } });
    expect(fetch).toHaveBeenCalledExactlyOnceWith(`${API_URL}/auth/${action}`, {
      method: "POST", headers: jsonHeaders, body: JSON.stringify(body),
    });
  });

  it.each([token, null])("logout supports the existing optional token (%s)", async (accessToken) => {
    fetch.mockResolvedValueOnce(reply(undefined, 204));
    await logOut(accessToken);
    expect(fetch).toHaveBeenCalledExactlyOnceWith(`${API_URL}/auth/logout`, {
      method: "POST", headers: accessToken ? authHeaders : {},
    });
  });

  it("rejects a read-only historical assessment conflict", async () => {
    fetch.mockResolvedValueOnce(reply({ detail: "Historical assessments are read-only." }, 409));
    await expect(editRiskCalculation(token, "old", inputs)).rejects.toThrow("Historical assessments are read-only.");
  });
});
