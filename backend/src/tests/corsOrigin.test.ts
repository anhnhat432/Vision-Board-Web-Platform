import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createCorsOptions,
  isCorsOriginAllowed,
  parseAllowedCorsOrigins,
} from "../middleware/corsOrigin";
import { ApiError } from "../utils/apiError";

describe("CORS origin config", () => {
  it("normalizes comma-separated allowed origins", () => {
    const origins = parseAllowedCorsOrigins(
      "https://vision-board-web-platform.vercel.app/, http://localhost:5173",
      { nodeEnv: "development" },
    );

    assert.deepEqual(origins, ["https://vision-board-web-platform.vercel.app", "http://localhost:5173"]);
  });

  it("allows exact configured origins and server-to-server requests", () => {
    const origins = ["https://vision-board-web-platform.vercel.app"];

    assert.equal(isCorsOriginAllowed(undefined, origins), true);
    assert.equal(isCorsOriginAllowed("https://vision-board-web-platform.vercel.app", origins), true);
    assert.equal(isCorsOriginAllowed("https://evil.example.com", origins), false);
  });

  it("rejects wildcard, invalid origins, and URL paths", () => {
    assert.throws(() => parseAllowedCorsOrigins("*"), /wildcard/i);
    assert.throws(() => parseAllowedCorsOrigins("not-a-url"), /invalid origin/i);
    assert.throws(() => parseAllowedCorsOrigins("https://example.com/app"), /origin only/i);
  });

  it("requires https for non-localhost origins in production", () => {
    assert.throws(
      () => parseAllowedCorsOrigins("http://vision-board-web-platform.vercel.app", { nodeEnv: "production" }),
      /must use https/i,
    );

    assert.deepEqual(
      parseAllowedCorsOrigins("http://localhost:5173", { nodeEnv: "production" }),
      ["http://localhost:5173"],
    );
  });

  it("returns a cors delegate that rejects unlisted browser origins", async () => {
    const options = createCorsOptions(["https://vision-board-web-platform.vercel.app"]);
    assert.equal(typeof options.origin, "function");

    await new Promise<void>((resolve, reject) => {
      if (typeof options.origin !== "function") {
        reject(new Error("Expected CORS origin delegate."));
        return;
      }

      options.origin("https://evil.example.com", (error) => {
        try {
          assert.ok(error instanceof ApiError);
          assert.equal(error.statusCode, 403);
          assert.equal(error.errorCode, "cors_origin_not_allowed");
          resolve();
        } catch (assertionError) {
          reject(assertionError);
        }
      });
    });
  });
});
