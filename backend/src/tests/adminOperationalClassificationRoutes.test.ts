import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { afterEach, describe, it } from "node:test";
import express, { type Express } from "express";
import mongoose, { type ClientSession } from "mongoose";

process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/admin-operational-classification-routes-test";
process.env.FIREBASE_PROJECT_ID ??= "admin-operational-classification-routes-test";
process.env.FIREBASE_CLIENT_EMAIL ??= "firebase-admin@example.test";
process.env.FIREBASE_PRIVATE_KEY ??= "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----\\n";
process.env.FRONTEND_ORIGIN ??= "http://localhost:5173";
process.env.ADMIN_AUDIT_FINGERPRINT_SECRET ??= "test-admin-audit-fingerprint-secret-at-least-32-bytes";

import { createAuthMiddleware } from "../middleware/authMiddlewareCore";
import { errorMiddleware } from "../middleware/errorMiddleware";
import { clearAdminRoleCache } from "../middleware/requireAdmin";
import { AdminAuditOutboxModel } from "../models/AdminAuditOutboxModel";
import { AuditLogModel } from "../models/auditLogModel";
import { PaymentOrderModel } from "../models/PaymentOrderModel";
import { UserModel } from "../models/UserModel";
import { adminRoutes, getOperationalClassificationFailureAuditPayload } from "../routes/adminRoutes";
import { ApiError } from "../utils/apiError";

type MockableModel = { findOne: unknown; create: unknown };
const originalUserFindOne = (UserModel as unknown as MockableModel).findOne;
const originalOutboxFindOne = (AdminAuditOutboxModel as unknown as MockableModel).findOne;
const originalOutboxCreate = (AdminAuditOutboxModel as unknown as MockableModel).create;
const originalAuditFindOne = (AuditLogModel as unknown as MockableModel).findOne;
const originalAuditCreate = (AuditLogModel as unknown as MockableModel).create;
const originalStartSession = mongoose.startSession;
const originalPaymentFindOne = (PaymentOrderModel as unknown as { findOne: unknown }).findOne;

function createApp(): Express {
  const app = express();
  app.use(express.json());
  app.use("/api", createAuthMiddleware({
    async verifyIdToken(token: string) {
      if (token === "admin-token") return { uid: "admin_uid", email: "admin@example.test", emailVerified: true };
      if (token === "user-token") return { uid: "user_uid", email: "user@example.test", emailVerified: true };
      throw new Error("Invalid test token");
    },
  }));
  app.use("/api", adminRoutes);
  app.use(errorMiddleware);
  return app;
}

async function request(app: Express, token: string | undefined, body: unknown, path = "/admin/users/operational-classification") {
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as AddressInfo;
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api${path}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, json: text.startsWith("{") ? JSON.parse(text) as Record<string, unknown> : {} };
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

function installRouteModels() {
  const users = new Map<string, { firebaseUid: string; role?: string; operationalClassification?: Record<string, unknown> }>([
    ["admin_uid", { firebaseUid: "admin_uid", role: "admin" }],
    ["exists", { firebaseUid: "exists" }],
  ]);
  const events = new Map<string, Record<string, unknown>>();
  const auditEntries: Array<Record<string, unknown>> = [];
  const payment = {
    orderId: "VBTEST0001",
    userId: "orphan_uid",
    status: "completed",
    amount: 120000,
    provider: "payos",
    reporting: { kpiStatus: "included" },
    operationalClassification: undefined as Record<string, unknown> | undefined,
  };
  let failAuditPersistence = false;
  (UserModel as unknown as MockableModel).findOne = (query: { firebaseUid?: string }) => {
    const stored = query.firebaseUid ? users.get(query.firebaseUid) : undefined;
    const chain = {
      select() { return chain; }, maxTimeMS() { return chain; },
      session() {
        if (!stored) return null;
        return {
          ...structuredClone(stored),
          async save() { users.set(stored.firebaseUid, { firebaseUid: stored.firebaseUid, operationalClassification: this.operationalClassification }); },
        };
      },
      async lean() { return stored ? structuredClone(stored) : null; },
    };
    return chain;
  };
  (PaymentOrderModel as unknown as { findOne: unknown }).findOne = (query: { orderId?: string }) => {
    const stored = query.orderId === payment.orderId ? payment : undefined;
    const chain = {
      session() {
        if (!stored) return null;
        return {
          ...stored,
          async save() {
            const { save: _save, ...next } = this as Record<string, unknown> & { save: unknown };
            Object.assign(stored, structuredClone(next));
          },
        };
      },
      async lean() { return stored ? structuredClone(stored) : null; },
    };
    return chain;
  };
  (AdminAuditOutboxModel as unknown as MockableModel).findOne = (query: { eventId?: string }) => {
    const event = query.eventId ? events.get(query.eventId) : undefined;
    const chain = { select() { return chain; }, async lean() { return event ?? null; } };
    return chain;
  };
  (AuditLogModel as unknown as MockableModel).findOne = () => ({ select() { return this; }, async lean() { return null; } });
  (AuditLogModel as unknown as MockableModel).create = async (entry: Record<string, unknown>) => {
    auditEntries.push(structuredClone(entry));
    return entry;
  };
  (AdminAuditOutboxModel as unknown as MockableModel).create = async (items: Array<Record<string, unknown>>) => {
    if (failAuditPersistence) throw new Error("audit persistence unavailable");
    events.set(items[0].eventId as string, items[0]);
    return items;
  };
  (mongoose as unknown as { startSession: unknown }).startSession = async () => ({
    async withTransaction(work: () => Promise<void>) {
      const snapshot = structuredClone([...users.entries()]);
      try {
        await work();
      } catch (error) {
        users.clear();
        for (const [key, value] of snapshot) users.set(key, value);
        throw error;
      }
    }, async endSession() {},
  } as unknown as ClientSession);
  return { users, payment, events, auditEntries, setAuditFailure(value: boolean) { failAuditPersistence = value; } };
}

afterEach(() => {
  (UserModel as unknown as MockableModel).findOne = originalUserFindOne;
  (AdminAuditOutboxModel as unknown as MockableModel).findOne = originalOutboxFindOne;
  (AdminAuditOutboxModel as unknown as MockableModel).create = originalOutboxCreate;
  (AuditLogModel as unknown as MockableModel).findOne = originalAuditFindOne;
  (AuditLogModel as unknown as MockableModel).create = originalAuditCreate;
  (PaymentOrderModel as unknown as { findOne: unknown }).findOne = originalPaymentFindOne;
  (mongoose as unknown as { startSession: unknown }).startSession = originalStartSession;
  clearAdminRoleCache();
});

describe("admin operational classification route", () => {
  const body = {
    category: "test", reason: "test_account", note: "private note",
    changes: [{ userUid: " exists ", requestId: "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA" }],
  };

  it("requires an authenticated Admin", async () => {
    installRouteModels();
    assert.equal((await request(createApp(), undefined, body)).status, 401);
    assert.equal((await request(createApp(), "user-token", body)).status, 403);
  });

  it("validates bounded allowlisted bulk input and normalizes request ids", async () => {
    installRouteModels();
    const app = createApp();
    assert.equal((await request(app, "admin-token", { ...body, reason: "internal_team" })).status, 400);
    assert.equal((await request(app, "admin-token", { ...body, changes: Array.from({ length: 101 }, () => body.changes[0]) })).status, 400);
    const successful = await request(app, "admin-token", body);
    assert.equal(successful.status, 200);
    assert.equal(((successful.json.data as Record<string, unknown>).results as Array<Record<string, unknown>>)[0].status, "updated");
  });

  it("returns conflict for request reuse and keeps audit failure fail-closed", async () => {
    const fixture = installRouteModels();
    const app = createApp();
    assert.equal((await request(app, "admin-token", body)).status, 200);
    assert.equal((await request(app, "admin-token", { ...body, category: "internal", reason: "internal_team" })).status, 409);
    assert.deepEqual(fixture.auditEntries.at(-1)?.payload, {
      category: "internal",
      reason: "internal_team",
      targetCount: 1,
      noteProvided: true,
      errorCode: "admin_classification_request_conflict",
    });
    fixture.setAuditFailure(true);
    const auditFailure = await request(app, "admin-token", {
      ...body,
      category: "internal",
      reason: "internal_team",
      changes: [{ userUid: "exists", requestId: "BBBBBBBB-BBBB-4BBB-8BBB-BBBBBBBBBBBB" }],
    });
    assert.equal(auditFailure.status, 503);
    assert.equal(fixture.users.get("exists")?.operationalClassification?.category, "test");
    assert.deepEqual(fixture.auditEntries[1]?.payload, {
      category: "internal",
      reason: "internal_team",
      targetCount: 1,
      noteProvided: true,
      errorCode: "admin_audit_unavailable",
    });
  });

  it("keeps failure audit payload to its exact safe allowlist", () => {
    const payload = getOperationalClassificationFailureAuditPayload({
      body: {
        category: "customer@example.test",
        reason: "secret payment provider error",
        note: "do not log this private note",
        changes: Array.from({ length: 101 }, (_, index) => ({ userUid: `private-${index}` })),
      },
    } as never, undefined as never, new ApiError(400, "private provider failure", undefined, "invalid_classification_target"));
    assert.deepEqual(payload, {
      category: null,
      reason: null,
      targetCount: 100,
      noteProvided: true,
      errorCode: "invalid_classification_target",
    });
    assert.equal(JSON.stringify(payload).includes("private provider failure"), false);
  });

  it("authorizes before validation and records one durable payment classification audit", async () => {
    const fixture = installRouteModels();
    const app = createApp();
    const path = "/admin/billing/payment-orders/VBTEST0001/operational-classification";
    const body = {
      category: "test",
      reason: "test_account",
      note: "do not audit this raw input",
      requestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      customerEmail: "private@example.test",
    };
    assert.equal((await request(app, undefined, { category: "bad" }, path)).status, 401);
    assert.equal((await request(app, "user-token", { category: "bad" }, path)).status, 403);
    const successful = await request(app, "admin-token", body, path);
    assert.equal(successful.status, 200);
    assert.equal(fixture.payment.status, "completed");
    assert.equal(fixture.events.size, 1);
    assert.equal(fixture.payment.operationalClassification?.category, "test");
    const conflict = await request(app, "admin-token", {
      ...body,
      category: "internal",
      reason: "internal_team",
    }, path);
    assert.equal(conflict.status, 409);
    assert.deepEqual(fixture.auditEntries.at(-1)?.payload, {
      category: "internal",
      reason: "internal_team",
      targetCount: 1,
      noteProvided: true,
      errorCode: "admin_classification_request_conflict",
    });
  });

  it("keeps direct record failure audit payload to the classification allowlist", () => {
    const payload = getOperationalClassificationFailureAuditPayload({
      body: {
        category: "test",
        reason: "test_account",
        note: "do not log this private note",
        requestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        providerPayload: { bankAccount: "private" },
      },
    } as never, undefined as never, new Error("raw provider failure with account 123"));
    assert.deepEqual(payload, {
      category: "test",
      reason: "test_account",
      targetCount: 1,
      noteProvided: true,
      errorCode: "unknown_safe",
    });
    assert.equal(JSON.stringify(payload).includes("account 123"), false);
  });
});
