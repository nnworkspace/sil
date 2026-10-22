import { defineConfig } from "vitest/config";
import path from "node:path";

const alias = { "@": path.resolve(__dirname, "src") };

/**
 * Two tiers, two environments, one command (ADR-0015).
 *
 * `unit` is pure logic and stays in `node` — it runs in a few hundred
 * milliseconds and is meant to be run constantly. `components` renders real
 * components in jsdom to assert behaviour that cannot be expressed as a
 * function, above all that **destructive actions ask first** (#195, #198).
 *
 * The split is by file extension rather than by directory: `.test.ts` is pure,
 * `.test.tsx` renders. That way a test lands in the right environment by virtue
 * of what it is, with no configuration to keep in sync.
 */
export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          // Layer 1 is pure logic — no DOM, no database, no Next runtime.
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "components",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
          setupFiles: ["src/test/setup-dom.ts"],
        },
      },
    ],
  },
});
