import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, it } from "node:test";
import express, { type Express } from "express";

import { createAuthMiddleware } from "../middleware/authMiddlewareCore";
import { errorMiddleware } from "../middleware/errorMiddleware";
import { OrderCatalogModel } from "../models/OrderCatalogModel";
import { OrderModel } from "../models/OrderModel";
import { orderRoutes } from "../routes/orderRoutes";

interface JsonResponse {
  status: number;
  body: Record<string, unknown>;
}

type MockableCatalog = {
  find: unknown;
  findOne: unknown;
};

type MockableOrder = {
  create: unknown;
};

const originalCatalogFind = OrderCatalogModel.find;
const originalCatalogFindOne = OrderCatalogModel.findOne;
const originalOrderCreate = OrderModel.create;

function restoreModels(): void {
  (OrderCatalogModel as unknown as MockableCatalog).find = originalCatalogFind;
  (OrderCatalogModel as unknown as MockableCatalog).findOne = originalCatalogFindOne;
  (OrderModel as unknown as MockableOrder).create = originalOrderCreate;
}

function mockCatalogFind(items: unknown[]): void {
  (OrderCatalogModel as unknown as MockableCatalog).find = () => ({
    async lean() {
      return items;
    },
  });
}

function mockCatalogFindOne(item: unknown): void {
  (OrderCatalogModel as unknown as MockableCatalog).findOne = () => ({
    async lean() {
      return item;
    },
  });
}

interface CreateOrderInput {
  userId: string;
  status: string;
  schemaVersion?: number;
  lines?: unknown[];
  subtotalVnd?: number;
  shippingVnd?: number;
  totalVnd?: number;
  keywords?: string[];
  fullName: string;
  email: string;
  phone: string;
  shippingAddress: { line1: string; line2?: string; city?: string; country?: string };
  note?: string;
  goalSnapshot?: { goalId: string; title: string; focusArea?: string };
  statusHistory?: unknown[];
}

let capturedCreate: CreateOrderInput | null = null;

function mockOrderCreate(): void {
  (OrderModel as unknown as MockableOrder).create = async (data: CreateOrderInput) => {
    capturedCreate = data;
    const id = "order_test_1";
    const docPayload = {
      _id: { toString: () => id },
      userId: data.userId,
      status: data.status ?? "pending",
      schemaVersion: data.schemaVersion ?? 2,
      lines: data.lines ?? [],
      subtotalVnd: data.subtotalVnd ?? 0,
      shippingVnd: data.shippingVnd ?? 0,
      totalVnd: data.totalVnd ?? 0,
      keywords: data.keywords ?? [],
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      shippingAddress: {
        line1: data.shippingAddress.line1,
        line2: data.shippingAddress.line2,
        city: data.shippingAddress.city ?? "",
        country: data.shippingAddress.country ?? "",
      },
      note: data.note,
      goalSnapshot: data.goalSnapshot,
      statusHistory: data.statusHistory ?? [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return {
      ...docPayload,
      toObject() {
        return docPayload;
      },
    };
  };
}

function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(
    "/api",
    createAuthMiddleware({
      async verifyIdToken() {
        return { uid: "user_test", email: "u@t.test", email_verified: true };
      },
    }),
  );
  app.use("/api", orderRoutes);
  app.use(errorMiddleware);
  return app;
}

async function postOrder(app: Express, body: unknown): Promise<JsonResponse> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });
  const address = server.address() as AddressInfo;
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/orders`, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: "Bearer ok",
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

describe("POST /api/orders v2", () => {
  beforeEach(() => {
    capturedCreate = null;
    mockOrderCreate();
  });

  afterEach(() => {
    restoreModels();
  });

  it("computes pricing server-side from catalog (ignores client priceVnd)", async () => {
    mockCatalogFind([
      {
        itemId: "frame:30x40",
        type: "frame",
        label: "Khung 30×40",
        priceVnd: 119000,
        isActive: true,
        sortOrder: 1,
      },
      {
        itemId: "theme:money",
        type: "theme",
        label: "MONEY",
        priceVnd: 18000,
        isActive: true,
        sortOrder: 2,
      },
    ]);

    const response = await postOrder(createTestApp(), {
      itemIds: ["frame:30x40", "theme:money"],
      sticker: null,
      fullName: "A",
      email: "a@b.c",
      phone: "1",
      shippingAddress: "X",
      goalId: null,
      goalTitle: "",
      keywords: [],
      note: "",
      priceVnd: 999999,
    });

    assert.equal(response.status, 201);
    const data = response.body.data as Record<string, unknown>;
    assert.equal(data.subtotalVnd, 137000);
    assert.equal(data.totalVnd, 137000);
    const lines = data.lines as unknown[];
    assert.equal(lines.length, 2);
  });

  it("rejects payload with legacy kitType field", async () => {
    const response = await postOrder(createTestApp(), {
      kitType: "vision-kit",
      fullName: "A",
      email: "a@b.c",
      phone: "1",
      shippingAddress: "X",
    });

    assert.equal(response.status, 400);
    assert.match(String(response.body.message), /phiên bản cũ/i);
  });

  it("rejects when itemIds empty", async () => {
    const response = await postOrder(createTestApp(), {
      itemIds: [],
      fullName: "A",
      email: "a@b.c",
      phone: "1",
      shippingAddress: "X",
    });

    assert.equal(response.status, 400);
  });

  it("rejects when itemId not in catalog or inactive", async () => {
    mockCatalogFind([]); // catalog returns empty for unknown itemId

    const response = await postOrder(createTestApp(), {
      itemIds: ["frame:nope"],
      fullName: "A",
      email: "a@b.c",
      phone: "1",
      shippingAddress: "X",
    });

    assert.equal(response.status, 400);
  });

  it("handles sticker with qty (clamped to maxQty)", async () => {
    mockCatalogFind([
      {
        itemId: "frame:30x40",
        type: "frame",
        label: "Khung 30×40",
        priceVnd: 119000,
        isActive: true,
        sortOrder: 1,
      },
      {
        itemId: "theme:money",
        type: "theme",
        label: "MONEY",
        priceVnd: 18000,
        isActive: true,
        sortOrder: 2,
      },
    ]);
    mockCatalogFindOne({
      itemId: "sticker:hynbee-round-v1",
      type: "sticker",
      label: "S",
      priceVnd: 15000,
      maxQty: 5,
      isActive: true,
      sortOrder: 50,
    });

    const response = await postOrder(createTestApp(), {
      itemIds: ["frame:30x40", "theme:money"],
      sticker: { itemId: "sticker:hynbee-round-v1", qty: 999 },
      fullName: "A",
      email: "a@b.c",
      phone: "1",
      shippingAddress: "X",
    });

    assert.equal(response.status, 201);
    const data = response.body.data as Record<string, unknown>;
    const lines = data.lines as Array<{ itemId: string; qty: number; lineTotalVnd: number }>;
    const stickerLine = lines.find((l) => l.itemId === "sticker:hynbee-round-v1");
    assert.ok(stickerLine, "sticker line should exist");
    assert.equal(stickerLine.qty, 5);
    assert.equal(stickerLine.lineTotalVnd, 75000);
  });
});
