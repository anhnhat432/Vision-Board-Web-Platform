import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, it } from "node:test";
import express, { type Express } from "express";

import { createAuthMiddleware } from "../middleware/authMiddlewareCore";
import { errorMiddleware } from "../middleware/errorMiddleware";
import { billingRoutes } from "../routes/billingRoutes";
import { orderRoutes } from "../routes/orderRoutes";
import { planBulkSyncRoutes } from "../routes/planBulkSyncRoutes";

interface JsonResponse {
  status: number;
  body: Record<string, unknown>;
}

function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(
    "/api",
    createAuthMiddleware({
      async verifyIdToken(token: string) {
        if (token === "unverified-token") {
          return { uid: "user_unverified", email: "buyer@example.test", email_verified: false };
        }
        if (token === "verified-token") {
          return { uid: "user_verified", email: "buyer@example.test", email_verified: true };
        }
        throw new Error("Invalid test token");
      },
    }),
  );
  app.use("/api", billingRoutes);
  app.use("/api", orderRoutes);
  app.use("/api", planBulkSyncRoutes);
  app.use(errorMiddleware);
  return app;
}

async function requestJson(app: Express, token: string, path = "/api/billing/orders", body: unknown = {
  planCode: "PLUS",
  billingCycle: "twelve_week",
  returnUrl: "https://app.example.test/billing/checkout",
  cancelUrl: "https://app.example.test/billing/plan",
}): Promise<JsonResponse> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address() as AddressInfo;
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
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

describe("auth requireEmailVerified", () => {
  const frontendOrigin = "https://app.example.test";
  let previousFrontendOrigin: string | undefined;

  beforeEach(() => {
    previousFrontendOrigin = process.env.FRONTEND_ORIGIN;
    process.env.FRONTEND_ORIGIN = frontendOrigin;
  });

  afterEach(() => {
    if (previousFrontendOrigin === undefined) {
      delete process.env.FRONTEND_ORIGIN;
    } else {
      process.env.FRONTEND_ORIGIN = previousFrontendOrigin;
    }
  });

  it("allows unverified email on billing checkout creation", async () => {
    const response = await requestJson(createTestApp(), "unverified-token");

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    const data = response.body.data as Record<string, unknown>;
    assert.equal(data.provider, "mock");
    assert.ok(typeof data.checkoutSessionId === "string");
  });

  it("returns 403 for unverified email on billing refund request", async () => {
    const response = await requestJson(
      createTestApp(),
      "unverified-token",
      "/api/billing/orders/VBABCDEFGH/refund-request",
      {
        contactEmail: "buyer@example.test",
        reason: "Need refund",
        refundAccount: "VCB - 0123456789 - Nguyen Van A",
      },
    );

    assert.equal(response.status, 403);
    assert.equal(response.body.success, false);
    assert.equal(response.body.errorCode, "EMAIL_NOT_VERIFIED");
  });

  it("returns 403 for unverified email on physical order creation", async () => {
    const response = await requestJson(createTestApp(), "unverified-token", "/api/orders", {
      kitType: "starter",
      fullName: "Buyer",
      email: "buyer@example.test",
      phone: "0900000000",
      shippingAddress: {
        line1: "1 Nguyen Trai",
        city: "Ho Chi Minh",
        country: "VN",
      },
    });

    assert.equal(response.status, 403);
    assert.equal(response.body.success, false);
    assert.equal(response.body.errorCode, "EMAIL_NOT_VERIFIED");
  });

  it("returns 403 for unverified email on plan bulk sync", async () => {
    const response = await requestJson(createTestApp(), "unverified-token", "/api/plans/507f1f77bcf86cd799439011/bulk-sync", {
      weeks: [],
      tasks: [],
    });

    assert.equal(response.status, 403);
    assert.equal(response.body.success, false);
    assert.equal(response.body.errorCode, "EMAIL_NOT_VERIFIED");
  });
});
