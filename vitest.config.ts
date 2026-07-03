import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    passWithNoTests: true,
    // Never pick up test copies inside agent worktrees checked out under .claude/.
    exclude: ["**/node_modules/**", "**/.claude/**", "**/.next/**"],
    // Testing-library auto-cleanup between tests hooks into global afterEach.
    globals: true,
    // Component tests opt into jsdom with a `// @vitest-environment jsdom`
    // docblock; everything else (lib, DB integration) runs in node.
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    globalSetup: ["./tests/db/global-setup.ts"],
    // DB integration tests share one embedded-postgres instance per run.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
