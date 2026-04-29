import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { NextFunction, Request, Response } from "express";

import { createAuthMiddleware, type TokenVerifier } from "../middleware/authMiddlewareCore";
import { ApiError } from "../utils/apiError";

function createRequest(authorization?: string): Request {
  return {
    headers: authorization ? { authorization } : {},
  } as Request;
}

describe("auth middleware", () => {
  it("rejects a request without a bearer token", async () => {
    let verifyCalls = 0;
    const middleware = createAuthMiddleware({
      async verifyIdToken() {
        verifyCalls++;
        return { uid: "unexpected" };
      },
    });
    const nextArgs: unknown[] = [];

    await middleware(createRequest(), {} as Response, ((error?: unknown) => {
      nextArgs.push(error);
    }) as NextFunction);

    assert.equal(verifyCalls, 0);
    assert.equal(nextArgs.length, 1);
    assert.ok(nextArgs[0] instanceof ApiError);
    assert.equal((nextArgs[0] as ApiError).statusCode, 401);
  });

  it("adds the decoded Firebase user to the request", async () => {
    const verifier: TokenVerifier = {
      async verifyIdToken(token: string) {
        assert.equal(token, "valid-token");
        return {
          uid: "firebase_uid",
          email: "user@example.com",
          name: "Test User",
        };
      },
    };
    const middleware = createAuthMiddleware(verifier);
    const req = createRequest("Bearer valid-token");
    const nextArgs: unknown[] = [];

    await middleware(req, {} as Response, ((error?: unknown) => {
      nextArgs.push(error);
    }) as NextFunction);

    assert.deepEqual(req.user, {
      uid: "firebase_uid",
      email: "user@example.com",
      name: "Test User",
    });
    assert.deepEqual(nextArgs, [undefined]);
  });

  it("converts token verification failures to 401", async () => {
    const middleware = createAuthMiddleware({
      async verifyIdToken() {
        throw new Error("bad token");
      },
    });
    const nextArgs: unknown[] = [];

    await middleware(createRequest("Bearer invalid"), {} as Response, ((error?: unknown) => {
      nextArgs.push(error);
    }) as NextFunction);

    assert.equal(nextArgs.length, 1);
    assert.ok(nextArgs[0] instanceof ApiError);
    assert.equal((nextArgs[0] as ApiError).statusCode, 401);
  });
});
