import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    css: true,
    testTimeout: 15_000,
    hookTimeout: 15_000,
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.codex-worktrees/**",
      "**/.claude/worktrees/**",
      "backend/src/tests/**",
      "e2e/**",
    ],
  },
});
