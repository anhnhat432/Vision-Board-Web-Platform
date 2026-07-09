import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { afterEach, describe, it, mock } from "node:test";
import express, { type Express } from "express";

import { errorMiddleware } from "../middleware/errorMiddleware";
import * as backendMonitoring from "../monitoring/sentry";
import { ApiError } from "../utils/apiError";

interface JsonResponse {
  status: number;
  body: {
    success?: boolean;
    message?: string;
    details?: unknown;
    errorCode?: string;
  };
}

async function requestJson(app: Express, path: string): Promise<JsonResponse> {
  const server = app.listen(0);
  try {
    const { port } = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}${path}`);
    return {
      status: response.status,
      body: (await response.json()) as JsonResponse["body"],
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

function createErrorTestApp(error: ApiError): Express {
  const app = express();
  app.get("/leaky", (_req, _res, next) => next(error));
  app.use(errorMiddleware);
  return app;
}

describe("errorMiddleware", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    mock.restoreAll();
  });

  it("does not expose internal 5xx ApiError messages or details in production", async () => {
    process.env.NODE_ENV = "production";

    const response = await requestJson(
      createErrorTestApp(
        new ApiError(
          503,
          "PAYOS_CLIENT_ID missing for provider live_secret_internal",
          { env: "PAYOS_CLIENT_ID", secret: "live_secret_internal" },
          "provider_not_configured",
        ),
      ),
      "/leaky",
    );

    assert.equal(response.status, 503);
    assert.equal(response.body.success, false);
    assert.equal(response.body.errorCode, "provider_not_configured");
    assert.equal(response.body.message, "Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại sau.");
    assert.equal(response.body.details, undefined);
    assert.doesNotMatch(JSON.stringify(response.body), /PAYOS_CLIENT_ID|live_secret_internal/);
  });

  it("captures production 5xx ApiErrors with safe monitoring metadata", async () => {
    process.env.NODE_ENV = "production";
    const captureMock = mock.method(backendMonitoring, "captureBackendException", () => undefined);

    const response = await requestJson(
      createErrorTestApp(
        new ApiError(
          503,
          "PAYOS_API_KEY raw provider detail",
          { secret: "provider_secret_value" },
          "provider_not_configured",
        ),
      ),
      "/leaky",
    );

    assert.equal(response.status, 503);
    assert.equal(captureMock.mock.callCount(), 1);
    const [capturedError, context] = captureMock.mock.calls[0].arguments;
    assert.equal(capturedError instanceof Error, true);
    assert.equal((capturedError as Error).message, "ApiError 503 provider_not_configured");
    assert.deepEqual(context, {
      tags: {
        event: "api_error",
        errorCode: "provider_not_configured",
      },
      extra: {
        method: "GET",
        path: "/leaky",
        statusCode: 503,
        errorCode: "provider_not_configured",
      },
    });
    assert.doesNotMatch(JSON.stringify(context), /PAYOS_API_KEY|provider_secret_value/);
  });

  it("keeps 4xx validation details intact for existing client contracts", async () => {
    process.env.NODE_ENV = "production";

    const response = await requestJson(
      createErrorTestApp(
        new ApiError(
          400,
          "receiptEmail must be a valid email address.",
          { field: "receiptEmail" },
          "invalid_receipt_email",
        ),
      ),
      "/leaky",
    );

    assert.equal(response.status, 400);
    assert.equal(response.body.message, "receiptEmail must be a valid email address.");
    assert.deepEqual(response.body.details, { field: "receiptEmail" });
    assert.equal(response.body.errorCode, "invalid_receipt_email");
  });
});
