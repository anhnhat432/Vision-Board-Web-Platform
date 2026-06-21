import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, it } from "node:test";
import express, { type Express } from "express";

import { createAuthMiddleware } from "../middleware/authMiddlewareCore";
import { errorMiddleware } from "../middleware/errorMiddleware";
import { CouponUsageModel } from "../models/CouponUsageModel";
import { DiscountModel } from "../models/DiscountModel";
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

type MockableDiscount = {
  find: unknown;
  findOne: unknown;
};

type MockableCouponUsage = {
  findOne: unknown;
};

const originalCatalogFind = OrderCatalogModel.find;
const originalCatalogFindOne = OrderCatalogModel.findOne;
const originalOrderCreate = OrderModel.create;
const originalDiscountFind = DiscountModel.find;
const originalDiscountFindOne = DiscountModel.findOne;
const originalCouponUsageFindOne = CouponUsageModel.findOne;

function restoreModels(): void {
  (OrderCatalogModel as unknown as MockableCatalog).find = originalCatalogFind;
  (OrderCatalogModel as unknown as MockableCatalog).findOne = originalCatalogFindOne;
  (OrderModel as unknown as MockableOrder).create = originalOrderCreate;
  (DiscountModel as unknown as MockableDiscount).find = originalDiscountFind;
  (DiscountModel as unknown as MockableDiscount).findOne = originalDiscountFindOne;
  (CouponUsageModel as unknown as MockableCouponUsage).findOne = originalCouponUsageFindOne;
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
  discount?: unknown;
  statusHistory?: unknown[];
}

let capturedCreate: CreateOrderInput | null = null;


function mockNoActiveSaleEvent(): void {
  (DiscountModel as unknown as MockableDiscount).find = () => ({
    sort() {
      return {
        async lean() {
          return [];
        },
      };
    },
  });
}

function mockCoupon(discountValue: number): void {
  (DiscountModel as unknown as MockableDiscount).findOne = () => ({
    async lean() {
      return {
        _id: "discount_test_1",
        type: "coupon",
        code: "KIT20",
        name: "Kit 20%",
        discountType: "percentage",
        discountValue,
        minAmount: null,
        maxUses: null,
        usedCount: 0,
        startsAt: new Date(Date.now() - 60_000),
        endsAt: null,
        appliesTo: ["physical_order"],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    },
  });
  (CouponUsageModel as unknown as MockableCouponUsage).findOne = () => ({
    async lean() {
      return null;
    },
  });
}

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
      discount: data.discount,
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
    mockNoActiveSaleEvent();
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

  it("applies coupon to server-authoritative physical order total", async () => {
    mockNoActiveSaleEvent();
    mockCoupon(20);
    mockCatalogFind([
      {
        itemId: "frame:30x40",
        type: "frame",
        label: "Khung 30?40",
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
      couponCode: "KIT20",
    });

    assert.equal(response.status, 201);
    const data = response.body.data as Record<string, unknown>;
    assert.equal(data.subtotalVnd, 137000);
    assert.equal(data.totalVnd, 109600);
    assert.deepEqual(data.discount, {
      source: "coupon",
      discountCode: "KIT20",
      discountId: "discount_test_1",
      discountName: "Kit 20%",
      discountPercent: 20,
      discountType: "percentage",
      discountAmount: 27400,
      originalAmount: 137000,
      finalAmount: 109600,
    });
    assert.equal(capturedCreate?.totalVnd, 109600);
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
