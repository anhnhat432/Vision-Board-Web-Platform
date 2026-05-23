import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, it } from "node:test";
import express, { type Express } from "express";

import { OrderCatalogModel } from "../models/OrderCatalogModel";
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
};

const originalFind = OrderCatalogModel.find;

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
