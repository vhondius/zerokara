import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Separate from vite.config.ts so tests don't load the app's build plugins.
// Only *.test.ts: the route file learn.$bookId.test.tsx is a page, not a test.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: { include: ["src/**/*.test.ts"] },
});
