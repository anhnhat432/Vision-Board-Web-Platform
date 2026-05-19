import { useCallback, useEffect, useRef, useState } from "react";

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

function getRandomPhrase(previousPhrase: string | null): string {
  const candidates = PEEK_PHRASES.filter((phrase) => phrase !== previousPhrase);
  const phrasePool = candidates.length > 0 ? candidates : PEEK_PHRASES;
  return phrasePool[Math.floor(Math.random() * phrasePool.length)];
}

export function useBubblePeek({ pause }: UseBubblePeekOptions): {
  peek: BubblePeekState;
  resetPeekCount: () => void;
  dismissPeek: () => void;
  pauseAutoHide: () => void;
  resumeAutoHide: () => void;
} {
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

      const text = getRandomPhrase(lastPhraseRef.current);
      lastPhraseRef.current = text;
      peekCountRef.current += 1;
      setPeek({ active: true, text });
      startHideTimer();
    }, getRandomDelay());
  }, [clearIntervalTimer, startHideTimer]);

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
