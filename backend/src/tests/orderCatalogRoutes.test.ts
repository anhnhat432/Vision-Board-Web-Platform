import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, it } from "node:test";
import express, { type Express } from "express";

import { createAuthMiddleware } from "../middleware/authMiddlewareCore";
import { errorMiddleware } from "../middleware/errorMiddleware";
import { clearAdminRoleCache } from "../middleware/requireAdmin";
import { AuditLogModel } from "../models/auditLogModel";
import { OrderCatalogModel } from "../models/OrderCatalogModel";
import { adminRoutes } from "../routes/adminRoutes";
import { orderCatalogRoutes } from "../routes/orderCatalogRoutes";

interface JsonResponse {
  status: number;
  headers: Record<string, string>;
  body: {
    success?: boolean;
    message?: string;
    data?: unknown;
  };
}

type CapturedFindCall = {
  filter: unknown;
  sort: unknown;
};

type ChainableQuery = {
  sort: (sortSpec: unknown) => ChainableQuery;
  lean: () => Promise<unknown[]>;
};

type MockableModel = {
  find: unknown;
  findOne: unknown;
  findOneAndUpdate: unknown;
  create: unknown;
};

const originalFind = OrderCatalogModel.find;
const originalFindOne = OrderCatalogModel.findOne;
const originalFindOneAndUpdate = OrderCatalogModel.findOneAndUpdate;
const originalCreate = OrderCatalogModel.create;
const originalAuditCreate = AuditLogModel.create;

function mockFind(items: unknown[], captured: CapturedFindCall[]): void {
  (OrderCatalogModel as unknown as MockableModel).find = (filter: unknown) => {
    const call: CapturedFindCall = { filter, sort: undefined };
    captured.push(call);

    const query: ChainableQuery = {
      sort(sortSpec: unknown) {
        call.sort = sortSpec;
        return query;
      },
      async lean() {
        return items;
      },
    };
    return query;
  };
}

function restoreFind(): void {
  (OrderCatalogModel as unknown as MockableModel).find = originalFind;
  (OrderCatalogModel as unknown as MockableModel).findOne = originalFindOne;
  (OrderCatalogModel as unknown as MockableModel).findOneAndUpdate = originalFindOneAndUpdate;
  (OrderCatalogModel as unknown as MockableModel).create = originalCreate;
  (AuditLogModel as unknown as { create: unknown }).create = originalAuditCreate;
}

function createCatalogTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use("/api/order-catalog", orderCatalogRoutes);
  return app;
}

async function requestJson(app: Express, method: string, path: string): Promise<JsonResponse> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address() as AddressInfo;
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      headers: { accept: "application/json" },
    });
    const text = await response.text();
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    return {
      status: response.status,
      headers,
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

describe("GET /api/order-catalog", () => {
  let captured: CapturedFindCall[];

  beforeEach(() => {
    captured = [];
  });

  afterEach(() => {
    restoreFind();
  });

  it("returns active catalog items with success envelope", async () => {
    const items = [
      { itemId: "frame:a", type: "frame", label: "A", priceVnd: 100, sortOrder: 1, isActive: true },
      { itemId: "frame:b", type: "frame", label: "B", priceVnd: 100, sortOrder: 2, isActive: true },
    ];
    mockFind(items, captured);

    const response = await requestJson(createCatalogTestApp(), "GET", "/api/order-catalog");

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.deepEqual(
      (response.body.data as Array<{ itemId: string }>).map((item) => item.itemId),
      ["frame:a", "frame:b"],
    );
  });

  it("filters by isActive: true and sorts by sortOrder asc", async () => {
    mockFind([], captured);

    await requestJson(createCatalogTestApp(), "GET", "/api/order-catalog");

    assert.equal(captured.length, 1);
    assert.deepEqual(captured[0].filter, { isActive: true });
    const sortSpec = captured[0].sort as Record<string, number>;
    assert.equal(sortSpec.sortOrder, 1);
  });

  it("sets Cache-Control header to public, max-age=60", async () => {
    mockFind([], captured);

    const response = await requestJson(createCatalogTestApp(), "GET", "/api/order-catalog");

    assert.match(response.headers["cache-control"] ?? "", /max-age=60/);
    assert.match(response.headers["cache-control"] ?? "", /public/);
  });
});

function createAdminCatalogTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(
    "/api",
    createAuthMiddleware({
      async verifyIdToken(token: string) {
        if (token === "admin-token") {
          return { uid: "admin_uid", email: "admin@example.com", emailVerified: true, role: "admin" };
        }
        if (token === "user-token") {
          return { uid: "user_uid", email: "user@example.com", emailVerified: true, role: "user" };
        }
        throw new Error("Invalid test token");
      },
    }),
  );
  app.use("/api", adminRoutes);
  app.use(errorMiddleware);
  return app;
}

async function requestAdminJson(
  app: Express,
  path: string,
  options: { token?: string; method?: string; body?: unknown } = {},
): Promise<JsonResponse> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address() as AddressInfo;
  const headers: Record<string, string> = { accept: "application/json" };
  if (options.token !== undefined) {
    headers.authorization = `Bearer ${options.token}`;
  }
  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
  }

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    const text = await response.text();
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    return {
      status: response.status,
      headers: responseHeaders,
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

describe("GET /api/admin/order-catalog", () => {
  let captured: CapturedFindCall[];

  beforeEach(() => {
    captured = [];
  });

  afterEach(() => {
    restoreFind();
    clearAdminRoleCache();
  });

  it("returns all items including inactive for admin", async () => {
    const items = [
      { itemId: "x:a", type: "frame", label: "A", priceVnd: 1, sortOrder: 1, isActive: true },
      { itemId: "x:b", type: "frame", label: "B", priceVnd: 1, sortOrder: 2, isActive: false },
    ];
    mockFind(items, captured);

    const response = await requestAdminJson(createAdminCatalogTestApp(), "/api/admin/order-catalog", {
      token: "admin-token",
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    const data = response.body.data as Array<{ itemId: string; isActive: boolean }>;
    assert.equal(data.length, 2);
    assert.deepEqual(
      data.map((item) => item.itemId),
      ["x:a", "x:b"],
    );
    assert.deepEqual(captured[0]?.filter, {});
  });

  it("rejects request without auth token", async () => {
    mockFind([], captured);

    const response = await requestAdminJson(createAdminCatalogTestApp(), "/api/admin/order-catalog");

    assert.ok(
      [401, 403].includes(response.status),
      `expected 401 or 403, got ${response.status}`,
    );
  });

  it("rejects non-admin user with 403", async () => {
    mockFind([], captured);

    const response = await requestAdminJson(createAdminCatalogTestApp(), "/api/admin/order-catalog", {
      token: "user-token",
    });

    assert.equal(response.status, 403);
  });
});

describe("POST /api/admin/order-catalog", () => {
  afterEach(() => {
    restoreFind();
    clearAdminRoleCache();
  });

  it("creates item, returns 201, and writes audit log", async () => {
    const auditEntries: Array<Record<string, unknown>> = [];
    const createdItems: Array<Record<string, unknown>> = [];
    (OrderCatalogModel as unknown as MockableModel).findOne = async () => null;
    (OrderCatalogModel as unknown as MockableModel).create = async (doc: Record<string, unknown>) => {
      createdItems.push(doc);
      return doc;
    };
    (AuditLogModel as unknown as { create: unknown }).create = async (entry: Record<string, unknown>) => {
      auditEntries.push(entry);
      return entry;
    };

    const response = await requestAdminJson(createAdminCatalogTestApp(), "/api/admin/order-catalog", {
      token: "admin-token",
      method: "POST",
      body: {
        itemId: "sticker:new-x",
        type: "sticker",
        label: "New X",
        priceVnd: 20000,
        maxQty: 5,
      },
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.success, true);
    assert.equal(createdItems.length, 1);
    assert.equal(createdItems[0]?.itemId, "sticker:new-x");
    assert.equal(auditEntries.length, 1);
    assert.equal(auditEntries[0]?.action, "createOrderCatalogItem");
    assert.equal(auditEntries[0]?.target, "order_catalog");
    assert.equal(auditEntries[0]?.targetId, "sticker:new-x");
    assert.equal(auditEntries[0]?.success, true);
  });

  it("rejects invalid itemId format with 400", async () => {
    (OrderCatalogModel as unknown as MockableModel).findOne = async () => null;
    (OrderCatalogModel as unknown as MockableModel).create = async () => {
      throw new Error("create should not run");
    };

    const response = await requestAdminJson(createAdminCatalogTestApp(), "/api/admin/order-catalog", {
      token: "admin-token",
      method: "POST",
      body: { itemId: "bogus", type: "frame", label: "X", priceVnd: 100 },
    });

    assert.equal(response.status, 400);
  });

  it("rejects negative priceVnd with 400", async () => {
    (OrderCatalogModel as unknown as MockableModel).findOne = async () => null;
    (OrderCatalogModel as unknown as MockableModel).create = async () => {
      throw new Error("create should not run");
    };

    const response = await requestAdminJson(createAdminCatalogTestApp(), "/api/admin/order-catalog", {
      token: "admin-token",
      method: "POST",
      body: { itemId: "frame:bad", type: "frame", label: "Bad", priceVnd: -1 },
    });

    assert.equal(response.status, 400);
  });

  it("rejects duplicate itemId with 409", async () => {
    (OrderCatalogModel as unknown as MockableModel).findOne = async () => ({
      itemId: "frame:20x30",
    });
    (OrderCatalogModel as unknown as MockableModel).create = async () => {
      throw new Error("create should not run");
    };

    const response = await requestAdminJson(createAdminCatalogTestApp(), "/api/admin/order-catalog", {
      token: "admin-token",
      method: "POST",
      body: { itemId: "frame:20x30", type: "frame", label: "Dup", priceVnd: 100 },
    });

    assert.equal(response.status, 409);
  });
});

describe("PUT /api/admin/order-catalog/:itemId", () => {
  afterEach(() => {
    restoreFind();
    clearAdminRoleCache();
  });

  it("updates allowed fields, returns 200, and writes audit log", async () => {
    const auditEntries: Array<Record<string, unknown>> = [];
    let capturedFilter: unknown;
    let capturedUpdate: unknown;
    let capturedOptions: unknown;
    (OrderCatalogModel as unknown as MockableModel).findOneAndUpdate = async (
      filter: unknown,
      update: unknown,
      options: unknown,
    ) => {
      capturedFilter = filter;
      capturedUpdate = update;
      capturedOptions = options;
      return {
        itemId: "frame:20x30",
        type: "frame",
        label: "New",
        priceVnd: 60000,
      };
    };
    (AuditLogModel as unknown as { create: unknown }).create = async (entry: Record<string, unknown>) => {
      auditEntries.push(entry);
      return entry;
    };

    const response = await requestAdminJson(
      createAdminCatalogTestApp(),
      "/api/admin/order-catalog/frame:20x30",
      {
        token: "admin-token",
        method: "PUT",
        body: { label: "New", priceVnd: 60000 },
      },
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    const data = response.body.data as Record<string, unknown>;
    assert.equal(data.label, "New");
    assert.equal(data.priceVnd, 60000);
    assert.deepEqual(capturedFilter, { itemId: "frame:20x30" });
    assert.deepEqual(capturedUpdate, { label: "New", priceVnd: 60000 });
    assert.equal((capturedOptions as Record<string, unknown>)?.new, true);
    assert.equal(auditEntries.length, 1);
    assert.equal(auditEntries[0]?.action, "updateOrderCatalogItem");
    assert.equal(auditEntries[0]?.target, "order_catalog");
    assert.equal(auditEntries[0]?.targetId, "frame:20x30");
    assert.equal(auditEntries[0]?.success, true);
  });

  it("returns 404 when itemId not found", async () => {
    (OrderCatalogModel as unknown as MockableModel).findOneAndUpdate = async () => null;

    const response = await requestAdminJson(
      createAdminCatalogTestApp(),
      "/api/admin/order-catalog/frame:nope",
      {
        token: "admin-token",
        method: "PUT",
        body: { priceVnd: 999 },
      },
    );

    assert.equal(response.status, 404);
  });

  it("rejects negative priceVnd with 400", async () => {
    (OrderCatalogModel as unknown as MockableModel).findOneAndUpdate = async () => {
      throw new Error("findOneAndUpdate should not run");
    };

    const response = await requestAdminJson(
      createAdminCatalogTestApp(),
      "/api/admin/order-catalog/frame:20x30",
      {
        token: "admin-token",
        method: "PUT",
        body: { priceVnd: -1 },
      },
    );

    assert.equal(response.status, 400);
  });

  it("ignores attempts to change itemId or type", async () => {
    let capturedUpdate: unknown;
    (OrderCatalogModel as unknown as MockableModel).findOneAndUpdate = async (
      _filter: unknown,
      update: unknown,
    ) => {
      capturedUpdate = update;
      return {
        itemId: "frame:20x30",
        type: "frame",
        label: "X",
        priceVnd: 100,
      };
    };
    (AuditLogModel as unknown as { create: unknown }).create = async () => null;

    const response = await requestAdminJson(
      createAdminCatalogTestApp(),
      "/api/admin/order-catalog/frame:20x30",
      {
        token: "admin-token",
        method: "PUT",
        body: { itemId: "frame:hacked", type: "sticker", label: "Y" },
      },
    );

    assert.equal(response.status, 200);
    const update = capturedUpdate as Record<string, unknown>;
    assert.equal("itemId" in update, false);
    assert.equal("type" in update, false);
    assert.equal(update.label, "Y");
  });
});

describe("PATCH /api/admin/order-catalog/:itemId/active", () => {
  afterEach(() => {
    restoreFind();
    clearAdminRoleCache();
  });

  it("toggles isActive=false, returns 200, and writes audit log", async () => {
    const auditEntries: Array<Record<string, unknown>> = [];
    let capturedFilter: unknown;
    let capturedUpdate: unknown;
    (OrderCatalogModel as unknown as MockableModel).findOneAndUpdate = async (
      filter: unknown,
      update: unknown,
    ) => {
      capturedFilter = filter;
      capturedUpdate = update;
      return {
        itemId: "frame:20x30",
        type: "frame",
        label: "A",
        priceVnd: 1,
        isActive: false,
      };
    };
    (AuditLogModel as unknown as { create: unknown }).create = async (entry: Record<string, unknown>) => {
      auditEntries.push(entry);
      return entry;
    };

    const response = await requestAdminJson(
      createAdminCatalogTestApp(),
      "/api/admin/order-catalog/frame:20x30/active",
      {
        token: "admin-token",
        method: "PATCH",
        body: { isActive: false },
      },
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    const data = response.body.data as Record<string, unknown>;
    assert.equal(data.isActive, false);
    assert.deepEqual(capturedFilter, { itemId: "frame:20x30" });
    assert.deepEqual(capturedUpdate, { isActive: false });
    assert.equal(auditEntries.length, 1);
    assert.equal(auditEntries[0]?.action, "toggleOrderCatalogItemActive");
    assert.equal(auditEntries[0]?.target, "order_catalog");
    assert.equal(auditEntries[0]?.targetId, "frame:20x30");
    assert.equal(auditEntries[0]?.success, true);
  });

  it("rejects non-boolean isActive with 400", async () => {
    (OrderCatalogModel as unknown as MockableModel).findOneAndUpdate = async () => {
      throw new Error("findOneAndUpdate should not run");
    };

    const response = await requestAdminJson(
      createAdminCatalogTestApp(),
      "/api/admin/order-catalog/frame:20x30/active",
      {
        token: "admin-token",
        method: "PATCH",
        body: { isActive: "yes" },
      },
    );

    assert.equal(response.status, 400);
  });

  it("returns 404 when itemId not found", async () => {
    (OrderCatalogModel as unknown as MockableModel).findOneAndUpdate = async () => null;

    const response = await requestAdminJson(
      createAdminCatalogTestApp(),
      "/api/admin/order-catalog/frame:nope/active",
      {
        token: "admin-token",
        method: "PATCH",
        body: { isActive: false },
      },
    );

    assert.equal(response.status, 404);
  });
});
