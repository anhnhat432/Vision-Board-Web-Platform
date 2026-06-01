import { useCallback, useMemo, useState } from "react";
import { isDemoMode } from "@/app/utils/app-mode";
import { toAppError } from "@/lib/api/apiClient";
import { createPlan, getPlan } from "@/services/planService";
import type { AppError } from "@/types/api";
import { savePlanDetailsLink } from "../persistence/planLinkStore";

interface SyncPlanPayload {
  goalId?: string;
  localGoalId?: string;
  backendGoalId?: string;
  vision: string;
  startDate: string;
  totalWeeks?: number;
}

export function usePlanSetupSync() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [lastSyncedPlanId, setLastSyncedPlanId] = useState<string | null>(null);

  const syncPlanForGoal = useCallback(async (payload: SyncPlanPayload): Promise<string | null> => {
    if (isDemoMode()) {
      return null;
    }

    const localGoalId = payload.localGoalId ?? payload.goalId;
    const smartGoalId = payload.backendGoalId ?? payload.goalId ?? payload.localGoalId;
    if (!localGoalId || !smartGoalId) {
      console.warn("Skipped plan setup sync because goal IDs were missing.", payload);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const createdPlan = await createPlan({
        vision: payload.vision,
        smartGoalId,
        startDate: payload.startDate,
        initializeWeeks: true,
        totalWeeks: payload.totalWeeks ?? 12,
      });
      const details = await getPlan(createdPlan.id);
      savePlanDetailsLink(localGoalId, details);
      setLastSyncedPlanId(createdPlan.id);
      return createdPlan.id;
    } catch (nextError) {
      const parsedError = toAppError(nextError);
      setError(parsedError);
      console.error("Failed to sync plan setup.", nextError);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const actions = useMemo(
    () => ({
      syncPlanForGoal,
      clearError,
    }),
    [clearError, syncPlanForGoal],
  );

  const data = useMemo(
    () => ({
      lastSyncedPlanId,
    }),
    [lastSyncedPlanId],
  );

  return {
    loading,
    error,
    data,
    actions,
  };
}
