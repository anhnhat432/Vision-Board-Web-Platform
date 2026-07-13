import type { Request } from "express";
import type { FilterQuery } from "mongoose";

import { AuditLogModel, type AuditLogEntity } from "../models/auditLogModel";

const DEFAULT_AUDIT_LOG_LIMIT = 50;
const MAX_AUDIT_LOG_LIMIT = 100;
const MAX_ACTION_LENGTH = 120;
const MAX_ACTOR_UID_LENGTH = 128;
const MAX_PAYLOAD_STRING_LENGTH = 500;
const MAX_PAYLOAD_DEPTH = 4;
const MAX_PAYLOAD_ARRAY_ITEMS = 20;
const MAX_PAYLOAD_KEYS = 50;

const SENSITIVE_KEY_PATTERN = /(password|passcode|secret|token|api[_-]?key|private[_-]?key|credential|authorization|cookie|email|user[_-]?id|userid|firebase[_-]?uid|uid|phone|address|contact|account|bank|card|name|pii)/i;

export interface LogAdminActionInput {
  req: Request;
  action: string;
  target: string;
  targetId?: string | null;
  payload?: unknown;
  success: boolean;
}

export interface ListAuditLogsInput {
  actorUid?: unknown;
  action?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  limit?: unknown;
  page?: unknown;
}

function normalizeOptionalString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}

function parseLimit(value: unknown): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : NaN;
  if (!Number.isFinite(parsed)) return DEFAULT_AUDIT_LOG_LIMIT;
  return Math.min(Math.max(Math.floor(parsed), 1), MAX_AUDIT_LOG_LIMIT);
}

function parsePage(value: unknown): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : NaN;
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(Math.floor(parsed), 1);
}

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== "string" && !(value instanceof Date)) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

function sanitizePayloadValue(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return value.slice(0, MAX_PAYLOAD_STRING_LENGTH);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (depth >= MAX_PAYLOAD_DEPTH) return "[truncated]";

  if (Array.isArray(value)) {
    return value.slice(0, MAX_PAYLOAD_ARRAY_ITEMS).map((item) => sanitizePayloadValue(item, depth + 1));
  }

  if (typeof value !== "object") return undefined;

  const sanitized: Record<string, unknown> = {};
  for (const [key, childValue] of Object.entries(value as Record<string, unknown>).slice(0, MAX_PAYLOAD_KEYS)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) continue;
    const sanitizedValue = sanitizePayloadValue(childValue, depth + 1);
    if (sanitizedValue !== undefined) sanitized[key] = sanitizedValue;
  }

  return sanitized;
}

export function sanitizeAuditPayload(payload: unknown): Record<string, unknown> | null {
  const sanitized = sanitizePayloadValue(payload);
  if (!sanitized || typeof sanitized !== "object" || Array.isArray(sanitized)) return null;
  return sanitized as Record<string, unknown>;
}

export async function logAdminAction(input: LogAdminActionInput): Promise<void> {
  const actor = input.req.user;

  try {
    await AuditLogModel.create({
      actorUid: actor?.uid ?? "unknown",
      actorEmail: actor?.email ?? null,
      action: input.action,
      target: input.target,
      targetId: input.targetId ?? null,
      payload: sanitizeAuditPayload(input.payload),
      ip: input.req.ip ?? null,
      userAgent: input.req.get("user-agent") ?? null,
      timestamp: new Date(),
      success: input.success,
    } satisfies AuditLogEntity);
  } catch (error) {
    console.error("[audit] Failed to write admin audit log", {
      action: input.action,
      target: input.target,
      targetId: input.targetId ?? null,
      success: input.success,
      error: error instanceof Error ? error.message : "unknown_error",
    });
  }
}

export async function listAuditLogs(input: ListAuditLogsInput) {
  const limit = parseLimit(input.limit);
  const page = parsePage(input.page);
  const filter: FilterQuery<AuditLogEntity> = {};
  const actorUid = normalizeOptionalString(input.actorUid, MAX_ACTOR_UID_LENGTH);
  const action = normalizeOptionalString(input.action, MAX_ACTION_LENGTH);
  const startDate = parseDate(input.startDate);
  const endDate = parseDate(input.endDate);

  if (actorUid) filter.actorUid = actorUid;
  if (action) filter.action = action;
  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = startDate;
    if (endDate) filter.timestamp.$lte = endDate;
  }

  const skip = (page - 1) * limit;
  const [total, items] = await Promise.all([
    AuditLogModel.countDocuments(filter),
    AuditLogModel.find(filter)
      .select("-commandFingerprint -commandFingerprintVersion")
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean<AuditLogEntity[]>(),
  ]);

  return {
    page,
    limit,
    total,
    items,
  };
}
