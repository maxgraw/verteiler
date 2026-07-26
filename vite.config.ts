import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import { sveltekit } from "@sveltejs/kit/vite";
import adapter from "@sveltejs/adapter-static";

export default defineConfig({
  plugins: [
    sveltekit({
      adapter: adapter({
        pages: "build",
        assets: "build",
        fallback: undefined,
        precompress: false,
        strict: true,
      }),
    }),
  ],
  test: {
    expect: { requireAssertions: true },
    projects: [
      {
        extends: "./vite.config.ts",
        test: {
          name: "client",
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: "chromium", headless: true }],
          },
          // these need browser APIs: performance, Web Workers, Wasm, localStorage
          include: [
            "tests/**/*.svelte.{test,spec}.{js,ts}",
            "tests/algorithm.spec.ts",
            "tests/benchmark.spec.ts",
          ],
        },
      },

      {
        extends: "./vite.config.ts",
        test: {
          name: "server",
          environment: "node",
          include: ["tests/**/*.{test,spec}.{js,ts}"],
          exclude: [
            "tests/**/*.svelte.{test,spec}.{js,ts}",
            "tests/algorithm.spec.ts",
            "tests/benchmark.spec.ts",
          ],
        },
      },
    ],
  },
});
