import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, it } from "node:test";
import express, { type Express } from "express";

import { createAuthMiddleware } from "../middleware/authMiddlewareCore";
import { errorMiddleware } from "../middleware/errorMiddleware";
import { clearAdminRoleCache } from "../middleware/requireAdmin";
import { AuditLogModel } from "../models/auditLogModel";
import { OrderCatalogModel } from "../models/OrderCatalogModel";
import { UserModel } from "../models/UserModel";
import { adminRoutes } from "../routes/adminRoutes";
import {
  setImageStorageAdapterForTesting,
  type ImageStorageAdapter,
  type PutObjectInput,
} from "../services/r2StorageService";

interface JsonResponse {
  status: number;
  headers: Record<string, string>;
  body: {
    success?: boolean;
    message?: string;
    data?: unknown;
  };
}

type MockableModel = {
  findOne: unknown;
  findOneAndUpdate: unknown;
};

const originalFindOne = OrderCatalogModel.findOne;
const originalFindOneAndUpdate = OrderCatalogModel.findOneAndUpdate;
const originalAuditCreate = AuditLogModel.create;

// Mock UserModel.findOne so requireAdmin does not buffer when MongoDB is unavailable.
const originalUserFindOne = UserModel.findOne;
function createUserModelMock() {
  const query = {
    select() { return query; },
    maxTimeMS() { return query; },
    async lean() { return null; },
  };
  return query;
}
(UserModel as unknown as { findOne: unknown }).findOne = createUserModelMock;

function restoreModels(): void {
  (OrderCatalogModel as unknown as MockableModel).findOne = originalFindOne;
  (OrderCatalogModel as unknown as MockableModel).findOneAndUpdate = originalFindOneAndUpdate;
  (AuditLogModel as unknown as { create: unknown }).create = originalAuditCreate;
  // Re-apply UserModel mock (same pattern as AuditLogModel above)
  (UserModel as unknown as { findOne: unknown }).findOne = createUserModelMock;
}

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

function buildMultipartBody(parts: Array<{
  name: string;
  filename?: string;
  contentType?: string;
  data: Buffer | string;
}>, boundary: string): Buffer {
  const chunks: Buffer[] = [];
  for (const part of parts) {
    chunks.push(Buffer.from(`--${boundary}\r\n`, "utf-8"));
    let header = `Content-Disposition: form-data; name="${part.name}"`;
    if (part.filename !== undefined) {
      header += `; filename="${part.filename}"`;
    }
    header += "\r\n";
    if (part.contentType) {
      header += `Content-Type: ${part.contentType}\r\n`;
    }
    header += "\r\n";
    chunks.push(Buffer.from(header, "utf-8"));
    chunks.push(typeof part.data === "string" ? Buffer.from(part.data, "utf-8") : part.data);
    chunks.push(Buffer.from("\r\n", "utf-8"));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`, "utf-8"));
  return Buffer.concat(chunks);
}

interface UploadOptions {
  token?: string;
  filename?: string;
  contentType?: string;
  data?: Buffer;
  includeFile?: boolean;
}

async function requestUpload(
  app: Express,
  path: string,
  options: UploadOptions = {},
): Promise<JsonResponse> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });
  const address = server.address() as AddressInfo;
  const boundary = `----TestBoundary${Math.random().toString(16).slice(2)}`;
  const headers: Record<string, string> = {
    accept: "application/json",
    "content-type": `multipart/form-data; boundary=${boundary}`,
  };
  if (options.token !== undefined) {
    headers.authorization = `Bearer ${options.token}`;
  }

  const includeFile = options.includeFile ?? true;
  const body = includeFile
    ? buildMultipartBody(
        [
          {
            name: "thumbnail",
            filename: options.filename ?? "img.png",
            contentType: options.contentType ?? "image/png",
            data: options.data ?? Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
          },
        ],
        boundary,
      )
    : buildMultipartBody(
        [{ name: "other", data: "no file here" }],
        boundary,
      );

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method: "POST",
      headers,
      body: new Uint8Array(body),
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

interface PutCall extends PutObjectInput {}

function installStorageMock(): { calls: PutCall[]; publicBaseUrl: string } {
  const calls: PutCall[] = [];
  const publicBaseUrl = "https://cdn.example.com";
  const adapter: ImageStorageAdapter = {
    async putObject(input) {
      calls.push(input);
    },
    publicUrl(key) {
      return `${publicBaseUrl}/${key}`;
    },
  };
  setImageStorageAdapterForTesting(adapter);
  return { calls, publicBaseUrl };
}

describe("POST /api/admin/order-catalog/:itemId/thumbnail", () => {
  beforeEach(() => {
    (AuditLogModel as unknown as { create: unknown }).create = async (entry: unknown) => entry;
  });

  afterEach(() => {
    restoreModels();
    clearAdminRoleCache();
    setImageStorageAdapterForTesting(null);
  });

  it("rejects request without uploaded file with 400", async () => {
    (OrderCatalogModel as unknown as MockableModel).findOne = async () => {
      throw new Error("findOne should not run");
    };
    (OrderCatalogModel as unknown as MockableModel).findOneAndUpdate = async () => {
      throw new Error("findOneAndUpdate should not run");
    };
    installStorageMock();

    const response = await requestUpload(
      createAdminCatalogTestApp(),
      "/api/admin/order-catalog/frame:20x30/thumbnail",
      { token: "admin-token", includeFile: false },
    );

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
  });

  it("rejects invalid MIME with 400", async () => {
    (OrderCatalogModel as unknown as MockableModel).findOne = async () => {
      throw new Error("findOne should not run");
    };
    (OrderCatalogModel as unknown as MockableModel).findOneAndUpdate = async () => {
      throw new Error("findOneAndUpdate should not run");
    };
    installStorageMock();

    const response = await requestUpload(
      createAdminCatalogTestApp(),
      "/api/admin/order-catalog/frame:20x30/thumbnail",
      {
        token: "admin-token",
        contentType: "application/pdf",
        filename: "doc.pdf",
        data: Buffer.from("%PDF-1.4 fake"),
      },
    );

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
  });

  it("returns 404 for unknown itemId", async () => {
    (OrderCatalogModel as unknown as MockableModel).findOne = async () => null;
    (OrderCatalogModel as unknown as MockableModel).findOneAndUpdate = async () => null;
    const { calls } = installStorageMock();

    const response = await requestUpload(
      createAdminCatalogTestApp(),
      "/api/admin/order-catalog/frame:nope/thumbnail",
      { token: "admin-token" },
    );

    assert.equal(response.status, 404);
    assert.equal(calls.length, 0, "storage.putObject should not be called when item missing");
  });

  it("uploads file, saves public URL, and returns updated item", async () => {
    const auditEntries: Array<Record<string, unknown>> = [];
    let capturedFilter: unknown;
    let capturedUpdate: unknown;

    (OrderCatalogModel as unknown as MockableModel).findOne = async () => ({
      itemId: "frame:20x30",
      type: "frame",
      label: "20x30",
      priceVnd: 100,
    });
    (OrderCatalogModel as unknown as MockableModel).findOneAndUpdate = async (
      filter: unknown,
      update: unknown,
    ) => {
      capturedFilter = filter;
      capturedUpdate = update;
      return {
        itemId: "frame:20x30",
        type: "frame",
        label: "20x30",
        priceVnd: 100,
        thumbnail: (update as Record<string, unknown>).thumbnail,
      };
    };
    (AuditLogModel as unknown as { create: unknown }).create = async (entry: Record<string, unknown>) => {
      auditEntries.push(entry);
      return entry;
    };
    const { calls, publicBaseUrl } = installStorageMock();

    const response = await requestUpload(
      createAdminCatalogTestApp(),
      "/api/admin/order-catalog/frame:20x30/thumbnail",
      {
        token: "admin-token",
        contentType: "image/webp",
        filename: "thumb.webp",
        data: Buffer.from("RIFFwebpdata"),
      },
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    const data = response.body.data as Record<string, unknown>;
    const expectedKey = "order-catalog/frame-20x30.webp";
    const expectedUrlPrefix = `${publicBaseUrl}/${expectedKey}?v=`;
    assert.equal(typeof data.thumbnail, "string");
    assert.ok((data.thumbnail as string).startsWith(expectedUrlPrefix));
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.key, expectedKey);
    assert.equal(calls[0]?.contentType, "image/webp");
    assert.deepEqual(capturedFilter, { itemId: "frame:20x30" });
    assert.equal(typeof (capturedUpdate as Record<string, unknown>).thumbnail, "string");
    assert.ok(((capturedUpdate as Record<string, unknown>).thumbnail as string).startsWith(expectedUrlPrefix));
    assert.equal(auditEntries.length, 1);
    assert.equal(auditEntries[0]?.action, "uploadOrderCatalogItemThumbnail");
    assert.equal(auditEntries[0]?.target, "order_catalog");
    assert.equal(auditEntries[0]?.targetId, "frame:20x30");
    assert.equal(auditEntries[0]?.success, true);
  });

  it("rejects unauthorized user with 401/403", async () => {
    installStorageMock();

    const response = await requestUpload(
      createAdminCatalogTestApp(),
      "/api/admin/order-catalog/frame:20x30/thumbnail",
      { token: "user-token" },
    );

    assert.ok(
      [401, 403].includes(response.status),
      `expected 401 or 403, got ${response.status}`,
    );
  });
});
