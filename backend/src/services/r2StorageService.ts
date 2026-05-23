import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { env } from "../config/env";

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
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_BASE_URL) {
    throw new Error(
      "R2 storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET and R2_PUBLIC_BASE_URL.",
    );
  }
  const endpoint = R2_ENDPOINT && R2_ENDPOINT.length > 0
    ? R2_ENDPOINT
    : `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  return {
    accountId: R2_ACCOUNT_ID,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    bucket: R2_BUCKET,
    publicBaseUrl: R2_PUBLIC_BASE_URL.replace(/\/+$/, ""),
    endpoint,
  };
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
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          CacheControl: cacheControl,
        }),
      );
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
