import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export const baseTestExclude = [
  "**/node_modules/**",
  "**/dist/**",
  "**/.codex-worktrees/**",
  "**/.claude/worktrees/**",
  "backend/src/tests/**",
  "e2e/**",
];

const baseTestConfig = {
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
  exclude: baseTestExclude,
};

export function defineVisionBoardVitestConfig(testOverrides = {}) {
  return defineConfig({
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@shared": path.resolve(__dirname, "./backend/src/shared"),
      },
    },
    test: {
      ...baseTestConfig,
      ...testOverrides,
    },
  });
}
