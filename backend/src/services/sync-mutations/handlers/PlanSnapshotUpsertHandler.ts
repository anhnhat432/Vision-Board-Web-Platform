import type { MutationHandlerStrategy, HandlerApplyContext } from "../MutationHandlerStrategy";
import type { HandlerResult, SyncMutationType } from "../types";

/**
 * Handler alias cho plan_snapshot_upsert — dùng chung logic với PlanSnapshotUpdatedHandler.
 * Cả hai mutation type đều gọi applyPlanSnapshotUpdated trên workspace repo.
 */
export class PlanSnapshotUpsertHandler implements MutationHandlerStrategy {
  readonly mutationType: SyncMutationType = "plan_snapshot_upsert";

  async apply(context: HandlerApplyContext): Promise<HandlerResult> {
    const { userId, mutation, processedAt, workspaceRepo } = context;
    const { payload, mutationId } = mutation;

    // ─── Helper: get nested system object ──────────────────────
    const system = (typeof payload.system === "object" && payload.system !== null
      ? payload.system
      : {}) as Record<string, unknown>;

    // ─── Validation ───────────────────────────────────────────
    if (typeof payload.clientPlanId !== "string" || payload.clientPlanId.length === 0) {
      return {
        mutationId,
        type: "plan_snapshot_upsert",
        status: "failed_validation",
        entityType: "plan",
        reason: "Missing or invalid 'clientPlanId'.",
        syncErrorCode: "invalid_payload",
      };
    }

    // ─── Extract fields ───────────────────────────────────────
    const clientGoalId: string | undefined =
      typeof payload.clientGoalId === "string" && payload.clientGoalId.length > 0
        ? payload.clientGoalId
        : undefined;

    const vision: string | undefined =
      typeof payload.vision === "string" && payload.vision.length > 0
        ? payload.vision
        : typeof system.vision12Week === "string" && system.vision12Week.length > 0
          ? system.vision12Week
          : undefined;

    const startDate: Date | undefined = (() => {
      const raw = typeof payload.startDate === "string"
        ? payload.startDate
        : typeof system.startDate === "string"
          ? system.startDate
          : undefined;
      if (!raw) return undefined;
      const d = new Date(raw);
      return Number.isFinite(d.valueOf()) ? d : undefined;
    })();

    // ─── Parse weeks ─────────────────────────────────────────
    const rawWeeks: unknown[] = Array.isArray(system.weeklyPlans)
      ? (system.weeklyPlans as unknown[])
      : Array.isArray(payload.weeks)
        ? (payload.weeks as unknown[])
        : [];

    if (rawWeeks.length > 12) {
      return {
        mutationId,
        type: "plan_snapshot_upsert",
        status: "failed_validation",
        entityType: "plan",
        reason: "weeks cannot contain more than 12 items.",
        syncErrorCode: "invalid_payload",
      };
    }

    const seenWeekNumbers = new Set<number>();
    const weeks: Array<{ clientWeekId?: string; weekNumber: number; focus?: string; expectedOutput?: string }> = [];

    for (let i = 0; i < rawWeeks.length; i++) {
      const rawWeek = rawWeeks[i];
      if (typeof rawWeek !== "object" || rawWeek === null || Array.isArray(rawWeek)) {
        return {
          mutationId,
          type: "plan_snapshot_upsert",
          status: "failed_validation",
          entityType: "plan",
          reason: `weeklyPlans[${i}] must be an object.`,
          syncErrorCode: "invalid_payload",
        };
      }

      const w = rawWeek as Record<string, unknown>;
      const weekNumber = typeof w.weekNumber === "number" ? w.weekNumber : undefined;
      if (typeof weekNumber !== "number" || !Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 12) {
        return {
          mutationId,
          type: "plan_snapshot_upsert",
          status: "failed_validation",
          entityType: "plan",
          reason: `weeklyPlans[${i}].weekNumber must be an integer between 1 and 12.`,
          syncErrorCode: "invalid_payload",
        };
      }

      if (seenWeekNumbers.has(weekNumber)) {
        return {
          mutationId,
          type: "plan_snapshot_upsert",
          status: "failed_validation",
          entityType: "plan",
          reason: `weeklyPlans[${i}].weekNumber must be unique.`,
          syncErrorCode: "invalid_payload",
        };
      }
      seenWeekNumbers.add(weekNumber);

      const clientWeekId =
        typeof w.clientWeekId === "string" && w.clientWeekId.length > 0 ? w.clientWeekId : undefined;
      const focus = typeof w.focus === "string" && w.focus.length > 0 ? w.focus : undefined;
      const expectedOutput =
        typeof w.expectedOutput === "string" && w.expectedOutput.length > 0
          ? w.expectedOutput
          : typeof w.milestone === "string" && w.milestone.length > 0
            ? w.milestone
            : undefined;

      weeks.push({ clientWeekId, weekNumber, focus, expectedOutput });
    }

    // ─── Apply ────────────────────────────────────────────────
    const applied = await workspaceRepo.applyPlanSnapshotUpdated(userId, {
      mutationId,
      clientGoalId,
      clientPlanId: payload.clientPlanId,
      vision,
      startDate,
      weeks,
      syncUpdatedAt: processedAt,
    });

    // ─── Result ───────────────────────────────────────────────
    if (!applied) {
      return {
        mutationId,
        type: "plan_snapshot_upsert",
        status: "failed_not_found",
        entityType: "plan",
        clientId: payload.clientPlanId,
        reason: "plan_not_found_or_not_owned",
        message: "Plan was not found for this authenticated user.",
        syncErrorCode: "ownership_denied",
      };
    }

    return {
      mutationId,
      type: "plan_snapshot_upsert",
      status: "applied",
      entityType: "plan",
      clientId: applied.clientId ?? payload.clientPlanId,
      serverId: applied.id,
      revision: applied.revision,
      syncUpdatedAt: (applied.syncUpdatedAt ?? processedAt).toISOString(),
      message: "Plan snapshot mutation applied.",
    };
  }
}