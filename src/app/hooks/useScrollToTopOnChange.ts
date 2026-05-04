import { useLayoutEffect, useRef, type RefObject } from "react";

const INITIAL_CHANGE_KEY = Symbol("initial-scroll-change-key");
const DEFAULT_MOBILE_MEDIA_QUERY = "(max-width: 767px)";

interface UseScrollToTopOnChangeOptions {
  targetRef?: RefObject<HTMLElement | null>;
  focusRef?: RefObject<HTMLElement | null>;
  enabled?: boolean;
  mobileOnly?: boolean;
  mediaQuery?: string;
  topOffset?: number;
  behavior?: ScrollBehavior;
  focus?: boolean;
  skipInitial?: boolean;
}

function shouldRunForViewport(mobileOnly: boolean, mediaQuery: string) {
  if (!mobileOnly) return true;
  if (typeof window === "undefined") return false;
  if (typeof window.matchMedia !== "function") return true;

  try {
    return window.matchMedia(mediaQuery).matches;
  } catch {
    return true;
  }
}

function getScrollTop(target: HTMLElement | null | undefined, topOffset: number) {
  if (!target || typeof window === "undefined") return 0;

  const currentScrollY = window.scrollY || window.pageYOffset || 0;
  return Math.max(0, target.getBoundingClientRect().top + currentScrollY - topOffset);
}

export function useScrollToTopOnChange(changeKey: unknown, options: UseScrollToTopOnChangeOptions = {}) {
  const {
    targetRef,
    focusRef,
    enabled = true,
    mobileOnly = true,
    mediaQuery = DEFAULT_MOBILE_MEDIA_QUERY,
    topOffset = 72,
    behavior = "smooth",
    focus = true,
    skipInitial = true,
  } = options;
  const previousChangeKeyRef = useRef<unknown>(INITIAL_CHANGE_KEY);

  useLayoutEffect(() => {
    const isInitial = previousChangeKeyRef.current === INITIAL_CHANGE_KEY;
    const hasChanged = isInitial || !Object.is(previousChangeKeyRef.current, changeKey);
    previousChangeKeyRef.current = changeKey;

    if (!hasChanged || (isInitial && skipInitial) || !enabled) return;
    if (typeof window === "undefined" || !shouldRunForViewport(mobileOnly, mediaQuery)) return;

    const top = getScrollTop(targetRef?.current, topOffset);
    const scrollOptions: ScrollToOptions = { top, left: 0, behavior };

    try {
      window.scrollTo(scrollOptions);
    } catch {
      window.scrollTo(0, top);
    }

    document.documentElement.scrollTop = top;
    document.body.scrollTop = top;

    if (focus) {
      focusRef?.current?.focus({ preventScroll: true });
    }
  }, [behavior, changeKey, enabled, focus, focusRef, mediaQuery, mobileOnly, skipInitial, targetRef, topOffset]);
}
