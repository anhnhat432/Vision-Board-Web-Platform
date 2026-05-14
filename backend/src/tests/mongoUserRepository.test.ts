import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { Types } from "mongoose";

import { UserModel } from "../models/UserModel";
import { MongoUserRepository } from "../repositories/mongo/MongoUserRepository";
import { ApiError } from "../utils/apiError";

const now = new Date("2026-01-01T00:00:00.000Z");
const originalFindOneAndUpdate = UserModel.findOneAndUpdate;
const originalAdminEmails = process.env.ADMIN_EMAILS;

interface CapturedFindOneAndUpdate {
  filter: unknown;
  update: {
    $set?: Record<string, unknown>;
    $setOnInsert?: Record<string, unknown>;
  };
  options: unknown;
}

type MockableUserModel = {
  findOneAndUpdate: unknown;
};

function restoreEnv(): void {
  if (originalAdminEmails === undefined) {
    delete process.env.ADMIN_EMAILS;
  } else {
    process.env.ADMIN_EMAILS = originalAdminEmails;
  }
  delete process.env.ADMIN_EMAIL;
}

function createUserDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: new Types.ObjectId("507f1f77bcf86cd799439111"),
    firebaseUid: "firebase_uid",
    email: "user@example.com",
    displayName: "User",
    role: "user",
    onboardingCompletedAt: null,
    termsAcceptedAt: null,
    avatarUrl: null,
    locale: "vi",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function mockFindOneAndUpdate(doc: unknown, captured: CapturedFindOneAndUpdate[]): void {
  (UserModel as unknown as MockableUserModel).findOneAndUpdate = (
    filter: unknown,
    update: CapturedFindOneAndUpdate["update"],
    options: unknown,
  ) => {
    captured.push({ filter, update, options });
    return {
      async lean() {
        return doc;
      },
    };
  };
}

afterEach(() => {
  (UserModel as unknown as MockableUserModel).findOneAndUpdate = originalFindOneAndUpdate;
  restoreEnv();
});

describe("MongoUserRepository", () => {
  it("promotes configured admin email without conflicting role updates", async () => {
    process.env.ADMIN_EMAILS = "admin@domain.com";
    const captured: CapturedFindOneAndUpdate[] = [];
    mockFindOneAndUpdate(
      createUserDoc({
        firebaseUid: "admin_uid",
        email: "admin@domain.com",
        displayName: "admin",
        role: "admin",
      }),
      captured,
    );

    const profile = await new MongoUserRepository().findOrCreate("admin_uid", "ADMIN@DOMAIN.COM", "");

    assert.equal(profile.role, "admin");
    assert.equal(captured.length, 1);
    assert.deepEqual(captured[0]?.filter, { firebaseUid: "admin_uid" });
    assert.equal(captured[0]?.update.$set?.role, "admin");
    assert.equal("role" in (captured[0]?.update.$setOnInsert ?? {}), false);
  });

  it("creates non-admin users with user role only on insert", async () => {
    const captured: CapturedFindOneAndUpdate[] = [];
    mockFindOneAndUpdate(createUserDoc(), captured);

    const profile = await new MongoUserRepository().findOrCreate("firebase_uid", "user@example.com", "User");

    assert.equal(profile.role, "user");
    assert.equal(captured[0]?.update.$set?.role, undefined);
    assert.equal(captured[0]?.update.$setOnInsert?.role, "user");
  });

  it("rejects profile bootstrap when Firebase token has no email", async () => {
    const captured: CapturedFindOneAndUpdate[] = [];
    mockFindOneAndUpdate(createUserDoc(), captured);

    await assert.rejects(
      new MongoUserRepository().findOrCreate("firebase_uid", "   ", ""),
      (error: unknown) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.statusCode, 400);
        assert.equal(error.errorCode, "missing_auth_email");
        return true;
      },
    );
    assert.equal(captured.length, 0);
  });
});
