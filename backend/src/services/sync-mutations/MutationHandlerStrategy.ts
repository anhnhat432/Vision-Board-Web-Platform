import type { HandlerResult, SyncMutationType, ValidatedMutation } from "./types";
import type { SyncTaskMutationRepository } from "./repositories/SyncTaskMutationRepository";
import type { SyncWorkspaceMutationRepository } from "./repositories/SyncWorkspaceMutationRepository";

/**
 * Context được inject vào mỗi handler khi apply mutation.
 * Tách biệt hoàn toàn với HTTP request/response — chỉ chứa dữ liệu domain.
 */
export interface HandlerApplyContext {
  /** Firebase UID của user đang gọi */
  userId: string;
  /** Mutation đã validate + compute hash */
  mutation: ValidatedMutation;
  /** Thời điểm xử lý batch (dùng làm syncUpdatedAt mặc định) */
  processedAt: Date;
  /** Repository cho task entity */
  taskRepo: SyncTaskMutationRepository;
  /** Repository cho workspace entities (check-in, review, plan, metric) */
  workspaceRepo: SyncWorkspaceMutationRepository;
}

/**
 * Mỗi handler chịu trách nhiệm cho MỘT SyncMutationType.
 *
 * Quan trọng:
 * - Handler KHÔNG truy cập HTTP request/response
 * - Handler KHÔNG gọi mutation log repository (orchestrator lo)
 * - Handler CHỈ validate payload riêng + gọi repository + trả về result
 */
export interface MutationHandlerStrategy {
  /** Mutation type mà handler này đăng ký */
  readonly mutationType: SyncMutationType;

  /**
   * Áp dụng mutation lên database.
   *
   * @returns SyncMutationResult nếu apply thành công/thất bại.
   *          Trả về null nếu không thể xử lý (orchestrator sẽ map thành "failed_not_found").
   */
  apply(context: HandlerApplyContext): Promise<HandlerResult>;
}