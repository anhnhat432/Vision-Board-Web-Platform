import { createHash } from "node:crypto";

import type {
  HandlerResult,
  SyncMutationBatchResult,
  SyncMutationResult,
  SyncMutationType,
  ValidatedMutation,
} from "./types";
import { hashPayload, SYNC_MUTATION_TYPES } from "./types";
import type { MutationHandlerStrategy, HandlerApplyContext } from "./MutationHandlerStrategy";
import type { SyncTaskMutationRepository } from "./repositories/SyncTaskMutationRepository";
import type { SyncWorkspaceMutationRepository } from "./repositories/SyncWorkspaceMutationRepository";
import type { SyncMutationLogStatus } from "../../models/SyncMutationLogModel";
import { ApiError } from "../../utils/apiError";

// ─── Constants (from syncMutationService.ts) ──────────────────

const MAX_MUTATION_ID_LENGTH = 240;
const MAX_CLIENT_ID_LENGTH = 120;
const MAX_IDEMPOTENCY_KEY_LENGTH = 240;
const MAX_BATCH_ID_LENGTH = 240;
const MAX_MUTATIONS_PER_BATCH = 100;

const ALLOWED_MUTATION_TYPES = new Set<string>(SYNC_MUTATION_TYPES);

// ─── SyncMutationLogAdapter ────────────────────────────────────

export interface SyncMutationLogAdapter {
  findByUserAndMutationId(
    userId: string,
    mutationId: string,
  ): Promise<{ mutationId: string; payloadHash: string; status: SyncMutationLogStatus } | null>;
  createMutationLog(data: {
    userId: string;
    mutationId: string;
    type: string;
    payloadHash: string;
    status: SyncMutationLogStatus;
    result?: unknown;
  }): Promise<unknown>;
}

// ─── ValidatedBatch type ───────────────────────────────────────

interface ValidatedBatch {
  batchId?: string;
  mutations: ValidatedMutation[];
}

// ─── Type guards ───────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ─── Validation helpers ────────────────────────────────────────

function validateRequiredString(value: unknown, fieldPath: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(400, `${fieldPath} must be a non-empty string.`);
  }
  return value.trim();
}

function validateStringLength(value: string, fieldPath: string, maxLength: number): void {
  if (value.length > maxLength) {
    throw new ApiError(400, `${fieldPath} cannot exceed ${maxLength} characters.`);
  }
}

function validateOptionalString(value: unknown, fieldPath: string, maxLength = 5_000): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new ApiError(400, `${fieldPath} must be a string.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new ApiError(400, `${fieldPath} cannot exceed ${maxLength} characters.`);
  }
  return trimmed;
}

function validateOptionalNumber(value: unknown, fieldPath: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ApiError(400, `${fieldPath} must be a number.`);
  }
  return value;
}

function validateOptionalDate(value: unknown, fieldPath: string): Date | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new ApiError(400, `${fieldPath} must be an ISO date string.`);
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.valueOf())) {
    throw new ApiError(400, `${fieldPath} must be a valid ISO date.`);
  }
  return parsed;
}

function validateOptionalBoolean(value: unknown, fieldPath: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw new ApiError(400, `${fieldPath} must be a boolean.`);
  }
  return value;
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

// ─── Mutation validation ───────────────────────────────────────

function validateMutation(value: unknown, index: number): ValidatedMutation {
  const path = `mutations[${index}]`;
  if (!isRecord(value)) {
    throw new ApiError(400, `${path} must be an object.`);
  }

  const type = validateMutationType(value.type ?? value.kind, `${path}.type`);
  if (!isRecord(value.payload)) {
    throw new ApiError(400, `${path}.payload must be an object.`);
  }
  if (value.entity !== undefined && !isRecord(value.entity)) {
    throw new ApiError(400, `${path}.entity must be an object.`);
  }

  const clientTimestamp = validateOptionalDate(
    value.clientTimestamp ?? value.clientGeneratedAt,
    `${path}.clientTimestamp`,
  );
  const idempotencyKey = validateOptionalString(value.idempotencyKey, `${path}.idempotencyKey`);
  if (idempotencyKey) validateStringLength(idempotencyKey, `${path}.idempotencyKey`, MAX_IDEMPOTENCY_KEY_LENGTH);
  const baseRevision = validateOptionalNumber(value.baseRevision, `${path}.baseRevision`);
  const payloadHash = hashMutationPayload({
    type,
    entity: value.entity,
    baseRevision,
    clientTimestamp: clientTimestamp?.toISOString(),
    payload: value.payload,
  });

  const mutationId = validateRequiredString(value.mutationId, `${path}.mutationId`);
  validateStringLength(mutationId, `${path}.mutationId`, MAX_MUTATION_ID_LENGTH);

  // Enforce client ID length limits on entity references
  if (isRecord(value.entity)) {
    for (const [key, val] of Object.entries(value.entity)) {
      if (typeof val === "string" && val.length > MAX_CLIENT_ID_LENGTH) {
        throw new ApiError(400, `${path}.entity.${key} cannot exceed ${MAX_CLIENT_ID_LENGTH} characters.`);
      }
    }
  }

  return {
    mutationId,
    idempotencyKey,
    type,
    clientTimestamp,
    entity: value.entity,
    baseRevision,
    payload: value.payload,
    payloadHash,
  };
}

// ─── Batch validation ──────────────────────────────────────────

function validateBatch(payload: unknown): ValidatedBatch {
  if (!isRecord(payload)) {
    throw new ApiError(400, "Request body must be an object.");
  }

  const batchId = validateOptionalString(payload.batchId, "batchId");
  if (batchId) validateStringLength(batchId, "batchId", MAX_BATCH_ID_LENGTH);

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

// ─── Orchestrator ──────────────────────────────────────────────

/**
 * Orchestrator Pattern cho sync mutations.
 *
 * Trách nhiệm:
 * - Validate raw payload từ client
 * - Quản lý registry Handler theo SyncMutationType
 * - Kiểm tra idempotency qua mutationLogRepo
 * - Dispatch mutation đến handler phù hợp
 * - Ghi log mutation sau khi xử lý
 * - Gom kết quả batch thành SyncMutationBatchResult
 */
export class SyncMutationOrchestrator {
  private readonly registry = new Map<SyncMutationType, MutationHandlerStrategy>();

  constructor(
    private readonly mutationLogRepo: SyncMutationLogAdapter,
    private readonly taskRepo: SyncTaskMutationRepository,
    private readonly workspaceRepo: SyncWorkspaceMutationRepository,
  ) {}

  /** Đăng ký một handler cho 1 mutation type */
  register(handler: MutationHandlerStrategy): void {
    if (this.registry.has(handler.mutationType)) {
      throw new Error(`Duplicate handler registration for mutation type: ${handler.mutationType}`);
    }
    this.registry.set(handler.mutationType, handler);
  }

  /** Đăng ký nhiều handlers cùng lúc */
  registerAll(handlers: MutationHandlerStrategy[]): void {
    for (const handler of handlers) {
      this.register(handler);
    }
  }

  /** Lấy danh sách mutation types đã đăng ký */
  getRegisteredTypes(): SyncMutationType[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Process raw payload từ client.
   *
   * Flow:
   * 1. validateBatch(rawPayload) → ValidatedMutation[]
   * 2. Với mỗi mutation: idempotency check → dispatch handler → log
   * 3. Gom kết quả → SyncMutationBatchResult
   *
   * @param rawPayload - req.body từ Express (chưa parse)
   * @returns SyncMutationBatchResult
   */
  async executeBatch(userId: string, rawPayload: unknown): Promise<SyncMutationBatchResult> {
    const batch = validateBatch(rawPayload);

    const results: SyncMutationResult[] = [];
    const accepted: SyncMutationResult[] = [];
    const duplicate: SyncMutationResult[] = [];
    const failed: SyncMutationResult[] = [];
    let appliedCount = 0;
    let skippedCount = 0;

    for (const mutation of batch.mutations) {
      const result = await this.applySingle(userId, mutation);

      results.push(result);

      if (result.status === "applied") {
        appliedCount += 1;
        accepted.push(result);
      } else if (result.status === "duplicate") {
        skippedCount += 1;
        duplicate.push(result);
      } else if (result.status === "accepted") {
        accepted.push(result);
      } else {
        failed.push(result);
      }
    }

    const totalReceived = batch.mutations.length;
    const failedCount = failed.length;

    let status: SyncMutationBatchResult["status"];
    if (appliedCount === totalReceived) {
      status = "applied";
    } else if (failedCount === totalReceived) {
      status = "failed";
    } else if (skippedCount === totalReceived && appliedCount === 0) {
      status = "duplicate";
    } else {
      status = "partial";
    }

    return {
      batchId: batch.batchId,
      status,
      totalReceived,
      appliedCount,
      skippedCount,
      failedCount,
      results,
      accepted,
      duplicate,
      failed,
      summary: {
        accepted: accepted.length,
        duplicate: duplicate.length,
        failed: failedCount,
        applied: appliedCount,
        skipped: skippedCount,
        totalReceived,
      },
    };
  }

  /**
   * @deprecated Use executeBatch() instead. Kept for test compatibility.
   */
  async submitMutationBatch(userId: string, rawPayload: unknown): Promise<SyncMutationBatchResult> {
    return this.executeBatch(userId, rawPayload);
  }

  /**
   * Process validated mutations array.
   *
   * @param mutations - Already validated mutations (from validateBatch)
   */
  async executeValidatedBatch(userId: string, mutations: ValidatedMutation[]): Promise<SyncMutationBatchResult> {
    const results: SyncMutationResult[] = [];
    const accepted: SyncMutationResult[] = [];
    const duplicate: SyncMutationResult[] = [];
    const failed: SyncMutationResult[] = [];
    let appliedCount = 0;
    let skippedCount = 0;

    for (const mutation of mutations) {
      const result = await this.applySingle(userId, mutation);

      results.push(result);

      if (result.status === "applied") {
        appliedCount += 1;
        accepted.push(result);
      } else if (result.status === "duplicate") {
        skippedCount += 1;
        duplicate.push(result);
      } else if (result.status === "accepted") {
        accepted.push(result);
      } else {
        failed.push(result);
      }
    }

    const totalReceived = mutations.length;
    const failedCount = failed.length;

    let status: SyncMutationBatchResult["status"];
    if (appliedCount === totalReceived) {
      status = "applied";
    } else if (failedCount === totalReceived) {
      status = "failed";
    } else if (skippedCount === totalReceived && appliedCount === 0) {
      status = "duplicate";
    } else {
      status = "partial";
    }

    return {
      status,
      totalReceived,
      appliedCount,
      skippedCount,
      failedCount,
      results,
      accepted,
      duplicate,
      failed,
      summary: {
        accepted: accepted.length,
        duplicate: duplicate.length,
        failed: failedCount,
        applied: appliedCount,
        skipped: skippedCount,
        totalReceived,
      },
    };
  }

  /**
   * Xử lý 1 mutation đơn lẻ.
   *
   * Flow:
   * 1. Kiểm tra idempotency (duplicate / conflict)
   * 2. Tìm handler phù hợp
   * 3. Gọi handler.apply()
   * 4. Ghi mutation log
   */
  async applySingle(userId: string, mutation: ValidatedMutation): Promise<SyncMutationResult> {
    // ─── 1. Idempotency check ────────────────────────────────
    const existing = await this.mutationLogRepo.findByUserAndMutationId(userId, mutation.mutationId);

    if (existing) {
      if (existing.payloadHash !== mutation.payloadHash) {
        return {
          mutationId: mutation.mutationId,
          type: mutation.type,
          status: "conflict",
          reason: "The same mutationId was already used with a different payload for this user.",
          syncErrorCode: "idempotency_conflict",
        };
      }

      return {
        mutationId: existing.mutationId,
        type: mutation.type,
        status: "duplicate",
        duplicateOf: existing.mutationId,
        message: "Duplicate mutation already processed.",
      };
    }

    // ─── 2. Find handler ─────────────────────────────────────
    const handler = this.registry.get(mutation.type);
    if (!handler) {
      const result: SyncMutationResult = {
        mutationId: mutation.mutationId,
        type: mutation.type,
        status: "failed",
        reason: `Unsupported mutation type: ${mutation.type}`,
        syncErrorCode: "unsupported_mutation",
      };

      await this.logMutation(userId, mutation, "failed", result.status);
      return result;
    }

    // ─── 3. Execute handler ──────────────────────────────────
    const processedAt = new Date();
    const context: HandlerApplyContext = {
      userId,
      mutation,
      processedAt,
      taskRepo: this.taskRepo,
      workspaceRepo: this.workspaceRepo,
    };

    let handlerResult: HandlerResult;
    try {
      handlerResult = await handler.apply(context);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown handler error";

      const failedResult: SyncMutationResult = {
        mutationId: mutation.mutationId,
        type: mutation.type,
        status: "failed",
        reason: `Handler error: ${message}`,
      };

      await this.logMutation(userId, mutation, "failed", failedResult.status, processedAt);
      return failedResult;
    }

    // ─── 4. Map handler result ───────────────────────────────
    const finalResult: SyncMutationResult = handlerResult ?? {
      mutationId: mutation.mutationId,
      type: mutation.type,
      status: "failed_not_found",
      reason: "Handler did not apply the mutation.",
    };

    // ─── 5. Log mutation ─────────────────────────────────────
    const logStatus = finalResult.status === "applied" ? "applied" : "failed";
    await this.logMutation(userId, mutation, logStatus, finalResult.status, processedAt);

    return finalResult;
  }

  // ─── Private helpers ─────────────────────────────────────────

  private async logMutation(
    userId: string,
    mutation: ValidatedMutation,
    status: SyncMutationLogStatus,
    resultStatus: SyncMutationResult["status"],
    processedAt = new Date(),
  ): Promise<void> {
    await this.mutationLogRepo.createMutationLog({
      userId,
      mutationId: mutation.mutationId,
      type: mutation.type,
      payloadHash: mutation.payloadHash,
      status,
      result: resultStatus,
    });
  }
}
