import confetti from "canvas-confetti";

import { useReducedMotion } from "@/app/hooks/useReducedMotion";

interface CelebrationOrigin {
  /** Horizontal viewport position (0 left → 1 right). Defaults to 0.5. */
  x?: number;
  /** Vertical viewport position (0 top → 1 bottom). Defaults to 0.55. */
  y?: number;
}

/** Which design surface the celebration belongs to.
 *
 * Project design philosophy reserves the terracotta family for
 * Reflection-only surfaces. Productivity wins (goal/week complete,
 * todo cleared) live in the forest-green family. Pick the right
 * palette for the moment so the confetti doesn't bleed warm into
 * non-reflective contexts.
 */
export type CelebrationPalette = "accent" | "warm";

const ACCENT_PALETTE = ["#2F5D50", "#5BA590", "#7DBFA9", "#E8F0EC", "#FFFFFF"] as const;
const WARM_PALETTE = ["#D97757", "#E89878", "#F0B091", "#F3D9CC", "#FCEDE5"] as const;

interface FireCelebrationOptions extends CelebrationOrigin {
  /** Defaults to "accent" (productivity tone). */
  palette?: CelebrationPalette;
}

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
export function fireCelebration(options?: FireCelebrationOptions): void {
  if (typeof window === "undefined") return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  const palette = options?.palette === "warm" ? WARM_PALETTE : ACCENT_PALETTE;

  void confetti({
    particleCount: 25,
    spread: 60,
    startVelocity: 25,
    gravity: 0.8,
    ticks: 80,
    scalar: 0.8,
    colors: palette as unknown as string[],
    origin: { x: options?.x ?? 0.5, y: options?.y ?? 0.55 },
  });
}

/** React-friendly wrapper that no-ops when the user prefers reduced motion. */
export function useFireCelebration(): (options?: FireCelebrationOptions) => void {
  const reduce = useReducedMotion();
  return (options) => {
    if (reduce) return;
    fireCelebration(options);
  };
}
