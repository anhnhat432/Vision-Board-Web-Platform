import { useCallback, useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "dof_theme";
type Theme = "light" | "dark" | "system";

function getSystemPreference(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    /* ignore */
  }
  return "light";
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const THEME_TRANSITION_MS = 300;
let transitionTimer: number | null = null;

/** Apply the resolved theme + optionally animate the swap.
 *
 * Strategy (P2-09):
 *   1. On the initial mount we just sync the DOM to the saved theme — no
 *      animation needed (and using View Transitions here triggers
 *      "Transition was skipped" warnings in the console).
 *   2. When the user actually toggles the theme:
 *      - If browser supports View Transitions API (Chrome / Edge), use it for
 *        the smoothest cross-fade.
 *      - Otherwise add `theme-transitioning` to <html> for ~300ms so the
 *        global color transition rule in theme.css kicks in just for this
 *        swap, then remove it (avoids constant transitions on every paint).
 *      - If the user prefers reduced motion, swap instantly. */
function applyTheme(theme: Theme, animate = false) {
  const resolved = theme === "system" ? getSystemPreference() : theme;
  const html = document.documentElement;
  const reduced = prefersReducedMotion();

  const swap = () => {
    html.classList.toggle("dark", resolved === "dark");
    html.style.colorScheme = resolved;
  };

  if (!animate || reduced) {
    swap();
    return;
  }

  // The View Transitions API is shipped in Chrome/Edge but not yet typed in
  // every TS lib version this project targets — feature-detect at runtime.
  const startViewTransition = (
    document as {
      startViewTransition?: (cb: () => void) => {
        finished?: Promise<void>;
        ready?: Promise<void>;
        updateCallbackDone?: Promise<void>;
      };
    }
  ).startViewTransition;
  if (typeof startViewTransition === "function") {
    const transition = startViewTransition.call(document, swap);
    // .finished/.ready/.updateCallbackDone reject with "Transition was skipped"
    // when a new transition starts before the previous one finishes (or when
    // the page is hidden). That's expected; swallow the rejections so they
    // don't pollute the console.
    const swallow = () => {
      /* skipped transitions are expected */
    };
    transition?.finished?.catch(swallow);
    transition?.ready?.catch(swallow);
    transition?.updateCallbackDone?.catch(swallow);
    return;
  }

  // Fallback path: short-lived class enables global color transition.
  html.classList.add("theme-transitioning");
  swap();
  if (transitionTimer !== null) window.clearTimeout(transitionTimer);
  transitionTimer = window.setTimeout(() => {
    html.classList.remove("theme-transitioning");
    transitionTimer = null;
  }, THEME_TRANSITION_MS);
}

// Tiny external store for cross-component sync
let currentTheme = getStoredTheme();
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getSnapshot() {
  return currentTheme;
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot);

  const setTheme = useCallback((next: Theme) => {
    currentTheme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    applyTheme(next, true);
    for (const cb of listeners) cb();
  }, []);

  const resolvedTheme = theme === "system" ? getSystemPreference() : theme;

  // Apply on mount + listen for system changes
  useEffect(() => {
    applyTheme(theme);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (currentTheme === "system") {
        applyTheme("system", true);
        for (const cb of listeners) cb();
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  return { theme, resolvedTheme, setTheme } as const;
}
