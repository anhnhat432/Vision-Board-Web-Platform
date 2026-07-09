import type { MutationHandlerStrategy, HandlerApplyContext } from "../MutationHandlerStrategy";
import type { HandlerResult, SyncMutationType } from "../types";

/**
 * Handler xử lý mutation task_upsert.
 *
 * Payload shape:
 * {
 *   clientPlanId: string;
 *   clientWeekId?: string;
 *   clientTaskId?: string;
 *   title: string;
 *   status?: "todo" | "doing" | "done";
 *   completed?: boolean;
 * }
 *
 * Backend does not yet have a repository method for task_upsert.
 * Until full persistence exists, this handler must fail explicitly so clients
 * do not treat non-persisted task creation/update work as synced.
 */
export class TaskUpsertHandler implements MutationHandlerStrategy {
  readonly mutationType: SyncMutationType = "task_upsert";

  async apply(context: HandlerApplyContext): Promise<HandlerResult> {
    const { mutation } = context;
    const { payload, mutationId } = mutation;

    // ─── Validation ───────────────────────────────────────────
    if (typeof payload.clientPlanId !== "string" || payload.clientPlanId.length === 0) {
      return {
        mutationId,
        type: "task_upsert",
        status: "failed_validation",
        entityType: "task",
        reason: "Missing or invalid 'clientPlanId'.",
        syncErrorCode: "invalid_payload",
      };
    }

    if (typeof payload.title !== "string" || payload.title.length === 0) {
      return {
        mutationId,
        type: "task_upsert",
        status: "failed_validation",
        entityType: "task",
        reason: "Missing or invalid 'title'.",
        syncErrorCode: "invalid_payload",
      };
    }

    // TODO: Implement full task upsert when TaskModel supports createOrUpdate.
    return {
      mutationId,
      type: "task_upsert",
      status: "failed",
      entityType: "task",
      reason: "Task upsert is not implemented on the backend yet.",
      message: "Task upsert mutation was not applied because backend task persistence is not implemented.",
      syncErrorCode: "task_upsert_not_implemented",
    };
  }
}
