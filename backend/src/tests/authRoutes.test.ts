import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, it } from "node:test";
import express, { type Express } from "express";

import { createAuthMiddleware } from "../middleware/authMiddlewareCore";
import { errorMiddleware } from "../middleware/errorMiddleware";
import { generalApiRateLimiter } from "../middleware/rateLimiters";
import { authRoutes } from "../routes/authRoutes";
import { authService } from "../services/authService";
import type { UpdateUserData, UserEntity } from "../repositories/mongo/MongoUserRepository";
import { ownerUserId } from "./testHelpers";

interface JsonResponse {
  status: number;
  body: {
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
    errorCode?: string;
  };
}

type Restorer = () => void;

const now = new Date("2026-07-08T00:00:00.000Z");

let profiles: Map<string, UserEntity>;
let restoreAuthService: Restorer | null = null;
let originalConsoleWarn: typeof console.warn;

function replaceMethod<T extends object, K extends keyof T>(
  target: T,
  key: K,
  value: T[K],
): Restorer {
  const original = target[key];
  target[key] = value;
  return () => {
    target[key] = original;
  };
}

function createProfile(uid: string, email: string, displayName: string): UserEntity {
  return {
    id: `${uid}_profile`,
    firebaseUid: uid,
    email,
    displayName,
    role: "user",
    onboardingCompletedAt: null,
    termsAcceptedAt: null,
    avatarUrl: null,
    locale: "vi",
    createdAt: now,
    updatedAt: now,
  };
}

function installAuthServiceMocks(): Restorer {
  const restorers = [
    replaceMethod(
      authService,
      "findOrCreateUser",
      (async (uid: string, email: string, name: string | undefined) => {
        const existing = profiles.get(uid);
        if (existing) return existing;

        const profile = createProfile(uid, email.toLowerCase().trim(), name?.trim() || "User");
        profiles.set(uid, profile);
        return profile;
      }) as typeof authService.findOrCreateUser,
    ),
    replaceMethod(
      authService,
      "getUserByFirebaseUid",
      (async (uid: string) => profiles.get(uid) ?? null) as typeof authService.getUserByFirebaseUid,
    ),
    replaceMethod(
      authService,
      "updateUserProfile",
      (async (uid: string, updates: UpdateUserData) => {
        const existing = profiles.get(uid);
        if (!existing) return null;

        const updated = {
          ...existing,
          ...updates,
          updatedAt: new Date("2026-07-08T00:05:00.000Z"),
        };
        profiles.set(uid, updated);
        return updated;
      }) as typeof authService.updateUserProfile,
    ),
  ];

  return () => {
    for (const restore of restorers.reverse()) {
      restore();
    }
  };
}

function createAuthRoutesTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use("/api", generalApiRateLimiter);
  app.use(
    "/api",
    createAuthMiddleware({
      async verifyIdToken(token: string) {
        if (token === "owner-token") {
          return {
            uid: ownerUserId,
            email: "owner@example.test",
            name: "Owner User",
            email_verified: true,
          };
        }
        throw new Error("Invalid test token");
      },
    }),
  );
  app.use("/api", authRoutes);
  app.use(errorMiddleware);
  return app;
}

async function requestJson(
  app: Express,
  method: string,
  path: string,
  options: { body?: unknown; token?: string | null } = {},
): Promise<JsonResponse> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address() as AddressInfo;
  const headers: Record<string, string> = {
    accept: "application/json",
  };
  if (options.body !== undefined) headers["content-type"] = "application/json";
  if (options.token !== null) headers.authorization = `Bearer ${options.token ?? "owner-token"}`;

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const text = await response.text();
    return {
      status: response.status,
      body: text ? JSON.parse(text) : {},
    };
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

async function bootstrapProfile(app: Express): Promise<Record<string, unknown>> {
  const response = await requestJson(app, "POST", "/api/auth/profile");
  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.ok(response.body.data);
  return response.body.data;
}

function assertErrorResponse(response: JsonResponse, status: number, messagePattern: RegExp): void {
  assert.equal(response.status, status);
  assert.equal(response.body.success, false);
  assert.match(response.body.message ?? "", messagePattern);
}

beforeEach(() => {
  profiles = new Map();
  restoreAuthService = installAuthServiceMocks();
  originalConsoleWarn = console.warn;
  console.warn = () => {};
});

afterEach(() => {
  console.warn = originalConsoleWarn;
  restoreAuthService?.();
  restoreAuthService = null;
});

describe("auth profile routes", () => {
  it("requires Firebase auth before bootstrapping the profile", async () => {
    const response = await requestJson(createAuthRoutesTestApp(), "POST", "/api/auth/profile", {
      token: null,
    });

    assertErrorResponse(response, 401, /Unauthorized/i);
    assert.equal(profiles.size, 0);
  });

  it("returns 404 for an authenticated user before profile bootstrap", async () => {
    const response = await requestJson(createAuthRoutesTestApp(), "GET", "/api/auth/profile");

    assertErrorResponse(response, 404, /bootstrap/i);
    assert.equal(response.body.errorCode, "not_found");
  });

  it("bootstraps and reads the authenticated user's profile", async () => {
    const app = createAuthRoutesTestApp();

    const created = await bootstrapProfile(app);
    assert.equal(created.firebaseUid, ownerUserId);
    assert.equal(created.email, "owner@example.test");
    assert.equal(created.displayName, "Owner User");
    assert.equal(created.role, "user");

    const read = await requestJson(app, "GET", "/api/auth/profile");
    assert.equal(read.status, 200);
    assert.equal(read.body.success, true);
    assert.equal(read.body.data?.firebaseUid, ownerUserId);
    assert.equal(read.body.data?.email, "owner@example.test");
  });

  it("rejects profile patches that attempt to update protected identity or role fields", async () => {
    const app = createAuthRoutesTestApp();
    await bootstrapProfile(app);

    const response = await requestJson(app, "PATCH", "/api/auth/profile", {
      body: {
        role: "admin",
        email: "attacker@example.test",
        displayName: "Updated Name",
      },
    });

    assertErrorResponse(response, 400, /cannot be updated/i);
    const stored = profiles.get(ownerUserId);
    assert.equal(stored?.role, "user");
    assert.equal(stored?.email, "owner@example.test");
    assert.equal(stored?.displayName, "Owner User");
  });

  it("normalizes allowed profile patch fields and accepts valid terms dates", async () => {
    const app = createAuthRoutesTestApp();
    await bootstrapProfile(app);

    const response = await requestJson(app, "PATCH", "/api/auth/profile", {
      body: {
        displayName: ` ${"A".repeat(105)} `,
        avatarUrl: " https://example.test/avatar.png ",
        locale: " vi-VN-extra ",
        termsAcceptedAt: "2026-07-08T00:00:00.000Z",
      },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data?.displayName, "A".repeat(100));
    assert.equal(response.body.data?.avatarUrl, "https://example.test/avatar.png");
    assert.equal(response.body.data?.locale, "vi-VN-extr");
    assert.equal(response.body.data?.termsAcceptedAt, "2026-07-08T00:00:00.000Z");
  });

  it("rejects invalid profile date fields before updating the stored profile", async () => {
    const app = createAuthRoutesTestApp();
    await bootstrapProfile(app);

    const response = await requestJson(app, "PATCH", "/api/auth/profile", {
      body: {
        termsAcceptedAt: "not-a-date",
      },
    });

    assertErrorResponse(response, 400, /valid ISO 8601 date/i);
    assert.equal(profiles.get(ownerUserId)?.termsAcceptedAt, null);
  });
});
