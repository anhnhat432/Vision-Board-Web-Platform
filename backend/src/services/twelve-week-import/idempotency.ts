import { createHash } from "node:crypto";

import { ApiError } from "../../utils/apiError";
import type { TwelveWeekImportValidationReport } from "../twelveWeekImportValidationService";
import { isRecord, optionalString, requiredRecord } from "./validators";

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

export function hashPayload(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

export function isDuplicateKeyError(error: unknown): boolean {
  return isRecord(error) && error.code === 11000;
}

export function requireImportId(payload: unknown, report: TwelveWeekImportValidationReport): string {
  const root = requiredRecord(payload, "body");
  const importId =
    optionalString(root.importId, "importId") ?? report.idempotencyKey ?? report.requestId;

  if (!importId) {
    throw new ApiError(400, "importId or idempotencyKey is required for 12-week import.");
  }

  if (importId.length > 240) {
    throw new ApiError(400, "importId cannot exceed 240 characters.");
  }

  return importId;
}
