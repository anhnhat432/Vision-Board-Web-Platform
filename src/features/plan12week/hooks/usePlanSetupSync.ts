import { useCallback, useMemo, useState } from "react";

import { toAppError } from "@/lib/api/apiClient";
import { createPlan, getPlan } from "@/services/planService";
import type { AppError } from "@/types/api";
import { savePlanDetailsLink } from "../persistence/planLinkStore";

interface SyncPlanPayload {
  goalId: string;
  vision: string;
  startDate: string;
  totalWeeks?: number;
}

export function usePlanSetupSync() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [lastSyncedPlanId, setLastSyncedPlanId] = useState<string | null>(null);

  const syncPlanForGoal = useCallback(async (payload: SyncPlanPayload): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      const createdPlan = await createPlan({
        vision: payload.vision,
        smartGoalId: payload.goalId,
        startDate: payload.startDate,
        initializeWeeks: true,
        totalWeeks: payload.totalWeeks ?? 12,
      });
      const details = await getPlan(createdPlan.id);
      savePlanDetailsLink(payload.goalId, details);
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
