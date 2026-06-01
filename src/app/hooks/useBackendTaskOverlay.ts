import { useCallback, useEffect, useRef, useState } from "react";
import { getPlanLink } from "@/features/plan12week/persistence/planLinkStore";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { getPlan } from "@/services/planService";
import type { Task as ApiTask, PlanDetails } from "@/types/plan";
import type { TwelveWeekTaskInstance } from "../utils/storage-types";

/**
 * Map from local task id → backend completion status.
 * `true` means backend says "done", `false` means backend says "todo"/"doing".
 * Absence from the map means no backend data for that task.
 */
export type TaskOverlayMap = ReadonlyMap<string, boolean>;

interface BackendTaskOverlayResult {
  /** Overlay map: localTaskId → backend completed status */
  overlay: TaskOverlayMap;
  /** Whether the backend fetch is in progress */
  loading: boolean;
  /** Whether backend data was successfully loaded */
  hasBackendData: boolean;
  /** Refresh from backend */
  refresh: () => void;
}

const EMPTY_MAP: TaskOverlayMap = new Map();

/**
 * Fetches the backend PlanDetails for the given goalId (via planLinkStore)
 * and builds a map of localTaskId → completed status from backend tasks.
 *
 * Falls back gracefully (returns empty overlay) when:
 * - User is not authenticated
 * - No plan link exists for the goal
 * - Backend fetch fails
 */
export function useBackendTaskOverlay(goalId: string | null): BackendTaskOverlayResult {
  const { user } = useAuthContext();
  const [overlay, setOverlay] = useState<TaskOverlayMap>(EMPTY_MAP);
  const [loading, setLoading] = useState(false);
  const [hasBackendData, setHasBackendData] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastFetchedPlanId = useRef<string | null>(null);

  const fetchOverlay = useCallback(async () => {
    // No user or no goalId → no backend data
    if (!user || !goalId) {
      setOverlay(EMPTY_MAP);
      setHasBackendData(false);
      return;
    }

    const link = getPlanLink(goalId);
    if (!link?.planId) {
      setOverlay(EMPTY_MAP);
      setHasBackendData(false);
      return;
    }

    // Skip if we already fetched this exact plan
    if (lastFetchedPlanId.current === link.planId && hasBackendData) {
      return;
    }

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    try {
      const details: PlanDetails = await getPlan(link.planId);

      // Check if this request was aborted while in flight
      if (controller.signal.aborted) return;

      // Build reverse map: remoteTaskId → ApiTask
      const remoteTaskMap = new Map<string, ApiTask>();
      for (const week of details.weeks) {
        for (const task of week.tasks) {
          remoteTaskMap.set(task.id, task);
        }
      }

      // Build overlay: localTaskId → completed
      const nextOverlay = new Map<string, boolean>();
      const taskIdMap = link.taskIdByLocalTaskId;

      for (const [localId, remoteId] of Object.entries(taskIdMap)) {
        const remoteTask = remoteTaskMap.get(remoteId);
        if (remoteTask) {
          nextOverlay.set(localId, remoteTask.status === "done");
        }
      }

      setOverlay(nextOverlay);
      setHasBackendData(true);
      lastFetchedPlanId.current = link.planId;
    } catch (err) {
      if (!controller.signal.aborted) {
        console.error("Backend task overlay fetch failed, using local data.", err);
        setOverlay(EMPTY_MAP);
        setHasBackendData(false);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [user, goalId, hasBackendData]);

  useEffect(() => {
    void fetchOverlay();

    return () => {
      abortRef.current?.abort();
    };
  }, [fetchOverlay]);

  const refresh = useCallback(() => {
    lastFetchedPlanId.current = null;
    void fetchOverlay();
  }, [fetchOverlay]);

  return { overlay, loading, hasBackendData, refresh };
}

/**
 * Apply backend task overlay to local task instances.
 * For any task with a backend override, the `completed` field is replaced.
 * Tasks without backend data keep their local value.
 */
export function applyTaskOverlay(tasks: TwelveWeekTaskInstance[], overlay: TaskOverlayMap): TwelveWeekTaskInstance[] {
  if (overlay.size === 0) return tasks;

  const now = Date.now();
  return tasks.map((task) => {
    const backendCompleted = overlay.get(task.id);
    if (backendCompleted === undefined) return task;
    if (task.completed === backendCompleted) return task;

    // Guard: Nếu task vừa được chỉnh sửa cục bộ trong vòng 15 giây qua,
    // ta không cho backend overlay ghi đè lên trạng thái cục bộ (local status wins).
    // Việc này ngăn chặn tuyệt đối checkbox bị giật/nhảy trạng thái do độ trễ truyền mạng.
    if (task.lastModifiedAt && now - task.lastModifiedAt < 15000) {
      return task;
    }

    return { ...task, completed: backendCompleted };
  });
}
