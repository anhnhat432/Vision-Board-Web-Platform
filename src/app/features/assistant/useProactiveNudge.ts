import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { formatDateInputValue } from "@/app/utils/storage-date-utils";
import { useOptionalAuthContext } from "@/lib/auth/AuthContext";
import { getMemoryItems } from "./assistantMemory";
import { buildAssistantContext } from "./buildAssistantContext";

export type NudgeReason = "new-week" | "overdue" | "idle" | "personalized";

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

    const memoryItems = getMemoryItems(userId) || [];
    const obstacles = (memoryItems || []).filter((item) => item?.tags?.includes("obstacle"));
    const preferredTimes = (memoryItems || []).filter((item) => item?.tags?.includes("preferred_time"));

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

    // Personalized preferred time nudge
    const now = new Date();
    const hours = now.getHours();
    const day = now.getDay();
    const isWeekend = day === 0 || day === 6;
    let activePreferredTimeMsg = "";

    const hasWeekendPref = preferredTimes.some(
      (it) => it.content.toLowerCase().includes("cuối tuần") || it.tags?.includes("cuối tuần"),
    );
    const hasNightPref = preferredTimes.some(
      (it) =>
        it.content.toLowerCase().includes("đêm") ||
        it.content.toLowerCase().includes("tối muộn") ||
        it.tags?.includes("ban đêm"),
    );
    const hasMorningPref = preferredTimes.some(
      (it) =>
        it.content.toLowerCase().includes("sáng sớm") ||
        it.content.toLowerCase().includes("buổi sáng") ||
        it.tags?.includes("sáng sớm"),
    );

    if (isWeekend && hasWeekendPref) {
      activePreferredTimeMsg = "Đang trong thời gian rảnh cuối tuần của bạn. Dành 10 phút xử lý task nhé?";
    } else if ((hours >= 22 || hours < 5) && hasNightPref) {
      activePreferredTimeMsg = "Đang là khung giờ tập trung ban đêm ưa thích của bạn. Bạn muốn bắt đầu việc gì?";
    } else if (hours >= 5 && hours < 9 && hasMorningPref) {
      activePreferredTimeMsg = "Khung giờ sáng sớm yên tĩnh này là lúc bạn tập trung tốt nhất. Cùng chạy task nhé?";
    }

    if (activePreferredTimeMsg) {
      activateNudge("personalized", activePreferredTimeMsg);
      return undefined;
    }

    const overdueOpenCount = context.stuckSignals?.overdueOpenCount ?? 0;
    if (overdueOpenCount > 0) {
      const busyPref = obstacles.some(
        (it) =>
          it.content.toLowerCase().includes("bận") ||
          it.content.toLowerCase().includes("thì giờ") ||
          it.content.toLowerCase().includes("thời gian"),
      );
      const lazyPref = obstacles.some(
        (it) =>
          it.content.toLowerCase().includes("lười") ||
          it.content.toLowerCase().includes("ngại") ||
          it.content.toLowerCase().includes("nản"),
      );

      let overdueMsg = `${overdueOpenCount} task đang quá hạn. Cùng xử lý từng cái nhé?`;
      if (busyPref) {
        overdueMsg = `Biết bạn dạo này khá bận rộn, nhưng có ${overdueOpenCount} việc đã quá hạn. Dành 5 phút giải quyết 1 việc nhỏ nhé?`;
      } else if (lazyPref) {
        overdueMsg = `Hơi lười một chút cũng không sao, hãy thử xử lý 1 việc quá hạn siêu nhanh trong 3 phút xem thế nào nhé?`;
      }

      activateNudge("overdue", overdueMsg);
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
