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
import { PaymentOrderModel } from "../models/PaymentOrderModel";
import { UserModel } from "../models/UserModel";
import { adminRoutes } from "../routes/adminRoutes";

type MockableModel = {
  aggregate: unknown;
  findOne: unknown;
};

interface TestResponse {
  status: number;
  headers: Headers;
  text: string;
  json: Record<string, unknown>;
}

const originalAggregate = (PaymentOrderModel as unknown as MockableModel).aggregate;
const originalUserFindOne = (UserModel as unknown as MockableModel).findOne;

function createAdminTestApp(): Express {
  const app = express();
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

async function request(app: Express, method: string, path: string, token?: string): Promise<TestResponse> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address() as AddressInfo;
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
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
  (UserModel as unknown as MockableModel).findOne = originalUserFindOne;
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
});
