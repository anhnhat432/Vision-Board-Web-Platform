import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { useOptionalAuthContext } from "@/lib/auth/AuthContext";
import { getMemoryItems } from "./assistantMemory";
import { buildAssistantContext } from "./buildAssistantContext";

export const PEEK_INTERVAL_MIN = 30_000;
export const PEEK_INTERVAL_MAX = 60_000;
export const PEEK_DURATION = 4_000;
export const MAX_PEEKS_PER_SESSION = 3;
export const PEEK_PHRASES = [
  "Cần giúp gì không?",
  "Tuần này tiến độ thế nào rồi?",
  "Có thắc mắc gì cứ hỏi mình nhé.",
  "Đang phân vân chỗ nào không?",
  "Mình ở đây nếu bạn cần.",
  "Hôm nay làm việc gì chính?",
  "Hỏi mình 1 câu để bắt đầu nhé.",
];

interface UseBubblePeekOptions {
  pause: boolean;
}

interface BubblePeekState {
  active: boolean;
  text: string;
}

const INACTIVE_PEEK: BubblePeekState = { active: false, text: "" };

function getRandomDelay(): number {
  return Math.floor(Math.random() * (PEEK_INTERVAL_MAX - PEEK_INTERVAL_MIN + 1)) + PEEK_INTERVAL_MIN;
}

function getRandomPhrase(previousPhrase: string | null, phrasesPool: string[]): string {
  const candidates = phrasesPool.filter((phrase) => phrase !== previousPhrase);
  const phrasePool = candidates.length > 0 ? candidates : phrasesPool;
  return phrasePool[Math.floor(Math.random() * phrasePool.length)];
}

function getPersonalizedPeekPhrases(userId: string | null, route: string): string[] {
  const context = buildAssistantContext(undefined, route);
  const memoryItems = getMemoryItems(userId) || [];
  const obstacles = (memoryItems || []).filter((item) => item?.tags?.includes("obstacle"));

  const phrases = [...PEEK_PHRASES];

  if (route === "/smart-goal-setup") {
    phrases.push(
      "Đang lập mục tiêu SMART à? Cần mình giúp viết câu Specific sắc sảo hơn không?",
      "Hãy cho mình biết ý tưởng của bạn, mình đề xuất chỉ số đo lường cho.",
      "Bạn đã có mốc đích cụ thể chưa? Mình gợi ý thử nhé.",
    );
  } else if (route === "/feasibility") {
    phrases.push(
      "Kiểm tra tính khả thi rất quan trọng. Bạn đang lo lắng về nguồn lực nào nhất?",
      "Cần mình phân tích các rủi ro làm giảm điểm khả thi không?",
      "Hãy trả lời các câu hỏi khảo sát, mình sẽ tìm ra bottleneck cho bạn.",
    );
  } else if (route === "/12-week-setup") {
    phrases.push(
      "Thiết lập kế hoạch 12 tuần cần tập trung. Thử gợi ý 3 lead indicator nhé?",
      "Bạn chọn ngày review tuần chưa? Chủ Nhật là lựa chọn phổ biến đó.",
      "Cần mình lên khung milestone cho tuần 4 và tuần 8 không?",
    );
  } else if (route === "/today" || route === "/today-v2" || route === "/12-week-system") {
    const overdueCount = context.stuckSignals?.overdueOpenCount ?? 0;
    if (overdueCount > 0) {
      phrases.push(
        `Có ${overdueCount} task quá hạn đang chờ. Giải quyết nhanh nhé?`,
        "Đừng để việc quá hạn làm bạn nản lòng. Làm 1 việc dễ nhất đi!",
        "Dời lịch các task quá hạn sang ngày mai cho đỡ áp lực nhé?",
      );
    }

    const todayRemaining = context.todayTasks.filter((t) => !t.done).length;
    if (todayRemaining > 0) {
      phrases.push(
        `Hôm nay còn ${todayRemaining} việc chưa hoàn thành. Cố lên!`,
        "Bắt đầu xử lý task đầu tiên của ngày nào.",
        "Dành 15 phút tập trung xử lý task cốt lõi hôm nay nhé?",
      );
    } else if (context.todayTasks.length > 0) {
      phrases.push(
        "Hôm nay bạn làm tuyệt lắm! Toàn bộ task đã hoàn thành.",
        "Tiến độ hôm nay xuất sắc rồi. Nghỉ ngơi hoặc review lại nhé!",
      );
    }
  }

  const busyPref = obstacles.some(
    (it) =>
      it.content.toLowerCase().includes("bận") ||
      it.content.toLowerCase().includes("thì giờ") ||
      it.content.toLowerCase().includes("thời gian"),
  );
  if (busyPref) {
    phrases.push(
      "Dạo này bận rộn quá đúng không? Cần mình giúp chia nhỏ task không?",
      "Thử làm một việc siêu nhỏ trong 5 phút thôi nhé.",
      "Hôm nay ưu tiên một việc duy nhất quan trọng nhất thôi.",
    );
  }

  return phrases;
}

export function useBubblePeek({ pause }: UseBubblePeekOptions): {
  peek: BubblePeekState;
  resetPeekCount: () => void;
  dismissPeek: () => void;
  pauseAutoHide: () => void;
  resumeAutoHide: () => void;
} {
  const auth = useOptionalAuthContext();
  const location = useLocation();
  const route = location.pathname;
  const userId = auth?.user?.uid ?? null;
  const [peek, setPeek] = useState<BubblePeekState>(INACTIVE_PEEK);
  const peekCountRef = useRef(0);
  const lastPhraseRef = useRef<string | null>(null);
  const intervalTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const hideStartedAtRef = useRef<number | null>(null);
  const hideRemainingRef = useRef(PEEK_DURATION);
  const pauseRef = useRef(pause);
  const peekActiveRef = useRef(false);
  const scheduleNextRef = useRef<() => void>(() => {});

  const clearIntervalTimer = useCallback(() => {
    if (intervalTimerRef.current === null) return;
    window.clearTimeout(intervalTimerRef.current);
    intervalTimerRef.current = null;
  }, []);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current === null) return;
    window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
  }, []);

  const startHideTimer = useCallback(
    (duration = PEEK_DURATION) => {
      clearHideTimer();
      hideRemainingRef.current = duration;
      hideStartedAtRef.current = Date.now();
      hideTimerRef.current = window.setTimeout(() => {
        hideTimerRef.current = null;
        hideStartedAtRef.current = null;
        hideRemainingRef.current = PEEK_DURATION;
        setPeek((current) => ({ ...current, active: false }));
        scheduleNextRef.current();
      }, duration);
    },
    [clearHideTimer],
  );

  const scheduleNext = useCallback(() => {
    clearIntervalTimer();
    if (pauseRef.current || peekCountRef.current >= MAX_PEEKS_PER_SESSION) return;

    intervalTimerRef.current = window.setTimeout(() => {
      intervalTimerRef.current = null;
      if (pauseRef.current || peekCountRef.current >= MAX_PEEKS_PER_SESSION) return;

      const phrases = getPersonalizedPeekPhrases(userId, route);
      const text = getRandomPhrase(lastPhraseRef.current, phrases);
      lastPhraseRef.current = text;
      peekCountRef.current += 1;
      setPeek({ active: true, text });
      startHideTimer();
    }, getRandomDelay());
  }, [clearIntervalTimer, startHideTimer, userId, route]);

  useEffect(() => {
    scheduleNextRef.current = scheduleNext;
  }, [scheduleNext]);

  useEffect(() => {
    peekActiveRef.current = peek.active;
  }, [peek.active]);

  useEffect(() => {
    pauseRef.current = pause;

    if (pause) {
      clearIntervalTimer();
      clearHideTimer();
      setPeek(INACTIVE_PEEK);
      return;
    }

    scheduleNext();
  }, [clearHideTimer, clearIntervalTimer, pause, scheduleNext]);

  useEffect(() => {
    return () => {
      clearIntervalTimer();
      clearHideTimer();
    };
  }, [clearHideTimer, clearIntervalTimer]);

  const resetPeekCount = useCallback(() => {
    peekCountRef.current = 0;
    lastPhraseRef.current = null;

    if (!pauseRef.current && !peekActiveRef.current) {
      scheduleNextRef.current();
    }
  }, []);

  const dismissPeek = useCallback(() => {
    clearHideTimer();
    hideStartedAtRef.current = null;
    hideRemainingRef.current = PEEK_DURATION;
    setPeek((current) => ({ ...current, active: false }));
    scheduleNextRef.current();
  }, [clearHideTimer]);

  const pauseAutoHide = useCallback(() => {
    if (!peek.active || hideTimerRef.current === null) return;

    const elapsed = hideStartedAtRef.current === null ? 0 : Date.now() - hideStartedAtRef.current;
    hideRemainingRef.current = Math.max(0, hideRemainingRef.current - elapsed);
    hideStartedAtRef.current = null;
    clearHideTimer();
  }, [clearHideTimer, peek.active]);

  const resumeAutoHide = useCallback(() => {
    if (!peek.active || hideTimerRef.current !== null || pauseRef.current) return;
    startHideTimer(hideRemainingRef.current);
  }, [peek.active, startHideTimer]);

  return { peek, resetPeekCount, dismissPeek, pauseAutoHide, resumeAutoHide };
}
