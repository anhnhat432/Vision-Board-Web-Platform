import { createHash } from "node:crypto";

import {
  MongoSyncMutationLogRepository,
  type CreateSyncMutationLogData,
  type SyncMutationLogEntity,
} from "../repositories/mongo/MongoSyncMutationLogRepository";
import { ApiError } from "../utils/apiError";

export const SYNC_MUTATION_TYPES = [
  "task_completed_changed",
  "daily_check_in_upserted",
  "weekly_review_upserted",
  "plan_snapshot_updated",
  "task_upsert",
  "daily_checkin_upsert",
  "weekly_review_upsert",
  "plan_snapshot_upsert",
] as const;

export type SyncMutationType = (typeof SYNC_MUTATION_TYPES)[number];

export interface SyncMutationResult {
  mutationId: string;
  type: SyncMutationType;
  status: "accepted" | "duplicate" | "failed";
  acceptedAt?: string;
  duplicateOf?: string;
  message?: string;
}

export interface SyncMutationBatchResult {
  batchId?: string;
  status: "accepted" | "partial" | "duplicate";
  accepted: SyncMutationResult[];
  duplicate: SyncMutationResult[];
  failed: SyncMutationResult[];
  summary: {
    accepted: number;
    duplicate: number;
    failed: number;
  };
}

interface ValidatedMutation {
  mutationId: string;
  idempotencyKey?: string;
  type: SyncMutationType;
  clientTimestamp?: Date;
  payload: Record<string, unknown>;
  payloadHash: string;
}

interface ValidatedBatch {
  batchId?: string;
  mutations: ValidatedMutation[];
}

interface SyncMutationLogRepository {
  findByUserAndMutationId(userId: string, mutationId: string): Promise<SyncMutationLogEntity | null>;
  createMutationLog(data: CreateSyncMutationLogData): Promise<SyncMutationLogEntity>;
}

const MAX_MUTATIONS_PER_BATCH = 100;
const ALLOWED_MUTATION_TYPES = new Set<string>(SYNC_MUTATION_TYPES);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateOptionalString(value: unknown, fieldPath: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new ApiError(400, `${fieldPath} must be a string.`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new ApiError(400, `${fieldPath} cannot be empty.`);
  }

  return trimmed;
}

function validateRequiredString(value: unknown, fieldPath: string): string {
  const validated = validateOptionalString(value, fieldPath);
  if (!validated) {
    throw new ApiError(400, `${fieldPath} is required.`);
  }

  return validated;
}

function validateOptionalDate(value: unknown, fieldPath: string): Date | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(400, `${fieldPath} must be a valid ISO timestamp.`);
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.valueOf())) {
    throw new ApiError(400, `${fieldPath} must be a valid ISO timestamp.`);
  }

  return parsed;
}

function validateMutationType(value: unknown, fieldPath: string): SyncMutationType {
  const type = validateRequiredString(value, fieldPath);
  if (!ALLOWED_MUTATION_TYPES.has(type)) {
    throw new ApiError(400, `${fieldPath} must be one of the supported sync mutation types.`, {
      allowedTypes: SYNC_MUTATION_TYPES,
    });
  }

  return type as SyncMutationType;
}

function stableStringify(value: unknown): string {
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

function hashMutationPayload(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function validateMutation(value: unknown, index: number): ValidatedMutation {
  const path = `mutations[${index}]`;
  if (!isRecord(value)) {
    throw new ApiError(400, `${path} must be an object.`);
  }

  const type = validateMutationType(value.type ?? value.kind, `${path}.type`);
  if (!isRecord(value.payload)) {
    throw new ApiError(400, `${path}.payload must be an object.`);
  }

  const clientTimestamp = validateOptionalDate(
    value.clientTimestamp ?? value.clientGeneratedAt,
    `${path}.clientTimestamp`,
  );
  const idempotencyKey = validateOptionalString(value.idempotencyKey, `${path}.idempotencyKey`);
  const payloadHash = hashMutationPayload({
    type,
    entity: value.entity,
    baseRevision: value.baseRevision,
    clientTimestamp: clientTimestamp?.toISOString(),
    payload: value.payload,
  });

  return {
    mutationId: validateRequiredString(value.mutationId, `${path}.mutationId`),
    idempotencyKey,
    type,
    clientTimestamp,
    payload: value.payload,
    payloadHash,
  };
}

function validateBatch(payload: unknown): ValidatedBatch {
  if (!isRecord(payload)) {
    throw new ApiError(400, "Request body must be an object.");
  }

  validateOptionalDate(payload.clientGeneratedAt, "clientGeneratedAt");
  const batchId = validateOptionalString(payload.batchId, "batchId");

  if (!Array.isArray(payload.mutations)) {
    throw new ApiError(400, "mutations must be an array.");
  }
  if (payload.mutations.length === 0) {
    throw new ApiError(400, "mutations must contain at least one item.");
  }
  if (payload.mutations.length > MAX_MUTATIONS_PER_BATCH) {
    throw new ApiError(400, `mutations cannot contain more than ${MAX_MUTATIONS_PER_BATCH} items.`);
  }

  return {
    batchId,
    mutations: payload.mutations.map((mutation, index) => validateMutation(mutation, index)),
  };
}

function toDuplicateResult(log: SyncMutationLogEntity): SyncMutationResult {
  return {
    mutationId: log.mutationId,
    type: log.type as SyncMutationType,
    status: "duplicate",
    duplicateOf: log.id,
    acceptedAt: log.createdAt.toISOString(),
    message: "Mutation was already accepted for this user.",
  };
}

function isDuplicateKeyError(error: unknown): boolean {
  return isRecord(error) && error.code === 11000;
}

export class SyncMutationService {
  constructor(private readonly mutationLogRepository: SyncMutationLogRepository) {}

  async submitMutationBatch(userId: string, payload: unknown): Promise<SyncMutationBatchResult> {
    const batch = validateBatch(payload);
    const accepted: SyncMutationResult[] = [];
    const duplicate: SyncMutationResult[] = [];
    const failed: SyncMutationResult[] = [];

    for (const mutation of batch.mutations) {
      const existing = await this.mutationLogRepository.findByUserAndMutationId(userId, mutation.mutationId);
      if (existing) {
        duplicate.push(toDuplicateResult(existing));
        continue;
      }

      const acceptedAt = new Date();
      const result: SyncMutationResult = {
        mutationId: mutation.mutationId,
        type: mutation.type,
        status: "accepted",
        acceptedAt: acceptedAt.toISOString(),
        message: "Mutation accepted for future 12-week sync processing.",
      };

      try {
        const createdLog = await this.mutationLogRepository.createMutationLog({
          userId,
          mutationId: mutation.mutationId,
          idempotencyKey: mutation.idempotencyKey,
          type: mutation.type,
          payloadHash: mutation.payloadHash,
          status: "accepted",
          clientTimestamp: mutation.clientTimestamp,
          result,
        });

        accepted.push({
          ...result,
          acceptedAt: createdLog.createdAt.toISOString(),
        });
      } catch (error) {
        if (!isDuplicateKeyError(error)) {
          throw error;
        }

        const duplicateLog = await this.mutationLogRepository.findByUserAndMutationId(userId, mutation.mutationId);
        if (duplicateLog) {
          duplicate.push(toDuplicateResult(duplicateLog));
          continue;
        }

        failed.push({
          mutationId: mutation.mutationId,
          type: mutation.type,
          status: "failed",
          message: "Mutation could not be logged idempotently.",
        });
      }
    }

    const status =
      failed.length > 0 ? "partial" : accepted.length > 0 ? "accepted" : "duplicate";

    return {
      batchId: batch.batchId,
      status,
      accepted,
      duplicate,
      failed,
      summary: {
        accepted: accepted.length,
        duplicate: duplicate.length,
        failed: failed.length,
      },
    };
  }
}

export const syncMutationService = new SyncMutationService(new MongoSyncMutationLogRepository());
