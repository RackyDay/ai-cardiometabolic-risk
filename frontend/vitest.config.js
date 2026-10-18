import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.js";

// Only Vitest reads this file. Production Vite settings remain unchanged.
export default mergeConfig(viteConfig, defineConfig({
  envDir: false,
  test: {
    // Keep React/jsdom suites from exhausting memory on CI and laptops.
    maxWorkers: 2,
    env: {
      VITE_API_URL: "http://127.0.0.1:9",
      VITE_SUPABASE_URL: "http://127.0.0.1:9",
      VITE_SUPABASE_ANON_KEY: "qa-anon-key-not-a-real-secret",
    },
  },
}));
