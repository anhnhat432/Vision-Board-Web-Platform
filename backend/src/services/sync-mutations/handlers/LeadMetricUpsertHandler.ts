import type { MutationHandlerStrategy, HandlerApplyContext } from "../MutationHandlerStrategy";
import type { HandlerResult, SyncMutationType } from "../types";

/**
 * Handler xử lý mutation lead_metric_upserted.
 *
 * Payload shape:
 * {
 *   clientPlanId: string;         // required
 *   clientWeekId?: string;
 *   clientMetricId: string;       // required
 *   leadIndicatorId?: string;
 *   weekNumber: number;           // required
 *   name: string;                 // required
 *   weeklyTarget?: number;
 *   target?: string;
 *   currentValue?: number;
 *   unit?: string;
 *   frequency?: string;
 *   type?: string;
 *   priority?: number;
 *   schedule?: number[];
 * }
 */
export class LeadMetricUpsertHandler implements MutationHandlerStrategy {
  readonly mutationType: SyncMutationType = "lead_metric_upserted";

  async apply(context: HandlerApplyContext): Promise<HandlerResult> {
    const { userId, mutation, processedAt, workspaceRepo } = context;
    const { payload, mutationId } = mutation;

    // ─── Validation ───────────────────────────────────────────
    if (typeof payload.clientPlanId !== "string" || payload.clientPlanId.length === 0) {
      return {
        mutationId,
        type: "lead_metric_upserted",
        status: "failed_validation",
        entityType: "lead_metric",
        reason: "Missing or invalid 'clientPlanId' — must be a non-empty string.",
        syncErrorCode: "invalid_payload",
      };
    }

    if (typeof payload.clientMetricId !== "string" || payload.clientMetricId.length === 0) {
      return {
        mutationId,
        type: "lead_metric_upserted",
        status: "failed_validation",
        entityType: "lead_metric",
        reason: "Missing or invalid 'clientMetricId' — must be a non-empty string.",
        syncErrorCode: "invalid_payload",
      };
    }

    if (typeof payload.weekNumber !== "number" || !Number.isFinite(payload.weekNumber)) {
      return {
        mutationId,
        type: "lead_metric_upserted",
        status: "failed_validation",
        entityType: "lead_metric",
        reason: "Missing or invalid 'weekNumber' — must be a finite number.",
        syncErrorCode: "invalid_payload",
      };
    }

    if (typeof payload.name !== "string" || payload.name.length === 0) {
      return {
        mutationId,
        type: "lead_metric_upserted",
        status: "failed_validation",
        entityType: "lead_metric",
        reason: "Missing or invalid 'name' — must be a non-empty string.",
        syncErrorCode: "invalid_payload",
      };
    }

    // ─── Extract optional fields ──────────────────────────────
    const clientWeekId =
      typeof payload.clientWeekId === "string" && payload.clientWeekId.length > 0
        ? payload.clientWeekId
        : undefined;

    const leadIndicatorId =
      typeof payload.leadIndicatorId === "string" && payload.leadIndicatorId.length > 0
        ? payload.leadIndicatorId
        : undefined;

    const weeklyTarget =
      typeof payload.weeklyTarget === "number" && Number.isFinite(payload.weeklyTarget)
        ? payload.weeklyTarget
        : undefined;

    const target = typeof payload.target === "string" ? payload.target : undefined;
    const unit = typeof payload.unit === "string" ? payload.unit : undefined;
    const frequency = typeof payload.frequency === "string" ? payload.frequency : undefined;
    const type = typeof payload.type === "string" ? payload.type : undefined;

    const currentValue =
      typeof payload.currentValue === "number" && Number.isFinite(payload.currentValue)
        ? payload.currentValue
        : undefined;

    const priority =
      typeof payload.priority === "number" && Number.isFinite(payload.priority)
        ? payload.priority
        : undefined;

    const schedule = Array.isArray(payload.schedule)
      ? payload.schedule.filter((n): n is number => typeof n === "number" && Number.isFinite(n))
      : undefined;

    // ─── Apply ────────────────────────────────────────────────
    const applied = await workspaceRepo.applyLeadMetricUpserted(userId, {
      mutationId,
      clientPlanId: payload.clientPlanId,
      clientWeekId,
      clientMetricId: payload.clientMetricId,
      leadIndicatorId,
      weekNumber: payload.weekNumber,
      name: payload.name,
      weeklyTarget,
      target,
      currentValue,
      unit,
      frequency,
      type,
      priority,
      schedule,
      syncUpdatedAt: processedAt,
    });

    // ─── Result ───────────────────────────────────────────────
    if (!applied) {
      return {
        mutationId,
        type: "lead_metric_upserted",
        status: "failed_not_found",
        entityType: "lead_metric",
        clientId: payload.clientMetricId,
        reason: "lead_metric_not_found_or_week_not_owned",
        message: "Lead metric could not be applied — week not found or not owned.",
        syncErrorCode: "ownership_denied",
      };
    }

    return {
      mutationId,
      type: "lead_metric_upserted",
      status: "applied",
      entityType: "lead_metric",
      clientId: applied.clientId ?? payload.clientMetricId,
      serverId: applied.id,
      revision: applied.revision,
      syncUpdatedAt: (applied.syncUpdatedAt ?? processedAt).toISOString(),
      message: "Lead metric mutation applied.",
    };
  }
}