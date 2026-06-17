import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { NextFunction, Request, Response } from "express";

import { requireAdmin, clearAdminRoleCache } from "../middleware/requireAdmin";
import { UserModel } from "../models/UserModel";

type MockableUserModel = {
  findOne: unknown;
};

const originalFindOne = UserModel.findOne;

afterEach(() => {
  (UserModel as unknown as MockableUserModel).findOne = originalFindOne;
  clearAdminRoleCache();
});

function createNextRecorder(): { next: NextFunction; getError(): unknown } {
  let nextError: unknown;
  return {
    next(error?: unknown) {
      nextError = error;
    },
    getError() {
      return nextError;
    },
  };
}

function mockRoleLookup(role: "user" | "admin", calls: { count: number }): void {
  (UserModel as unknown as MockableUserModel).findOne = () => {
    calls.count++;
    const query = {
      select() {
        return query;
      },
      maxTimeMS() {
        return query;
      },
      async lean() {
        return { role };
      },
    };
    return query;
  };
}

describe("requireAdmin", () => {
  it("falls back to the database role when the Firebase role claim is non-admin", async () => {
    const calls = { count: 0 };
    mockRoleLookup("admin", calls);
    const recorder = createNextRecorder();
    const req = {
      user: {
        uid: "admin_uid",
        email: "admin@example.com",
        role: "user",
      },
      firebaseToken: {
        uid: "admin_uid",
        email: "admin@example.com",
        role: "user",
      },
    } as unknown as Request;

    await requireAdmin(req, {} as Response, recorder.next);

    assert.equal(recorder.getError(), undefined);
    assert.equal(calls.count, 1);
  });

  it("still rejects users whose database role is not admin", async () => {
    const calls = { count: 0 };
    mockRoleLookup("user", calls);
    const recorder = createNextRecorder();
    const req = {
      user: {
        uid: "normal_uid",
        email: "user@example.com",
        role: "user",
      },
      firebaseToken: {
        uid: "normal_uid",
        email: "user@example.com",
        role: "user",
      },
    } as unknown as Request;

    await requireAdmin(req, {} as Response, recorder.next);

    const error = recorder.getError() as { statusCode?: number };
    assert.equal(error?.statusCode, 403);
    assert.equal(calls.count, 1);
  });
});
