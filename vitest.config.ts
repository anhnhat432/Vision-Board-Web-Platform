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
    environment: "./src/test/custom-jsdom-env.ts",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    css: true,
    pool: "threads",
    fileParallelism: false,
    server: {
      deps: {
        inline: [/@radix-ui\//, /^lucide-react$/],
      },
    },
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
