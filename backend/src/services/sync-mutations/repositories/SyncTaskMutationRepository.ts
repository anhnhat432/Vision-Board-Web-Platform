// Di chuyển từ syncMutationService.ts — giữ nguyên toàn bộ interface

export interface TaskCompletedChangedApplyInput {
  mutationId: string;
  backendTaskId?: string;
  clientTaskId?: string;
  clientWeekId?: string;
  clientPlanId?: string;
  completed: boolean;
  completedAt?: Date;
  syncUpdatedAt: Date;
}

export interface AppliedTaskMutationEntity {
  id: string;
  clientTaskId?: string;
  status: "todo" | "doing" | "done";
  completedAt?: Date;
  revision?: number;
  syncUpdatedAt?: Date;
}

export interface SyncTaskMutationRepository {
  applyTaskCompletedChanged(
    userId: string,
    input: TaskCompletedChangedApplyInput,
  ): Promise<AppliedTaskMutationEntity | null>;
}