import confetti from "canvas-confetti";

import { useReducedMotion } from "@/app/hooks/useReducedMotion";

interface CelebrationOrigin {
  /** Horizontal viewport position (0 left → 1 right). Defaults to 0.5. */
  x?: number;
  /** Vertical viewport position (0 top → 1 bottom). Defaults to 0.55. */
  y?: number;
}

const CELEBRATION_PALETTE = ["#2F5D50", "#D97757", "#5BA590", "#E89878", "#F3D9CC"] as const;

/**
 * P2-10 Celebration Moments.
 *
 * Imperative confetti burst tuned to the project palette + Calm
 * Productivity vibe (subtle particle count, light gravity, short
 * duration). Respects `prefers-reduced-motion`.
 *
 * Use via the `useCelebration` hook — direct calls are also fine for
 * one-off triggers (e.g. inside an onSubmit handler that already has
 * the click coordinate).
 */
export function fireCelebration(origin?: CelebrationOrigin): void {
  if (typeof window === "undefined") return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  void confetti({
    particleCount: 25,
    spread: 60,
    startVelocity: 25,
    gravity: 0.8,
    ticks: 80,
    scalar: 0.8,
    colors: CELEBRATION_PALETTE as unknown as string[],
    origin: { x: origin?.x ?? 0.5, y: origin?.y ?? 0.55 },
  });
}

/** React-friendly wrapper that no-ops when the user prefers reduced motion. */
export function useFireCelebration(): (origin?: CelebrationOrigin) => void {
  const reduce = useReducedMotion();
  return (origin) => {
    if (reduce) return;
    fireCelebration(origin);
  };
}
