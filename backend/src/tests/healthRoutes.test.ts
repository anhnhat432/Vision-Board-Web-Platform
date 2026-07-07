import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { afterEach, describe, it } from "node:test";
import express, { type Express } from "express";
import mongoose from "mongoose";

import { healthRoutes } from "../routes/healthRoutes";

interface JsonResponse {
  status: number;
  headers: Headers;
  body: Record<string, unknown>;
}

let originalReadyState: number | undefined;

function createHealthTestApp(): Express {
  const app = express();
  app.use("/api", healthRoutes);
  return app;
}

function setMongooseReadyState(value: number): void {
  originalReadyState = mongoose.connection.readyState;
  Object.defineProperty(mongoose.connection, "readyState", {
    configurable: true,
    value,
  });
}

function restoreMongooseReadyState(): void {
  if (originalReadyState === undefined) return;
  Object.defineProperty(mongoose.connection, "readyState", {
    configurable: true,
    value: originalReadyState,
  });
  originalReadyState = undefined;
}

async function requestJson(app: Express, path: string): Promise<JsonResponse> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address() as AddressInfo;
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      headers: { accept: "application/json" },
    });
    const text = await response.text();
    return {
      status: response.status,
      headers: response.headers,
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

afterEach(() => {
  restoreMongooseReadyState();
});

describe("health routes", () => {
  it("returns a stable backend health payload for platform health checks", async () => {
    const response = await requestJson(createHealthTestApp(), "/api/health");

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    const data = response.body.data as Record<string, unknown>;
    assert.equal(data.status, "ok");
    assert.equal(data.service, "vision-board-backend");
    assert.equal(typeof data.timestamp, "string");
    assert.ok(!Number.isNaN(Date.parse(data.timestamp as string)));
  });

  it("marks billing health as unavailable when the database is degraded", async () => {
    setMongooseReadyState(0);

    const response = await requestJson(createHealthTestApp(), "/api/health/billing");

    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "no-store, max-age=0");
    assert.equal(response.body.db, "degraded");
    assert.equal(response.body.reconciliation, "stale");
  });

  it("returns billing health without cache when the database is connected", async () => {
    setMongooseReadyState(1);

    const response = await requestJson(createHealthTestApp(), "/api/health/billing");

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store, max-age=0");
    assert.equal(response.body.db, "ok");
    assert.match(String(response.body.casso), /^(ok|degraded)$/);
    assert.match(String(response.body.reconciliation), /^(ok|stale)$/);
  });
});
