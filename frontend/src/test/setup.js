// Vitest global setup for the frontend suite.
//
// - Pulls in jest-dom's custom matchers (toBeInTheDocument, etc).
// - Clears localStorage and all mocks between tests so AuthProvider specs,
//   which lean heavily on both, start from a clean slate every time.
import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});
