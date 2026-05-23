import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { env } from "../config/env";
import { ApiError } from "../utils/apiError";

export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
}

export interface ImageStorageAdapter {
  putObject(input: PutObjectInput): Promise<void>;
  publicUrl(key: string): string;
}

let cachedAdapter: ImageStorageAdapter | null = null;
let testAdapterOverride: ImageStorageAdapter | null = null;

function ensureR2Configured(): {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
  endpoint: string;
} {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL, R2_ENDPOINT } = env;
  const missing = [
    ["R2_ACCOUNT_ID", R2_ACCOUNT_ID],
    ["R2_ACCESS_KEY_ID", R2_ACCESS_KEY_ID],
    ["R2_SECRET_ACCESS_KEY", R2_SECRET_ACCESS_KEY],
    ["R2_BUCKET", R2_BUCKET],
    ["R2_PUBLIC_BASE_URL", R2_PUBLIC_BASE_URL],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new ApiError(
      503,
      `R2 storage is not configured. Missing: ${missing.join(", ")}.`,
      { missing },
      "storage_not_configured",
    );
  }
  const endpoint = R2_ENDPOINT && R2_ENDPOINT.length > 0
    ? R2_ENDPOINT
    : `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  return {
    accountId: R2_ACCOUNT_ID as string,
    accessKeyId: R2_ACCESS_KEY_ID as string,
    secretAccessKey: R2_SECRET_ACCESS_KEY as string,
    bucket: R2_BUCKET as string,
    publicBaseUrl: (R2_PUBLIC_BASE_URL as string).replace(/\/+$/, ""),
    endpoint,
  };
}

function getProviderErrorSummary(error: unknown): { code: string; statusCode?: number } {
  if (!error || typeof error !== "object") return { code: "unknown" };

  const record = error as {
    name?: unknown;
    Code?: unknown;
    code?: unknown;
    $metadata?: { httpStatusCode?: unknown };
  };
  const code =
    (typeof record.Code === "string" && record.Code) ||
    (typeof record.code === "string" && record.code) ||
    (typeof record.name === "string" && record.name) ||
    "unknown";
  const statusCode =
    typeof record.$metadata?.httpStatusCode === "number" ? record.$metadata.httpStatusCode : undefined;

  return { code, statusCode };
}

function createR2Adapter(): ImageStorageAdapter {
  const config = ensureR2Configured();
  const client = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return {
    async putObject({ key, body, contentType, cacheControl }) {
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: config.bucket,
            Key: key,
            Body: body,
            ContentType: contentType,
            CacheControl: cacheControl,
          }),
        );
      } catch (error) {
        const summary = getProviderErrorSummary(error);
        throw new ApiError(
          502,
          `R2 upload failed (${summary.code}). Check R2 endpoint, bucket name, and access key permissions.`,
          summary,
          "storage_upload_failed",
        );
      }
    },
    publicUrl(key: string) {
      return `${config.publicBaseUrl}/${key}`;
    },
  };
}

export function getImageStorageAdapter(): ImageStorageAdapter {
  if (testAdapterOverride) return testAdapterOverride;
  if (!cachedAdapter) cachedAdapter = createR2Adapter();
  return cachedAdapter;
}

export function setImageStorageAdapterForTesting(adapter: ImageStorageAdapter | null): void {
  testAdapterOverride = adapter;
}
