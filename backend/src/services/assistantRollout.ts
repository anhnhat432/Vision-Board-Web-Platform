import { createHash } from "node:crypto";
import { env } from "../config/env";

/**
 * GĐ5 (Rollout / A-B testing) cho assistant.
 *
 * Nguyên tắc:
 * - Chỉ áp dụng cho signed-in real-mode users (caller quyết định truyền sessionHash).
 * - Phân bổ deterministic theo sessionHash để cùng một user luôn rơi vào cùng cohort/variant
 *   (ổn định trải nghiệm, đo A/B nhất quán).
 * - Demo mode hoặc thiếu sessionHash => luôn trong cohort (không chặn) và variant "control"
 *   để không phá luồng cơ bản local-first.
 * - Không lưu raw session/user id; chỉ dùng hash đã redacted.
 */

export type RolloutMode = "demo" | "real";

export interface RolloutDecision {
  /** User có nằm trong nhóm được bật tính năng AI mới không (canary cohort). */
  inCohort: boolean;
  /** Variant A/B được gán (deterministic). "control" khi không có experiment. */
  variant: string;
  /** Tên experiment hiện tại (rỗng nếu chưa cấu hình). */
  experiment: string;
  /** Phần trăm canary đang áp dụng (0..100). */
  canaryPercent: number;
}

/** Bucket 0..99 deterministic từ một khóa chuỗi (ổn định giữa các lần boot). */
function bucketFromKey(key: string, salt: string): number {
  const digest = createHash("sha256").update(`${salt}:${key}`).digest("hex");
  // Lấy 8 hex đầu -> số nguyên -> mod 100.
  const slice = Number.parseInt(digest.slice(0, 8), 16);
  return slice % 100;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 100;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

/** Danh sách variant đã cấu hình (đã trim, bỏ rỗng, luôn có ít nhất "control"). */
export function getConfiguredVariants(): string[] {
  const raw = (env.AI_EXPERIMENT_VARIANTS ?? "control")
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
  return raw.length > 0 ? raw : ["control"];
}

/**
 * Quyết định rollout cho 1 turn.
 *
 * @param mode demo | real
 * @param sessionHash session hash đã redacted (one-way). undefined => không xác định user.
 */
export function decideRollout(mode: RolloutMode, sessionHash: string | undefined): RolloutDecision {
  const canaryPercent = clampPercent(env.AI_CANARY_PERCENT);
  const experiment = (env.AI_EXPERIMENT ?? "").trim();
  const variants = getConfiguredVariants();

  // Demo hoặc thiếu identity: không chặn, dùng control.
  if (mode === "demo" || !sessionHash) {
    return {
      inCohort: true,
      variant: "control",
      experiment,
      canaryPercent,
    };
  }

  // Canary cohort: deterministic theo sessionHash.
  const cohortBucket = bucketFromKey(sessionHash, "canary");
  const inCohort = canaryPercent >= 100 ? true : cohortBucket < canaryPercent;

  // Variant A/B: chỉ gán khi có experiment + >1 variant; dùng salt riêng để không
  // tương quan với cohort bucket.
  let variant = "control";
  if (experiment && variants.length > 1) {
    const variantBucket = bucketFromKey(sessionHash, `variant:${experiment}`);
    variant = variants[variantBucket % variants.length];
  } else if (variants.length === 1) {
    variant = variants[0];
  }

  return { inCohort, variant, experiment, canaryPercent };
}
