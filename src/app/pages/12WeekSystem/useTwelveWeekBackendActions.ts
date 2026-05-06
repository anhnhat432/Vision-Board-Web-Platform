import type { RefObject } from "react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import {
  applyBackendPlanSnapshotToLocal,
  hydrateTwelveWeekPlansFromBackend,
  type BackendPlanHydrationResult,
} from "@/app/hooks/useBackendPlanHydration";
import { syncPendingOutbox, type OutboxSyncSnapshot } from "@/app/utils/production";
import type { Goal, TwelveWeekSystem } from "@/app/utils/storage-types";
import { buildBackendSyncKey } from "./helpers";

interface BackendSnapshotResult {
  status: "idle" | "success" | "partial" | "error";
  message: string;
  syncedCount: number;
}

interface ExecutionSyncActions {
  syncLocalSnapshot: (input: { system: TwelveWeekSystem }) => Promise<BackendSnapshotResult>;
}

interface UseTwelveWeekBackendActionsOptions {
  activeGoal: Goal | null;
  system: TwelveWeekSystem | null;
  isBackendProfileReady: boolean;
  executionSyncActions: ExecutionSyncActions;
  activeGoalIdRef: RefObject<string | null>;
  lastBackendSyncKeyRef: RefObject<string | null>;
  setLastSyncSnapshot: (snapshot: OutboxSyncSnapshot) => void;
  loadGoalData: (preferredGoalId?: string) => void;
  refreshBackendProgressOverlay: () => void;
  refreshSnapshotMeta: () => void;
}

export function useTwelveWeekBackendActions({
  activeGoal,
  system,
  isBackendProfileReady,
  executionSyncActions,
  activeGoalIdRef,
  lastBackendSyncKeyRef,
  setLastSyncSnapshot,
  loadGoalData,
  refreshBackendProgressOverlay,
  refreshSnapshotMeta,
}: UseTwelveWeekBackendActionsOptions) {
  const [isHydratingBackendPlans, setIsHydratingBackendPlans] = useState(false);
  const [isResolvingBackendPlanConflicts, setIsResolvingBackendPlanConflicts] = useState(false);
  const [lastBackendHydrationResult, setLastBackendHydrationResult] = useState<BackendPlanHydrationResult | null>(null);

  const handleRunOutboxSync = useCallback(async () => {
    if (!activeGoal || !system) return;
    const actionGoalId = activeGoal.id;
    if (isBackendProfileReady) {
      const backendSnapshot = await executionSyncActions.syncLocalSnapshot({
        system: activeGoal.twelveWeekSystem ?? system,
      });

      if (backendSnapshot.status === "success" && backendSnapshot.syncedCount > 0) {
        toast.success(backendSnapshot.message);
      } else if (backendSnapshot.status === "partial") {
        toast.info(backendSnapshot.message);
      } else if (backendSnapshot.status === "error") {
        toast.error(backendSnapshot.message);
      }

      if (
        activeGoalIdRef.current === actionGoalId &&
        (backendSnapshot.status === "success" || backendSnapshot.status === "partial")
      ) {
        refreshBackendProgressOverlay();
      }
    }

    const snapshot = await syncPendingOutbox();
    setLastSyncSnapshot(snapshot);
    if (activeGoalIdRef.current === actionGoalId) {
      refreshSnapshotMeta();
    }

    if (snapshot.status === "success") {
      toast.success(snapshot.message);
      return;
    }

    if (snapshot.status === "partial") {
      toast.info(snapshot.message);
      return;
    }

    if (snapshot.status === "offline" || snapshot.status === "not_configured" || snapshot.status === "idle") {
      toast.info(snapshot.message);
      return;
    }

    toast.error(snapshot.message);
  }, [activeGoal, system, isBackendProfileReady, executionSyncActions, activeGoalIdRef, refreshBackendProgressOverlay, setLastSyncSnapshot, refreshSnapshotMeta]);

  const handleHydrateBackendPlans = useCallback(async () => {
    if (!activeGoal) return;
    if (!isBackendProfileReady) {
      toast.info("Đăng nhập và chờ backend profile sẵn sàng trước khi khôi phục dữ liệu.");
      return;
    }

    setIsHydratingBackendPlans(true);

    try {
      const result = await hydrateTwelveWeekPlansFromBackend();
      setLastBackendHydrationResult(result);
      lastBackendSyncKeyRef.current = null;

      if (result.status === "error") {
        toast.error(result.message);
      } else if (result.status === "partial") {
        toast.info(result.message);
      } else if (result.conflictCount > 0) {
        toast.info(result.message);
      } else if (result.hydratedCount + result.updatedCount > 0) {
        toast.success(
          `Đã khôi phục ${result.hydratedCount} chu kỳ mới và cập nhật ${result.updatedCount} chu kỳ từ backend.`,
        );
      } else {
        toast.info("Đã kiểm tra backend. Chưa có chu kỳ 12-week mới cần khôi phục.");
      }

      loadGoalData(result.latestGoalId ?? activeGoal.id);
      refreshBackendProgressOverlay();
      refreshSnapshotMeta();
    } catch (error) {
      console.error("Failed to hydrate backend 12-week plans.", error);
      toast.error("Không thể khôi phục dữ liệu 12-week từ backend lúc này.");
    } finally {
      setIsHydratingBackendPlans(false);
    }
  }, [activeGoal, isBackendProfileReady, lastBackendSyncKeyRef, loadGoalData, refreshBackendProgressOverlay, refreshSnapshotMeta]);

  const refreshBackendConflictReview = async (preferredGoalId: string, options?: { preserveSyncKey?: boolean }) => {
    const result = await hydrateTwelveWeekPlansFromBackend();
    setLastBackendHydrationResult(result);
    if (!options?.preserveSyncKey) {
      lastBackendSyncKeyRef.current = null;
    }
    loadGoalData(result.latestGoalId ?? preferredGoalId);
    refreshBackendProgressOverlay();
    refreshSnapshotMeta();
    return result;
  };

  const handleUseBackendPlanForConflicts = useCallback(async (goalId: string) => {
    if (isResolvingBackendPlanConflicts) return;
    setIsResolvingBackendPlanConflicts(true);

    try {
      const result = await applyBackendPlanSnapshotToLocal(goalId);
      if (result.status === "error") {
        toast.error("Không thể áp dụng bản backend cho chu kỳ này lúc này.");
        return;
      }

      toast.success("Đã dùng bản backend cho chu kỳ này.");
      const reviewResult = await refreshBackendConflictReview(goalId);
      if (reviewResult.conflictCount > 0) {
        toast.info(reviewResult.message);
      }
    } catch (error) {
      console.error("Failed to apply backend plan snapshot.", error);
      toast.error("Không thể áp dụng bản backend cho chu kỳ này lúc này.");
    } finally {
      setIsResolvingBackendPlanConflicts(false);
    }
  }, [isResolvingBackendPlanConflicts, refreshBackendConflictReview]);

  const handleKeepLocalPlanForConflicts = useCallback(async (goalId: string) => {
    if (!activeGoal || !system) return;
    if (isResolvingBackendPlanConflicts) return;

    if (goalId !== activeGoal.id) {
      loadGoalData(goalId);
      toast.info("Đã mở chu kỳ này. Bấm Giữ local lần nữa để đẩy bản local lên backend.");
      return;
    }

    setIsResolvingBackendPlanConflicts(true);

    try {
      const localSystem = activeGoal.twelveWeekSystem ?? system;
      const snapshot = await executionSyncActions.syncLocalSnapshot({ system: localSystem });
      if (snapshot.status === "error") {
        toast.error(snapshot.message);
        return;
      }

      if (snapshot.status === "partial") {
        toast.info(snapshot.message);
      } else {
        toast.success("Đã giữ bản local và đồng bộ lại lên backend.");
      }

      lastBackendSyncKeyRef.current = buildBackendSyncKey(goalId, localSystem);
      const reviewResult = await refreshBackendConflictReview(goalId, { preserveSyncKey: true });
      if (reviewResult.conflictCount > 0) {
        toast.info(reviewResult.message);
      }
    } catch (error) {
      console.error("Failed to keep local plan snapshot.", error);
      toast.error("Không thể đồng bộ bản local lên backend lúc này.");
    } finally {
      setIsResolvingBackendPlanConflicts(false);
    }
  }, [activeGoal, system, isResolvingBackendPlanConflicts, executionSyncActions, lastBackendSyncKeyRef, loadGoalData, refreshBackendConflictReview]);

  return {
    isHydratingBackendPlans,
    isResolvingBackendPlanConflicts,
    lastBackendHydrationResult,
    handleRunOutboxSync,
    handleHydrateBackendPlans,
    handleUseBackendPlanForConflicts,
    handleKeepLocalPlanForConflicts,
  };
}
