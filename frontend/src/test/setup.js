// Vitest global setup for the frontend suite.
//
// - Pulls in jest-dom's custom matchers (toBeInTheDocument, etc).
// - Clears localStorage and all mocks between tests so AuthProvider specs,
//   which lean heavily on both, start from a clean slate every time.
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => {
    throw new Error("Unmocked fetch in test; supply a mocked response.");
  }));
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
