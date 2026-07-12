import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { afterEach, describe, it } from "node:test";
import express, { type Express } from "express";

process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/admin-sales-report-routes-test";
process.env.FIREBASE_PROJECT_ID ??= "admin-sales-report-routes-test";
process.env.FIREBASE_CLIENT_EMAIL ??= "firebase-admin@example.test";
process.env.FIREBASE_PRIVATE_KEY ??= "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----\\n";
process.env.FRONTEND_ORIGIN ??= "http://localhost:5173";

import { createAuthMiddleware } from "../middleware/authMiddlewareCore";
import { errorMiddleware } from "../middleware/errorMiddleware";
import { clearAdminRoleCache } from "../middleware/requireAdmin";
import { AuditLogModel } from "../models/auditLogModel";
import { PaymentOrderModel } from "../models/PaymentOrderModel";
import { RefundRequestModel } from "../models/refundRequestModel";
import { UserModel } from "../models/UserModel";
import { adminRoutes } from "../routes/adminRoutes";

type MockableModel = {
  aggregate: unknown;
  findOne: unknown;
  findOneAndUpdate: unknown;
  create: unknown;
};

interface TestResponse {
  status: number;
  headers: Headers;
  text: string;
  json: Record<string, unknown>;
}

const originalAggregate = (PaymentOrderModel as unknown as MockableModel).aggregate;
const originalPaymentOrderFindOne = (PaymentOrderModel as unknown as MockableModel).findOne;
const originalPaymentOrderFindOneAndUpdate = (PaymentOrderModel as unknown as MockableModel).findOneAndUpdate;
const originalRefundFindOne = (RefundRequestModel as unknown as MockableModel).findOne;
const originalUserFindOne = (UserModel as unknown as MockableModel).findOne;
const originalAuditCreate = (AuditLogModel as unknown as MockableModel).create;

function createAdminTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(
    "/api",
    createAuthMiddleware({
      async verifyIdToken(token: string) {
        if (token === "admin-token") {
          return { uid: "admin_uid", email: "admin@example.com", emailVerified: true };
        }
        if (token === "non-admin-token") {
          return { uid: "non_admin_uid", email: "viewer@example.com", emailVerified: true };
        }
        throw new Error("Invalid test token");
      },
    }),
  );
  app.use("/api", adminRoutes);
  app.use(errorMiddleware);
  return app;
}

function mockUserRoles(): void {
  (UserModel as unknown as MockableModel).findOne = (query: unknown) => {
    const firebaseUid = (query as { firebaseUid?: unknown }).firebaseUid;
    const role = firebaseUid === "admin_uid" ? "admin" : "user";
    const chain = {
      select() {
        return chain;
      },
      maxTimeMS() {
        return chain;
      },
      async lean() {
        return { role };
      },
    };
    return chain;
  };
}

function mockEmptyReport(): void {
  (PaymentOrderModel as unknown as MockableModel).aggregate = async () => [{
    summary: [],
    tabCounts: [],
    dailyBuckets: [],
    rowCount: [],
    rows: [],
  }];
}

async function request(
  app: Express,
  method: string,
  path: string,
  token?: string,
  body?: unknown,
): Promise<TestResponse> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address() as AddressInfo;
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return {
      status: response.status,
      headers: response.headers,
      text,
      json: text && response.headers.get("content-type")?.includes("application/json") ? JSON.parse(text) : {},
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

afterEach(() => {
  (PaymentOrderModel as unknown as MockableModel).aggregate = originalAggregate;
  (PaymentOrderModel as unknown as MockableModel).findOne = originalPaymentOrderFindOne;
  (PaymentOrderModel as unknown as MockableModel).findOneAndUpdate = originalPaymentOrderFindOneAndUpdate;
  (RefundRequestModel as unknown as MockableModel).findOne = originalRefundFindOne;
  (UserModel as unknown as MockableModel).findOne = originalUserFindOne;
  (AuditLogModel as unknown as MockableModel).create = originalAuditCreate;
  clearAdminRoleCache();
});

describe("admin sales report routes", () => {
  it("protects report and export endpoints and returns a complete empty report", async () => {
    mockEmptyReport();
    mockUserRoles();
    const app = createAdminTestApp();

    const unauthenticated = await request(app, "GET", "/api/admin/reports/sales");
    assert.equal(unauthenticated.status, 401);

    const unauthenticatedExport = await request(app, "GET", "/api/admin/reports/sales/export");
    assert.equal(unauthenticatedExport.status, 401);
    assert.equal(unauthenticatedExport.headers.get("content-disposition"), null);

    const forbidden = await request(app, "GET", "/api/admin/reports/sales", "non-admin-token");
    assert.equal(forbidden.status, 403);

    const forbiddenExport = await request(app, "GET", "/api/admin/reports/sales/export", "non-admin-token");
    assert.equal(forbiddenExport.status, 403);
    assert.equal(forbiddenExport.headers.get("content-disposition"), null);

    const allowed = await request(app, "GET", "/api/admin/reports/sales", "admin-token");
    assert.equal(allowed.status, 200);
    assert.equal(((allowed.json.data as Record<string, unknown>).summary as Record<string, unknown>).netRevenueVnd, 0);
    assert.deepEqual((allowed.json.data as Record<string, unknown>).items, []);
    assert.equal(allowed.headers.get("cache-control"), "no-store");

    const exported = await request(app, "GET", "/api/admin/reports/sales/export", "admin-token");
    assert.equal(exported.status, 200);
    assert.match(exported.headers.get("content-type") ?? "", /text\/csv/);
    assert.match(exported.headers.get("content-disposition") ?? "", /sales-report-/);
    assert.equal(exported.headers.get("cache-control"), "no-store");
    assert.match(exported.text, /"Order ID"/);
  });

  it("rejects invalid export queries without download headers", async () => {
    mockEmptyReport();
    mockUserRoles();
    const app = createAdminTestApp();

    for (const [query, value] of [
      ["from", "not-a-date"],
      ["to", "2026-02-30"],
      ["provider", "mock"],
      ["kpiStatus", "unknown"],
    ]) {
      const path = `/api/admin/reports/sales/export?${query}=${value}`;
      const response = await request(app, "GET", path, "admin-token");
      assert.equal(response.status, 400, path);
      assert.equal(response.headers.get("content-disposition"), null, path);
      assert.equal(response.headers.get("content-type")?.includes("text/csv"), false, path);
    }
  });

  it("reviews a qualifying order through the protected route and rejects invalid review input without an update", async () => {
    mockUserRoles();
    (AuditLogModel as unknown as MockableModel).create = async () => null;
    const original = {
      _id: "order_doc_1",
      orderId: "VBREVIEW01",
      userId: "customer_uid",
      status: "completed",
      purpose: "plus_subscription",
      currency: "VND",
      provider: "payos",
      amount: 99000,
      completedAt: new Date("2026-07-10T03:00:00.000Z"),
      reporting: undefined,
      updatedAt: new Date("2026-07-10T03:06:00.000Z"),
    };
    const createLeanResult = <T,>(value: T) => {
      const chain = {
        select() {
          return chain;
        },
        sort() {
          return chain;
        },
        async lean() {
          return value;
        },
      };
      return chain;
    };
    let updates = 0;
    (PaymentOrderModel as unknown as MockableModel).findOne = () => createLeanResult(original);
    (PaymentOrderModel as unknown as MockableModel).findOneAndUpdate = () => {
      updates += 1;
      return createLeanResult({
        ...original,
        reporting: { kpiStatus: "excluded", exclusionReason: "test", reviewedAt: new Date("2026-07-11T02:00:00.000Z") },
      });
    };
    (RefundRequestModel as unknown as MockableModel).findOne = () => createLeanResult(null);
    const app = createAdminTestApp();

    const successful = await request(app, "PATCH", "/api/admin/reports/sales/VBREVIEW01/review", "admin-token", {
      kpiStatus: "excluded",
      exclusionReason: "test",
      reviewNote: "raw private review note",
    });
    assert.equal(successful.status, 200);
    const item = (successful.json.data as Record<string, unknown>).item as Record<string, unknown>;
    assert.equal((item.reporting as Record<string, unknown>).kpiStatus, "excluded");
    assert.equal(JSON.stringify(item).includes("raw private review note"), false);
    assert.equal(updates, 1);

    const invalid = await request(app, "PATCH", "/api/admin/reports/sales/VBREVIEW01/review", "admin-token", {
      kpiStatus: "pending",
    });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.json.errorCode, "invalid_sales_review_status");
    assert.equal(updates, 1);
  });
});
