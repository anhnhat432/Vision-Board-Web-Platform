import type { MutationHandlerStrategy, HandlerApplyContext } from "../MutationHandlerStrategy";
import type { HandlerResult, SyncMutationType } from "../types";

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

    const clientReviewId =
      typeof payload.clientReviewId === "string" && payload.clientReviewId.length > 0
        ? payload.clientReviewId
        : typeof review.clientReviewId === "string" && review.clientReviewId.length > 0
          ? review.clientReviewId
          : undefined;

    const getOptNum = (key: string, min = 0, max = 100): number | undefined => {
      const v = typeof payload[key] === "number" ? payload[key] : typeof review[key] === "number" ? review[key] : undefined;
      return typeof v === "number" && v >= min && v <= max ? v : undefined;
    };

    const getOptStr = (key: string): string | undefined => {
      const v = typeof payload[key] === "string" ? payload[key] : typeof review[key] === "string" ? review[key] : undefined;
      return v && v.length > 0 ? v : undefined;
    };

    const workloadDecision: "keep same" | "reduce slightly" | "increase slightly" | "" | undefined = (() => {
      const v = typeof review.workloadDecision === "string" ? review.workloadDecision : undefined;
      if (v === "keep same" || v === "reduce slightly" || v === "increase slightly" || v === "") return v;
      return undefined;
    })();

    const reviewCompleted =
      typeof review.reviewCompleted === "boolean"
        ? review.reviewCompleted
        : typeof payload.reviewCompleted === "boolean"
          ? payload.reviewCompleted
          : undefined;

    // ─── Apply ────────────────────────────────────────────────
    const applied = await workspaceRepo.applyWeeklyReviewUpserted(userId, {
      mutationId,
      clientPlanId: payload.clientPlanId,
      clientWeekId,
      clientReviewId,
      weekNumber: payload.weekNumber,
      executionScore,
      leadCompletionPercent: getOptNum("leadCompletionPercent"),
      lagProgressValue: getOptStr("lagProgressValue"),
      biggestOutputThisWeek: getOptStr("biggestOutputThisWeek"),
      mainObstacle: getOptStr("mainObstacle"),
      nextWeekPriority: getOptStr("nextWeekPriority"),
      workloadDecision,
      reviewCompleted,
      progressScore: getOptNum("progressScore", 0, 10),
      disciplineScore: getOptNum("disciplineScore", 0, 10),
      focusScore: getOptNum("focusScore", 0, 10),
      improvementScore: getOptNum("improvementScore", 0, 10),
      outputQualityScore: getOptNum("outputQualityScore", 0, 10),
      completedLeadIndicators: getOptNum("completedLeadIndicators"),
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
