import type { MutationHandlerStrategy, HandlerApplyContext } from "../MutationHandlerStrategy";
import type { HandlerResult, SyncMutationType } from "../types";

/**
 * Handler xử lý mutation daily_check_in_upserted / daily_checkin_upsert.
 *
 * Payload shape:
 * {
 *   clientPlanId: string;         // required
 *   clientWeekId?: string;
 *   clientGoalId?: string;
 *   clientCheckInId?: string;
 *   weekNumber: number;           // required
 *   localDate: string;            // required (ISO date string)
 *   didWorkToday: boolean;        // required
 *   whichLeadIndicatorWorkedOn?: string;
 *   amountDone?: string;
 *   outputCreated?: string;
 *   obstacleOrIssue?: string;
 *   dailySelfRating?: number;
 *   optionalNote?: string;
 *   mood?: "low" | "steady" | "high";
 * }
 */
export class DailyCheckInUpsertHandler implements MutationHandlerStrategy {
  readonly mutationType: SyncMutationType = "daily_check_in_upserted";

  async apply(context: HandlerApplyContext): Promise<HandlerResult> {
    const { userId, mutation, processedAt, workspaceRepo } = context;
    const { payload, mutationId } = mutation;

    // ─── Validation ───────────────────────────────────────────
    if (typeof payload.clientPlanId !== "string" || payload.clientPlanId.length === 0) {
      return {
        mutationId,
        type: "daily_check_in_upserted",
        status: "failed_validation",
        entityType: "daily_check_in",
        reason: "Missing or invalid 'clientPlanId' — must be a non-empty string.",
        syncErrorCode: "invalid_payload",
      };
    }

    if (typeof payload.weekNumber !== "number" || !Number.isFinite(payload.weekNumber)) {
      return {
        mutationId,
        type: "daily_check_in_upserted",
        status: "failed_validation",
        entityType: "daily_check_in",
        reason: "Missing or invalid 'weekNumber' — must be a finite number.",
        syncErrorCode: "invalid_payload",
      };
    }

    if (typeof payload.localDate !== "string" || payload.localDate.length === 0) {
      return {
        mutationId,
        type: "daily_check_in_upserted",
        status: "failed_validation",
        entityType: "daily_check_in",
        reason: "Missing or invalid 'localDate' — must be a non-empty string.",
        syncErrorCode: "invalid_payload",
      };
    }

    if (typeof payload.didWorkToday !== "boolean") {
      return {
        mutationId,
        type: "daily_check_in_upserted",
        status: "failed_validation",
        entityType: "daily_check_in",
        reason: "Missing or invalid 'didWorkToday' — must be boolean.",
        syncErrorCode: "invalid_payload",
      };
    }

    // ─── Extract optional fields ──────────────────────────────
    const clientGoalId =
      typeof payload.clientGoalId === "string" && payload.clientGoalId.length > 0
        ? payload.clientGoalId
        : undefined;

    const clientWeekId =
      typeof payload.clientWeekId === "string" && payload.clientWeekId.length > 0
        ? payload.clientWeekId
        : undefined;

    const clientCheckInId =
      typeof payload.clientCheckInId === "string" && payload.clientCheckInId.length > 0
        ? payload.clientCheckInId
        : undefined;

    const whichLeadIndicatorWorkedOn =
      typeof payload.whichLeadIndicatorWorkedOn === "string" ? payload.whichLeadIndicatorWorkedOn : undefined;
    const amountDone = typeof payload.amountDone === "string" ? payload.amountDone : undefined;
    const outputCreated = typeof payload.outputCreated === "string" ? payload.outputCreated : undefined;
    const obstacleOrIssue = typeof payload.obstacleOrIssue === "string" ? payload.obstacleOrIssue : undefined;
    const optionalNote = typeof payload.optionalNote === "string" ? payload.optionalNote : undefined;

    const dailySelfRating =
      typeof payload.dailySelfRating === "number" && Number.isFinite(payload.dailySelfRating)
        ? payload.dailySelfRating
        : undefined;

    const mood: "low" | "steady" | "high" | undefined =
      payload.mood === "low" || payload.mood === "steady" || payload.mood === "high"
        ? payload.mood
        : undefined;

    // ─── Apply ────────────────────────────────────────────────
    const applied = await workspaceRepo.applyDailyCheckInUpserted(userId, {
      mutationId,
      clientGoalId,
      clientPlanId: payload.clientPlanId,
      clientWeekId,
      clientCheckInId,
      weekNumber: payload.weekNumber,
      localDate: payload.localDate,
      didWorkToday: payload.didWorkToday,
      whichLeadIndicatorWorkedOn,
      amountDone,
      outputCreated,
      obstacleOrIssue,
      dailySelfRating,
      optionalNote,
      mood,
      syncUpdatedAt: processedAt,
    });

    // ─── Result ───────────────────────────────────────────────
    if (!applied) {
      return {
        mutationId,
        type: "daily_check_in_upserted",
        status: "failed_not_found",
        entityType: "daily_check_in",
        clientId: clientCheckInId,
        reason: "daily_check_in_not_found_or_week_not_owned",
        message: "Daily check-in could not be applied — week not found or not owned.",
        syncErrorCode: "ownership_denied",
      };
    }

    return {
      mutationId,
      type: "daily_check_in_upserted",
      status: "applied",
      entityType: "daily_check_in",
      clientId: applied.clientId ?? clientCheckInId,
      serverId: applied.id,
      revision: applied.revision,
      syncUpdatedAt: (applied.syncUpdatedAt ?? processedAt).toISOString(),
      message: "Daily check-in mutation applied.",
    };
  }
}