import type { MutationHandlerStrategy, HandlerApplyContext } from "../MutationHandlerStrategy";
import type { HandlerResult, SyncMutationType } from "../types";

/**
 * Handler xử lý mutation task_completed_changed.
 *
 * Payload shape:
 * {
 *   clientTaskId?: string;
 *   backendTaskId?: string;
 *   clientWeekId?: string;
 *   clientPlanId?: string;
 *   completed: boolean;
 *   completedAt?: string; // ISO date
 * }
 */
export class TaskCompletedChangedHandler implements MutationHandlerStrategy {
  readonly mutationType: SyncMutationType = "task_completed_changed";

  async apply(context: HandlerApplyContext): Promise<HandlerResult> {
    const { userId, mutation, processedAt, taskRepo } = context;
    const { payload, mutationId } = mutation;

    // ─── Validation ───────────────────────────────────────────
    if (typeof payload.completed !== "boolean") {
      return {
        mutationId,
        type: "task_completed_changed",
        status: "failed_validation",
        entityType: "task",
        reason: "completed must be a boolean.",
        syncErrorCode: "invalid_payload",
      };
    }

    const clientTaskId =
      typeof payload.clientTaskId === "string" && payload.clientTaskId.length > 0
        ? payload.clientTaskId
        : undefined;

    const backendTaskId =
      typeof payload.backendTaskId === "string" && payload.backendTaskId.length > 0
        ? payload.backendTaskId
        : undefined;
    const backendPlanId =
      typeof payload.backendPlanId === "string" && payload.backendPlanId.length > 0
        ? payload.backendPlanId
        : undefined;
    const backendWeekId =
      typeof payload.backendWeekId === "string" && payload.backendWeekId.length > 0
        ? payload.backendWeekId
        : undefined;

    // Phải có ít nhất 1 identifier
    if (!clientTaskId && !backendTaskId) {
      return {
        mutationId,
        type: "task_completed_changed",
        status: "failed_validation",
        entityType: "task",
        reason: "At least one of clientTaskId or backendTaskId is required.",
        syncErrorCode: "invalid_payload",
      };
    }

    // ─── Apply ────────────────────────────────────────────────
    const completedAt = payload.completedAt
      ? new Date(payload.completedAt as string)
      : payload.completed
        ? processedAt
        : undefined;

    const clientWeekId =
      typeof payload.clientWeekId === "string" && payload.clientWeekId.length > 0
        ? payload.clientWeekId
        : undefined;

    const clientPlanId =
      typeof payload.clientPlanId === "string" && payload.clientPlanId.length > 0
        ? payload.clientPlanId
        : undefined;
    const weekNumber =
      typeof payload.weekNumber === "number" && Number.isInteger(payload.weekNumber)
        ? payload.weekNumber
        : undefined;

    const applied = await taskRepo.applyTaskCompletedChanged(userId, {
      mutationId,
      backendTaskId,
      backendPlanId,
      backendWeekId,
      clientTaskId,
      clientWeekId,
      clientPlanId,
      weekNumber,
      completed: payload.completed,
      completedAt,
      syncUpdatedAt: processedAt,
    });

    // ─── Result ───────────────────────────────────────────────
    if (!applied) {
      return {
        mutationId,
        type: "task_completed_changed",
        status: "failed_not_found",
        entityType: "task",
        clientId: clientTaskId,
        reason: "task_not_found_or_not_owned",
        message: "Task was not found for this authenticated user.",
        syncErrorCode: "ownership_denied",
      };
    }

    return {
      mutationId,
      type: "task_completed_changed",
      status: "applied",
      entityType: "task",
      clientId: applied.clientTaskId ?? clientTaskId,
      serverId: applied.id,
      revision: applied.revision,
      syncUpdatedAt: (applied.syncUpdatedAt ?? processedAt).toISOString(),
      message: "Task completion mutation applied.",
    };
  }
}
