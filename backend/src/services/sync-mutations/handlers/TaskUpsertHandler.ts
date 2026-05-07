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
 * Hiện tại backend chưa có repository method riêng cho task_upsert,
 * nên handler trả về "accepted" để báo rằng mutation đã được ghi nhận
 * nhưng chưa được apply (pending full implementation).
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

    // ─── Accepted (pending full upsert implementation) ────────
    // TODO: Implement full task upsert when TaskModel supports createOrUpdate
    return {
      mutationId,
      type: "task_upsert",
      status: "accepted",
      entityType: "task",
      message: "Task upsert mutation accepted (pending full implementation).",
    };
  }
}