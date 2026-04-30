import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, it } from "node:test";
import express, { type Express } from "express";

import { createAuthMiddleware } from "../middleware/authMiddlewareCore";
import { errorMiddleware } from "../middleware/errorMiddleware";
import { syncRoutes } from "../routes/syncRoutes";
import {
  SyncMutationService,
  syncMutationService,
  type SyncMutationBatchResult,
} from "../services/syncMutationService";
import type {
  CreateSyncMutationLogData,
  SyncMutationLogEntity,
} from "../repositories/mongo/MongoSyncMutationLogRepository";
import { otherUserId, ownerUserId } from "./testHelpers";

interface JsonResponse {
  status: number;
  body: {
    success?: boolean;
    message?: string;
    data?: unknown;
    details?: unknown;
  };
}

type Restorer = () => void;

function replaceMethod<T extends object, K extends keyof T>(target: T, key: K, value: T[K]): Restorer {
  const original = target[key];
  target[key] = value;
  return () => {
    target[key] = original;
  };
}

function createSyncMutationLogRepository() {
  const logs = new Map<string, SyncMutationLogEntity>();

  function getKey(userId: string, mutationId: string): string {
    return `${userId}:${mutationId}`;
  }

  return {
    async findByUserAndMutationId(userId: string, mutationId: string): Promise<SyncMutationLogEntity | null> {
      return logs.get(getKey(userId, mutationId)) ?? null;
    },
    async createMutationLog(data: CreateSyncMutationLogData): Promise<SyncMutationLogEntity> {
      const key = getKey(data.userId, data.mutationId);
      if (logs.has(key)) {
        throw Object.assign(new Error("Duplicate mutation log."), { code: 11000 });
      }

      const timestamp = new Date("2026-04-30T00:00:00.000Z");
      const log: SyncMutationLogEntity = {
        id: `sync_log_${logs.size + 1}`,
        ...data,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      logs.set(key, log);
      return log;
    },
  };
}

function installServiceMocks(): Restorer {
  const routedService = new SyncMutationService(createSyncMutationLogRepository());
  return replaceMethod(
    syncMutationService,
    "submitMutationBatch",
    routedService.submitMutationBatch.bind(routedService),
  );
}

function createRouteTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(
    "/api",
    createAuthMiddleware({
      async verifyIdToken(token: string) {
        if (token === "owner-token") return { uid: ownerUserId, email: "owner@example.com" };
        if (token === "other-token") return { uid: otherUserId, email: "other@example.com" };
        throw new Error("Invalid test token");
      },
    }),
  );
  app.use("/api", syncRoutes);
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

function createValidMutation(mutationId = "dmq_test_1") {
  return {
    batchId: "batch_test_1",
    clientGeneratedAt: "2026-04-30T00:00:00.000Z",
    mutations: [
      {
        mutationId,
        type: "task_completed_changed",
        clientTimestamp: "2026-04-30T00:00:01.000Z",
        payload: {
          clientTaskId: "task_local_1",
          completed: true,
        },
      },
    ],
  };
}

function getBatchResult(response: JsonResponse): SyncMutationBatchResult {
  assert.equal(response.body.success, true);
  assert.ok(response.body.data);
  return response.body.data as SyncMutationBatchResult;
}

let restoreServices: Restorer | null = null;

beforeEach(() => {
  restoreServices = installServiceMocks();
});

afterEach(() => {
  restoreServices?.();
  restoreServices = null;
});

describe("12-week sync mutation route", () => {
  it("returns 401 when no auth token is provided", async () => {
    const response = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/mutations", {
      token: null,
      body: createValidMutation(),
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
    assert.match(response.body.message ?? "", /Unauthorized/i);
  });

  it("returns 400 for invalid mutation batch payloads", async () => {
    const response = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/mutations", {
      body: {
        mutations: [
          {
            mutationId: "dmq_bad_1",
            type: "unsupported_mutation",
            payload: {},
          },
        ],
      },
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.match(response.body.message ?? "", /supported sync mutation types/i);
  });

  it("accepts and logs a valid mutation without applying domain sync", async () => {
    const response = await requestJson(createRouteTestApp(), "POST", "/api/sync/12-week/mutations", {
      body: createValidMutation("dmq_valid_1"),
    });
    const data = getBatchResult(response);

    assert.equal(response.status, 200);
    assert.equal(data.status, "accepted");
    assert.equal(data.accepted.length, 1);
    assert.equal(data.accepted[0].mutationId, "dmq_valid_1");
    assert.equal(data.accepted[0].status, "accepted");
    assert.equal(data.duplicate.length, 0);
    assert.equal(data.failed.length, 0);
    assert.deepEqual(data.summary, { accepted: 1, duplicate: 0, failed: 0 });
  });

  it("returns duplicate for a repeated mutation from the same user", async () => {
    const app = createRouteTestApp();

    const first = await requestJson(app, "POST", "/api/sync/12-week/mutations", {
      body: createValidMutation("dmq_duplicate_1"),
    });
    const second = await requestJson(app, "POST", "/api/sync/12-week/mutations", {
      body: createValidMutation("dmq_duplicate_1"),
    });
    const firstData = getBatchResult(first);
    const secondData = getBatchResult(second);

    assert.equal(firstData.accepted.length, 1);
    assert.equal(second.status, 200);
    assert.equal(secondData.status, "duplicate");
    assert.equal(secondData.accepted.length, 0);
    assert.equal(secondData.duplicate.length, 1);
    assert.equal(secondData.duplicate[0].mutationId, "dmq_duplicate_1");
  });

  it("scopes mutation idempotency by authenticated user", async () => {
    const app = createRouteTestApp();

    const ownerResponse = await requestJson(app, "POST", "/api/sync/12-week/mutations", {
      body: createValidMutation("dmq_cross_user_1"),
      token: "owner-token",
    });
    const otherResponse = await requestJson(app, "POST", "/api/sync/12-week/mutations", {
      body: createValidMutation("dmq_cross_user_1"),
      token: "other-token",
    });
    const ownerData = getBatchResult(ownerResponse);
    const otherData = getBatchResult(otherResponse);

    assert.equal(ownerData.accepted.length, 1);
    assert.equal(otherData.accepted.length, 1);
    assert.equal(otherData.duplicate.length, 0);
  });
});
