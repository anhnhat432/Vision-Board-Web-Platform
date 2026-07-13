import type { FilterQuery, PipelineStage } from "mongoose";

import {
  type AdminOperationalClassificationSummary,
  type OperationalCategory,
  type OperationalClassificationSource,
} from "../models/OperationalClassification";
import { UserModel, type UserDocument } from "../models/UserModel";
import { ApiError } from "../utils/apiError";

export type OperationalScope = "real" | "excluded" | "all";

export function parseOperationalCategoryQuery(value: unknown): OperationalCategory | "all" {
  if (value == null || value === "") return "real";
  if (value === "real" || value === "test" || value === "internal" || value === "all") return value;
  throw new ApiError(400, "Operational category is invalid.", undefined, "invalid_operational_category");
}

export function parseOperationalScopeQuery(value: unknown): OperationalScope {
  if (value == null || value === "") return "real";
  if (value === "real" || value === "excluded" || value === "all") return value;
  throw new ApiError(400, "Operational scope is invalid.", undefined, "invalid_operational_scope");
}

export function buildUserOperationalCategoryFilter(category: OperationalCategory | "all"): FilterQuery<UserDocument> {
  if (category === "all") return {};
  if (category === "real") {
    return {
      $or: [
        { operationalClassification: { $exists: false } },
        { operationalClassification: null },
        { "operationalClassification.category": "real" },
      ],
    };
  }
  return { "operationalClassification.category": category };
}

function buildEffectiveClassificationProjection(options: {
  recordClassificationField?: string;
  legacySalesReasonField?: string;
}): Record<string, unknown> {
  const userClassification = "$__operationalUser.operationalClassification";
  const userCategory = { $ifNull: ["$__operationalUser.operationalClassification.category", "real"] };
  const hasUserClassification = { $ne: [{ $ifNull: [userClassification, null] }, null] };
  const userExcluded = { $in: [userCategory, ["test", "internal"]] };
  const record = options.recordClassificationField ? `$${options.recordClassificationField}` : null;
  const recordCategory = options.recordClassificationField ? `$${options.recordClassificationField}.category` : null;
  const recordReason = options.recordClassificationField ? `$${options.recordClassificationField}.reason` : null;
  const recordNote = options.recordClassificationField ? `$${options.recordClassificationField}.note` : null;
  const recordClassifiedAt = options.recordClassificationField ? `$${options.recordClassificationField}.classifiedAt` : null;
  const hasRecord = record ? { $ne: [{ $ifNull: [record, null] }, null] } : false;
  const legacyReason = options.legacySalesReasonField ? `$${options.legacySalesReasonField}` : null;
  const hasLegacyTest = legacyReason ? { $eq: [legacyReason, "test"] } : false;
  const hasLegacyInternal = legacyReason ? { $eq: [legacyReason, "internal_team"] } : false;

  return {
    __effectiveOperationalCategory: {
      $cond: [userExcluded, userCategory, {
        $cond: [hasRecord, { $ifNull: [recordCategory, "real"] }, {
          $cond: [hasLegacyTest, "test", { $cond: [hasLegacyInternal, "internal", "real"] }],
        }],
      }],
    },
    __effectiveOperationalSource: {
      $cond: [userExcluded, "user", {
        $cond: [hasRecord, "record", {
          $cond: [
            { $or: [hasLegacyTest, hasLegacyInternal] },
            "legacy_sales_review",
            { $cond: [hasUserClassification, "user", "default"] },
          ],
        }],
      }],
    },
    __effectiveOperationalReason: {
      $cond: [userExcluded, "$__operationalUser.operationalClassification.reason", {
        $cond: [hasRecord, recordReason, {
          $cond: [
            hasLegacyTest,
            "legacy_sales_test",
            { $cond: [hasLegacyInternal, "legacy_sales_internal", { $cond: [hasUserClassification, "$__operationalUser.operationalClassification.reason", null] }] },
          ],
        }],
      }],
    },
    __effectiveOperationalNote: {
      $cond: [userExcluded, "$__operationalUser.operationalClassification.note", {
        $cond: [hasRecord, recordNote, {
          $cond: [{ $or: [hasLegacyTest, hasLegacyInternal] }, null, { $cond: [hasUserClassification, "$__operationalUser.operationalClassification.note", null] }],
        }],
      }],
    },
    __effectiveOperationalClassifiedAt: {
      $cond: [userExcluded, "$__operationalUser.operationalClassification.classifiedAt", {
        $cond: [hasRecord, recordClassifiedAt, {
          $cond: [{ $or: [hasLegacyTest, hasLegacyInternal] }, null, { $cond: [hasUserClassification, "$__operationalUser.operationalClassification.classifiedAt", null] }],
        }],
      }],
    },
  };
}

export function buildEffectiveOperationalClassificationStages(options: {
  userIdField: string;
  recordClassificationField?: string;
  legacySalesReasonField?: string;
  requireLinkedUser?: boolean;
}): PipelineStage[] {
  return [
    {
      $lookup: {
        from: UserModel.collection.name,
        localField: options.userIdField,
        foreignField: "firebaseUid",
        as: "__operationalUsers",
      },
    },
    { $set: { __operationalUser: { $first: "$__operationalUsers" } } },
    ...asOptionalStage(options.requireLinkedUser ? { $match: { "__operationalUser._id": { $exists: true } } } : null),
    { $set: buildEffectiveClassificationProjection(options) },
    { $unset: ["__operationalUsers", "__operationalUser"] },
  ] as PipelineStage[];
}

export function asOptionalStage<T extends PipelineStage>(stage: T | null): T[] {
  return stage ? [stage] : [];
}

export function buildOperationalScopeMatch(scope: OperationalScope): PipelineStage.Match | null {
  if (scope === "all") return null;
  return {
    $match: {
      __effectiveOperationalCategory: scope === "real" ? "real" : { $in: ["test", "internal"] },
    },
  };
}

export function serializeProjectedOperationalClassification(row: Record<string, unknown>): AdminOperationalClassificationSummary {
  return {
    effectiveCategory: row.__effectiveOperationalCategory as OperationalCategory,
    source: row.__effectiveOperationalSource as OperationalClassificationSource,
    ...(typeof row.__effectiveOperationalReason === "string"
      ? { reason: row.__effectiveOperationalReason as AdminOperationalClassificationSummary["reason"] }
      : {}),
    ...(typeof row.__effectiveOperationalNote === "string" ? { note: row.__effectiveOperationalNote } : {}),
    ...(row.__effectiveOperationalClassifiedAt instanceof Date
      ? { classifiedAt: row.__effectiveOperationalClassifiedAt.toISOString() }
      : {}),
  };
}
