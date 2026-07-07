import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, it } from "node:test";
import express, { type Express } from "express";

import { createAuthMiddleware } from "../middleware/authMiddlewareCore";
import { errorMiddleware } from "../middleware/errorMiddleware";
import { planBulkSyncRoutes } from "../routes/planBulkSyncRoutes";
import * as planBulkSyncService from "../services/planBulkSyncService";
import type { BulkSyncRequest, BulkSyncResponse } from "../types/bulkSync";
import { ids, ownerUserId } from "./testHelpers";

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

const validPlanId = ids.plan;
const validWeekId = ids.week;

const validBulkSyncPayload: BulkSyncRequest = {
  tasks: [
    {
      taskId: "client-task-1",
      weekId: validWeekId,
      title: "Keep the weekly cadence",
      status: "done",
    },
  ],
};

let serviceCalls: Array<{
  userId: string;
  planId: string;
  request: BulkSyncRequest;
}>;
let restoreBulkSyncService: Restorer | null = null;
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

function createBulkSyncResponse(): BulkSyncResponse {
  return {
    weeks: [],
    tasks: [
      {
        clientTaskId: "client-task-1",
        taskId: ids.task,
        weekId: validWeekId,
        ok: true,
        revision: 4,
      },
    ],
    metricLogs: [],
    reviews: [],
    errors: [],
    syncedCount: 1,
    conflictCount: 0,
    failedCount: 0,
  };
}

function installBulkSyncServiceMock(): Restorer {
  return replaceMethod(
    planBulkSyncService,
    "bulkSyncPlanSnapshot",
    (async (userId: string, planId: string, request: BulkSyncRequest) => {
      serviceCalls.push({ userId, planId, request });
      return createBulkSyncResponse();
    }) as typeof planBulkSyncService.bulkSyncPlanSnapshot,
  );
}

function createPlanBulkSyncTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(
    "/api",
    createAuthMiddleware({
      async verifyIdToken(token: string) {
        if (token === "owner-token") {
          return {
            uid: ownerUserId,
            email: "owner@example.test",
            email_verified: true,
          };
        }
        if (token === "unverified-token") {
          return {
            uid: "user_unverified",
            email: "owner@example.test",
            email_verified: false,
          };
        }
        throw new Error("Invalid test token");
      },
    }),
  );
  app.use("/api", planBulkSyncRoutes);
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

function assertErrorResponse(response: JsonResponse, status: number, messagePattern: RegExp): void {
  assert.equal(response.status, status);
  assert.equal(response.body.success, false);
  assert.match(response.body.message ?? "", messagePattern);
}

beforeEach(() => {
  serviceCalls = [];
  restoreBulkSyncService = installBulkSyncServiceMock();
  originalConsoleWarn = console.warn;
  console.warn = () => {};
});

afterEach(() => {
  console.warn = originalConsoleWarn;
  restoreBulkSyncService?.();
  restoreBulkSyncService = null;
});

describe("POST /api/plans/:planId/bulk-sync", () => {
  it("requires Firebase auth before accepting a bulk sync payload", async () => {
    const response = await requestJson(
      createPlanBulkSyncTestApp(),
      "POST",
      `/api/plans/${validPlanId}/bulk-sync`,
      { body: validBulkSyncPayload, token: null },
    );

    assertErrorResponse(response, 401, /Unauthorized/i);
    assert.equal(serviceCalls.length, 0);
  });

  it("requires a verified email before syncing plan data", async () => {
    const response = await requestJson(
      createPlanBulkSyncTestApp(),
      "POST",
      `/api/plans/${validPlanId}/bulk-sync`,
      { body: validBulkSyncPayload, token: "unverified-token" },
    );

    assertErrorResponse(response, 403, /Email/i);
    assert.equal(response.body.errorCode, "EMAIL_NOT_VERIFIED");
    assert.equal(serviceCalls.length, 0);
  });

  it("rejects invalid plan ids before calling the sync service", async () => {
    const response = await requestJson(
      createPlanBulkSyncTestApp(),
      "POST",
      "/api/plans/not-an-object-id/bulk-sync",
      { body: validBulkSyncPayload },
    );

    assertErrorResponse(response, 400, /ObjectId/i);
    assert.equal(response.body.errorCode, "invalid_object_id");
    assert.equal(serviceCalls.length, 0);
  });

  it("rejects invalid bulk sync payloads before calling the sync service", async () => {
    const response = await requestJson(
      createPlanBulkSyncTestApp(),
      "POST",
      `/api/plans/${validPlanId}/bulk-sync`,
      { body: { tasks: [{ weekId: validWeekId, title: "Nope", status: "done-ish" }] } },
    );

    assertErrorResponse(response, 400, /status must be one of/i);
    assert.equal(response.body.errorCode, "invalid_bulk_sync_payload");
    assert.equal(serviceCalls.length, 0);
  });

  it("passes the authenticated user, plan id, and validated payload to the sync service", async () => {
    const response = await requestJson(
      createPlanBulkSyncTestApp(),
      "POST",
      `/api/plans/${validPlanId}/bulk-sync`,
      { body: validBulkSyncPayload },
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data?.syncedCount, 1);
    assert.equal(response.body.data?.failedCount, 0);
    assert.equal(serviceCalls.length, 1);
    assert.deepEqual(serviceCalls[0], {
      userId: ownerUserId,
      planId: validPlanId,
      request: {
        weeks: [],
        tasks: validBulkSyncPayload.tasks,
        metricLogs: [],
        reviews: [],
      },
    });
  });
});
