import { describe, expect, it } from "vitest";

import { isChunkLoadError } from "./chunkLoad";

describe("chunkLoad", () => {
  it("detects stale Vite dynamic import failures", () => {
    expect(
      isChunkLoadError(
        new TypeError(
          "Failed to fetch dynamically imported module: https://vision-board-web-platform.vercel.app/assets/WeekEditor-DhdhbzoY.js",
        ),
      ),
    ).toBe(true);
  });

  it("ignores non-chunk errors", () => {
    expect(isChunkLoadError(new Error("User profile request failed"))).toBe(false);
  });
});
