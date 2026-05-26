import { useEffect, useState } from "react";

/**
 * P2-01 Motion Design System.
 *
 * Listens to the OS-level `(prefers-reduced-motion: reduce)` media query
 * and returns whether the user has requested reduced motion.
 *
 * Re-export note: the framer-motion (`motion/react`) library exports its own
 * `useReducedMotion` and that is what the existing `MotionFadeIn` /
 * `MotionPageTransition` components use. This hook is a vanilla equivalent
 * for components that don't depend on framer-motion (CSS-only animations,
 * non-motion components that still want to opt out of transitions, etc.)
 * so we don't pull motion/react into trees that don't need it.
 *
 * @example
 * const reduce = useReducedMotion();
 * if (reduce) return <span>Skeleton</span>;
 * return <SparkleEffect />;
 */
export function useReducedMotion(): boolean {
  const [prefers, setPrefers] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (event: MediaQueryListEvent) => setPrefers(event.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return prefers;
}
