import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { formatDateInputValue } from "@/app/utils/storage-date-utils";
import { useOptionalAuthContext } from "@/lib/auth/AuthContext";
import { buildAssistantContext } from "./buildAssistantContext";

export type NudgeReason = "new-week" | "overdue" | "idle";

export interface NudgeState {
  active: boolean;
  reason: NudgeReason | null;
  message: string;
}

const LAST_WEEK_KEY = (uid: string | null) => `assistant.lastSeenWeek:${uid ?? "anon"}`;
const NUDGE_SHOWN_KEY = (uid: string | null) => `assistant.nudgeShown:${uid ?? "anon"}.${todayISO()}`;
const IDLE_MS = 5 * 60 * 1000;
const ACTIVITY_EVENTS = ["mousemove", "keydown", "scroll", "touchstart"] as const;
const INACTIVE_NUDGE: NudgeState = { active: false, reason: null, message: "" };

function todayISO(): string {
  return formatDateInputValue(new Date());
}

function canUseLocalStorage(): boolean {
  if (typeof localStorage === "undefined") return false;

  try {
    localStorage.getItem("assistant.storage.check");
    return true;
  } catch {
    return false;
  }
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function removeActivityListeners(listener: EventListener): void {
  for (const eventName of ACTIVITY_EVENTS) {
    window.removeEventListener(eventName, listener);
  }
}

export function useProactiveNudge(panelOpen: boolean): {
  nudge: NudgeState;
  dismissNudge: () => void;
} {
  const auth = useOptionalAuthContext();
  const location = useLocation();
  const route = location.pathname;
  const userId = auth?.user?.uid ?? null;
  const [nudge, setNudge] = useState<NudgeState>(INACTIVE_NUDGE);
  const idleTimerRef = useRef<number | null>(null);
  const activeReasonRef = useRef<NudgeReason | null>(null);
  const hasTriggeredThisLoadRef = useRef(false);
  const scopeRef = useRef<string | null>(null);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current === null) return;
    window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = null;
  }, []);

  const markShownToday = useCallback(() => writeStorage(NUDGE_SHOWN_KEY(userId), "1"), [userId]);

  const dismissNudge = useCallback(() => {
    markShownToday();
    activeReasonRef.current = null;
    hasTriggeredThisLoadRef.current = true;
    clearIdleTimer();
    setNudge(INACTIVE_NUDGE);
  }, [clearIdleTimer, markShownToday]);

  useEffect(() => {
    const nextScope = `${route}:${userId ?? "anon"}`;
    if (scopeRef.current === nextScope) return;

    scopeRef.current = nextScope;
    hasTriggeredThisLoadRef.current = false;
    activeReasonRef.current = null;
    clearIdleTimer();
    setNudge(INACTIVE_NUDGE);
  }, [clearIdleTimer, route, userId]);

  useEffect(() => {
    if (panelOpen) {
      hasTriggeredThisLoadRef.current = true;
      dismissNudge();
    }
  }, [dismissNudge, panelOpen]);

  useEffect(() => {
    if (typeof window === "undefined" || panelOpen || hasTriggeredThisLoadRef.current) return undefined;
    if (!canUseLocalStorage()) return undefined;

    let mounted = true;

    const activateNudge = (reason: NudgeReason, message: string) => {
      if (!mounted || panelOpen || hasTriggeredThisLoadRef.current) return;
      if (!markShownToday()) return;

      hasTriggeredThisLoadRef.current = true;
      activeReasonRef.current = reason;
      clearIdleTimer();
      setNudge({ active: true, reason, message });
    };

    const scheduleIdleTimer = () => {
      clearIdleTimer();
      idleTimerRef.current = window.setTimeout(() => {
        activateNudge("idle", "Bạn đang phân vân chỗ nào không? Hỏi mình thử xem.");
      }, IDLE_MS);
    };

    const context = buildAssistantContext(undefined, route);
    const shownToday = readStorage(NUDGE_SHOWN_KEY(userId)) === "1";
    if (shownToday) return undefined;

    const currentWeek = context.currentWeek;
    if (currentWeek !== null) {
      const lastSeenWeekRaw = readStorage(LAST_WEEK_KEY(userId));
      const lastSeenWeekNumber = lastSeenWeekRaw === null ? null : Number(lastSeenWeekRaw);
      const isNewWeek =
        lastSeenWeekNumber === null || !Number.isFinite(lastSeenWeekNumber) || lastSeenWeekNumber < currentWeek;

      if (isNewWeek && writeStorage(LAST_WEEK_KEY(userId), String(currentWeek))) {
        activateNudge("new-week", `Tuần ${currentWeek} bắt đầu rồi. Muốn mình tóm tắt và chọn ưu tiên không?`);
        return undefined;
      }
    }

    const overdueOpenCount = context.stuckSignals?.overdueOpenCount ?? 0;
    if (overdueOpenCount > 0) {
      activateNudge("overdue", `${overdueOpenCount} task đang quá hạn. Cùng xử lý từng cái nhé?`);
      return undefined;
    }

    const handleActivity: EventListener = () => {
      if (panelOpen || hasTriggeredThisLoadRef.current) return;
      scheduleIdleTimer();
    };

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, handleActivity, { passive: true });
    }

    scheduleIdleTimer();

    return () => {
      mounted = false;
      clearIdleTimer();
      removeActivityListeners(handleActivity);
    };
  }, [clearIdleTimer, markShownToday, panelOpen, route, userId]);

  return { nudge, dismissNudge };
}
