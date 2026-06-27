import type { MutationHandlerStrategy, HandlerApplyContext } from "../MutationHandlerStrategy";
import type { HandlerResult, SyncMutationType } from "../types";

export class DailyCheckInUpsertHandler implements MutationHandlerStrategy {
  readonly mutationType: SyncMutationType = "daily_check_in_upserted";

  async apply(context: HandlerApplyContext): Promise<HandlerResult> {
    const { userId, mutation, processedAt, workspaceRepo } = context;
    const { payload, mutationId } = mutation;

    const checkIn = (typeof payload.checkIn === "object" && payload.checkIn !== null && !Array.isArray(payload.checkIn)
      ? payload.checkIn
      : {}) as Record<string, unknown>;

    const getString = (key: string): string | undefined => {
      const value = typeof payload[key] === "string" ? payload[key] : checkIn[key];
      return typeof value === "string" && value.length > 0 ? value : undefined;
    };
    const getNumber = (key: string): number | undefined => {
      const value = typeof payload[key] === "number" ? payload[key] : checkIn[key];
      return typeof value === "number" && Number.isFinite(value) ? value : undefined;
    };
    const getBoolean = (key: string): boolean | undefined => {
      const value = typeof payload[key] === "boolean" ? payload[key] : checkIn[key];
      return typeof value === "boolean" ? value : undefined;
    };

    const clientPlanId = getString("clientPlanId");
    const weekNumber = getNumber("weekNumber");
    const localDate = getString("localDate") ?? getString("date");
    const didWorkToday = getBoolean("didWorkToday");

    if (!clientPlanId) {
      return {
        mutationId,
        type: "daily_check_in_upserted",
        status: "failed_validation",
        entityType: "daily_check_in",
        reason: "Missing or invalid 'clientPlanId' - must be a non-empty string.",
        syncErrorCode: "invalid_payload",
      };
    }

    if (typeof weekNumber !== "number" || !Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 12) {
      return {
        mutationId,
        type: "daily_check_in_upserted",
        status: "failed_validation",
        entityType: "daily_check_in",
        reason: "weekNumber must be an integer between 1 and 12.",
        syncErrorCode: "invalid_payload",
      };
    }

    if (!localDate) {
      return {
        mutationId,
        type: "daily_check_in_upserted",
        status: "failed_validation",
        entityType: "daily_check_in",
        reason: "date must be a valid date.",
        syncErrorCode: "invalid_payload",
      };
    }

    const parsedLocalDate = new Date(`${localDate}T00:00:00.000Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(localDate) ||
      !Number.isFinite(parsedLocalDate.valueOf()) ||
      parsedLocalDate.toISOString().slice(0, 10) !== localDate
    ) {
      return {
        mutationId,
        type: "daily_check_in_upserted",
        status: "failed_validation",
        entityType: "daily_check_in",
        reason: "date must be a valid date.",
        syncErrorCode: "invalid_payload",
      };
    }

    if (typeof didWorkToday !== "boolean") {
      return {
        mutationId,
        type: "daily_check_in_upserted",
        status: "failed_validation",
        entityType: "daily_check_in",
        reason: "didWorkToday must be a boolean.",
        syncErrorCode: "invalid_payload",
      };
    }

    const clientGoalId = getString("clientGoalId");
    const backendPlanId = getString("backendPlanId");
    const backendWeekId = getString("backendWeekId");
    const clientWeekId = getString("clientWeekId");
    const clientCheckInId = getString("clientCheckInId");
    const whichLeadIndicatorWorkedOn = getString("whichLeadIndicatorWorkedOn");
    const amountDone = getString("amountDone");
    const outputCreated = getString("outputCreated");
    const obstacleOrIssue = getString("obstacleOrIssue");
    const optionalNote = getString("optionalNote");
    const dailySelfRating = getNumber("dailySelfRating");
    const rawMood = payload.mood ?? checkIn.mood;
    const mood: "low" | "steady" | "high" | undefined =
      rawMood === "low" || rawMood === "steady" || rawMood === "high" ? rawMood : undefined;

    const applied = await workspaceRepo.applyDailyCheckInUpserted(userId, {
      mutationId,
      clientGoalId,
      backendPlanId,
      backendWeekId,
      clientPlanId,
      clientWeekId,
      clientCheckInId,
      weekNumber,
      localDate,
      didWorkToday,
      whichLeadIndicatorWorkedOn,
      amountDone,
      outputCreated,
      obstacleOrIssue,
      dailySelfRating,
      optionalNote,
      mood,
      syncUpdatedAt: processedAt,
    });

    if (!applied) {
      return {
        mutationId,
        type: "daily_check_in_upserted",
        status: "failed_not_found",
        entityType: "daily_check_in",
        clientId: clientCheckInId,
        reason: "week_not_found_or_not_owned",
        message: "Daily check-in parent week was not found for this authenticated user.",
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
