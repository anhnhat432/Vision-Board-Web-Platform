import type { MutationHandlerStrategy, HandlerApplyContext } from "../MutationHandlerStrategy";
import type { HandlerResult, SyncMutationType } from "../types";

const MAX_REVIEW_LIST_ITEMS = 5;

function getOptionalNumber(
  payload: Record<string, unknown>,
  review: Record<string, unknown>,
  key: string,
  min = 0,
  max = 100,
): number | undefined {
  const value = typeof payload[key] === "number" ? payload[key] : review[key];
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max ? value : undefined;
}

function getOptionalString(
  payload: Record<string, unknown>,
  review: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = typeof payload[key] === "string" ? payload[key] : review[key];
  return typeof value === "string" ? value.trim() : undefined;
}

function getOptionalStringArray(
  payload: Record<string, unknown>,
  review: Record<string, unknown>,
  key: string,
): string[] | undefined {
  const value = Array.isArray(payload[key]) ? payload[key] : Array.isArray(review[key]) ? review[key] : undefined;
  if (!value) return undefined;

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, MAX_REVIEW_LIST_ITEMS);
}

function getOptionalBoolean(
  payload: Record<string, unknown>,
  review: Record<string, unknown>,
  key: string,
): boolean | undefined {
  const value = typeof payload[key] === "boolean" ? payload[key] : review[key];
  return typeof value === "boolean" ? value : undefined;
}

function getOptionalDate(
  payload: Record<string, unknown>,
  review: Record<string, unknown>,
  key: string,
): Date | undefined {
  const value = payload[key] ?? review[key];
  if (typeof value !== "string" && !(value instanceof Date)) return undefined;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isFinite(parsed.valueOf()) ? parsed : undefined;
}

/**
 * Handler xử lý mutation weekly_review_upserted / weekly_review_upsert.
 *
 * Payload shape:
 * {
 *   clientPlanId: string;
 *   clientWeekId?: string;
 *   clientReviewId?: string;
 *   weekNumber: number;
 *   executionScore: number;
 *   review?: { ...sub-fields };
 *   ...optional review fields at payload level
 * }
 */
export class WeeklyReviewUpsertHandler implements MutationHandlerStrategy {
  readonly mutationType: SyncMutationType = "weekly_review_upserted";

  async apply(context: HandlerApplyContext): Promise<HandlerResult> {
    const { userId, mutation, processedAt, workspaceRepo } = context;
    const { payload, mutationId } = mutation;

    // ─── Helper: get nested review object ──────────────────────
    const review = (typeof payload.review === "object" && payload.review !== null
      ? payload.review
      : {}) as Record<string, unknown>;

    // ─── Validation ───────────────────────────────────────────
    if (typeof payload.clientPlanId !== "string" || payload.clientPlanId.length === 0) {
      return {
        mutationId,
        type: "weekly_review_upserted",
        status: "failed_validation",
        entityType: "weekly_review",
        reason: "Missing or invalid 'clientPlanId'.",
        syncErrorCode: "invalid_payload",
      };
    }

    if (
      typeof payload.weekNumber !== "number" ||
      !Number.isInteger(payload.weekNumber) ||
      payload.weekNumber < 1 ||
      payload.weekNumber > 12
    ) {
      return {
        mutationId,
        type: "weekly_review_upserted",
        status: "failed_validation",
        entityType: "weekly_review",
        reason: "weekNumber must be an integer between 1 and 12.",
        syncErrorCode: "invalid_payload",
      };
    }

    // ─── Compute executionScore ───────────────────────────────
    let executionScore = 0;
    const explicitScore =
      typeof payload.executionScore === "number"
        ? payload.executionScore
        : typeof review.executionScore === "number"
          ? review.executionScore
          : undefined;

    if (typeof explicitScore === "number" && explicitScore >= 0 && explicitScore <= 100) {
      executionScore = explicitScore;
    } else {
      const leadPct =
        typeof review.leadCompletionPercent === "number" ? review.leadCompletionPercent : undefined;
      if (typeof leadPct === "number" && leadPct >= 0 && leadPct <= 100) {
        executionScore = leadPct;
      } else {
        const scoreFields = [
          typeof review.progressScore === "number" ? review.progressScore : undefined,
          typeof review.disciplineScore === "number" ? review.disciplineScore : undefined,
          typeof review.focusScore === "number" ? review.focusScore : undefined,
          typeof review.improvementScore === "number" ? review.improvementScore : undefined,
          typeof review.outputQualityScore === "number" ? review.outputQualityScore : undefined,
        ].filter((v): v is number => v !== undefined);

        if (scoreFields.length > 0) {
          executionScore = Math.round(
            (scoreFields.reduce((sum, v) => sum + v, 0) / scoreFields.length) * 10,
          );
        }
      }
    }

    // ─── Extract fields ───────────────────────────────────────
    const clientWeekId =
      typeof payload.clientWeekId === "string" && payload.clientWeekId.length > 0
        ? payload.clientWeekId
        : typeof review.clientWeekId === "string" && review.clientWeekId.length > 0
          ? review.clientWeekId
          : undefined;
    const backendPlanId =
      typeof payload.backendPlanId === "string" && payload.backendPlanId.length > 0
        ? payload.backendPlanId
        : typeof review.backendPlanId === "string" && review.backendPlanId.length > 0
          ? review.backendPlanId
          : undefined;
    const backendWeekId =
      typeof payload.backendWeekId === "string" && payload.backendWeekId.length > 0
        ? payload.backendWeekId
        : typeof review.backendWeekId === "string" && review.backendWeekId.length > 0
          ? review.backendWeekId
          : undefined;

    const clientReviewId =
      typeof payload.clientReviewId === "string" && payload.clientReviewId.length > 0
        ? payload.clientReviewId
        : typeof review.clientReviewId === "string" && review.clientReviewId.length > 0
          ? review.clientReviewId
          : undefined;

    const workloadDecision: "keep same" | "reduce slightly" | "increase slightly" | "" | undefined = (() => {
      const v = typeof payload.workloadDecision === "string" ? payload.workloadDecision : review.workloadDecision;
      if (v === "keep same" || v === "reduce slightly" || v === "increase slightly" || v === "") return v;
      return undefined;
    })();

    const reviewCompleted = getOptionalBoolean(payload, review, "reviewCompleted");

    // ─── Apply ────────────────────────────────────────────────
    const applied = await workspaceRepo.applyWeeklyReviewUpserted(userId, {
      mutationId,
      backendPlanId,
      backendWeekId,
      clientPlanId: payload.clientPlanId,
      clientWeekId,
      clientReviewId,
      weekNumber: payload.weekNumber,
      executionScore,
      leadCompletionPercent: getOptionalNumber(payload, review, "leadCompletionPercent"),
      lagProgressValue: getOptionalString(payload, review, "lagProgressValue"),
      biggestOutputThisWeek: getOptionalString(payload, review, "biggestOutputThisWeek"),
      mainObstacle: getOptionalString(payload, review, "mainObstacle"),
      nextWeekPriority: getOptionalString(payload, review, "nextWeekPriority"),
      workloadDecision,
      reviewCompleted,
      commitmentsKept: getOptionalStringArray(payload, review, "commitmentsKept"),
      commitmentsMissed: getOptionalStringArray(payload, review, "commitmentsMissed"),
      insights: getOptionalString(payload, review, "insights"),
      nextWeekCommitments: getOptionalStringArray(payload, review, "nextWeekCommitments"),
      keepTactic: getOptionalString(payload, review, "keepTactic"),
      reduceTactic: getOptionalString(payload, review, "reduceTactic"),
      reflection: getOptionalString(payload, review, "reflection"),
      adjustments: getOptionalString(payload, review, "adjustments"),
      lastReviewAt: getOptionalDate(payload, review, "lastReviewAt"),
      progressScore: getOptionalNumber(payload, review, "progressScore", 0, 10),
      disciplineScore: getOptionalNumber(payload, review, "disciplineScore", 0, 10),
      focusScore: getOptionalNumber(payload, review, "focusScore", 0, 10),
      improvementScore: getOptionalNumber(payload, review, "improvementScore", 0, 10),
      outputQualityScore: getOptionalNumber(payload, review, "outputQualityScore", 0, 10),
      completedLeadIndicators: getOptionalNumber(payload, review, "completedLeadIndicators"),
      syncUpdatedAt: processedAt,
    });

    // ─── Result ───────────────────────────────────────────────
    if (!applied) {
      return {
        mutationId,
        type: "weekly_review_upserted",
        status: "failed_not_found",
        entityType: "weekly_review",
        clientId: clientReviewId,
        reason: "week_not_found_or_not_owned",
        message: "Weekly review parent week was not found for this authenticated user.",
        syncErrorCode: "ownership_denied",
      };
    }

    return {
      mutationId,
      type: "weekly_review_upserted",
      status: "applied",
      entityType: "weekly_review",
      clientId: applied.clientId ?? clientReviewId,
      serverId: applied.id,
      revision: applied.revision,
      syncUpdatedAt: (applied.syncUpdatedAt ?? processedAt).toISOString(),
      message: "Weekly review mutation applied.",
    };
  }
}
