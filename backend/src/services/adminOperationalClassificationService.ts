import {
  isOperationalClassificationReasonAllowed,
  type AdminOperationalClassificationSummary,
  type OperationalCategory,
  type OperationalClassification,
  type OperationalClassificationReason,
} from "../models/OperationalClassification";
import { ApiError } from "../utils/apiError";

const OPERATIONAL_REASONS: readonly OperationalClassificationReason[] = [
  "confirmed_real",
  "test_account",
  "internal_team",
  "automated_qa",
  "other",
];

export function validateOperationalClassificationInput(input: {
  category: unknown;
  reason: unknown;
  note?: unknown;
}): { category: OperationalCategory; reason: OperationalClassificationReason; note?: string } {
  if (input.category !== "real" && input.category !== "test" && input.category !== "internal") {
    throw new ApiError(400, "Classification category is invalid.", undefined, "invalid_operational_category");
  }
  if (typeof input.reason !== "string" || !OPERATIONAL_REASONS.includes(input.reason as OperationalClassificationReason)) {
    throw new ApiError(400, "Classification reason is invalid.", undefined, "invalid_operational_reason");
  }
  if (input.note != null && typeof input.note !== "string") {
    throw new ApiError(400, "Classification note must be a string.", undefined, "invalid_operational_note");
  }

  const category = input.category;
  const reason = input.reason as OperationalClassificationReason;
  const note = typeof input.note === "string" ? input.note.trim() || undefined : undefined;

  if (!isOperationalClassificationReasonAllowed(category, reason)) {
    throw new ApiError(
      400,
      "Classification reason does not match category.",
      undefined,
      "classification_reason_mismatch",
    );
  }
  if (reason === "other" && !note) {
    throw new ApiError(400, "Classification note is required.", undefined, "classification_note_required");
  }
  if (note && note.length > 200) {
    throw new ApiError(400, "Classification note is too long.", undefined, "classification_note_too_long");
  }

  return { category, reason, note };
}

export function resolveEffectiveOperationalClassification(input: {
  userClassification?: OperationalClassification | null;
  recordClassification?: OperationalClassification | null;
  legacySalesReason?: "test" | "internal_team" | null;
}): AdminOperationalClassificationSummary {
  const user = input.userClassification;
  if (user && user.category !== "real") return serializeClassification(user, "user");

  const record = input.recordClassification;
  if (record) return serializeClassification(record, "record");

  if (input.legacySalesReason === "test") {
    return { effectiveCategory: "test", source: "legacy_sales_review", reason: "legacy_sales_test" };
  }
  if (input.legacySalesReason === "internal_team") {
    return { effectiveCategory: "internal", source: "legacy_sales_review", reason: "legacy_sales_internal" };
  }
  if (user) return serializeClassification(user, "user");

  return { effectiveCategory: "real", source: "default" };
}

function serializeClassification(
  classification: OperationalClassification,
  source: "user" | "record",
): AdminOperationalClassificationSummary {
  return {
    effectiveCategory: classification.category,
    source,
    reason: classification.reason,
    note: classification.note,
    classifiedAt: classification.classifiedAt.toISOString(),
  };
}
