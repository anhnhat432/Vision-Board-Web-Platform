import { useCallback } from "react";
import { toast } from "sonner";
import { soundService } from "../../services/soundService";

import { type CelebrationPalette, fireCelebration } from "./fireCelebration";
import { type MilestoneKind, MilestoneToast } from "./MilestoneToast";

interface CelebrationPayload {
  /** Identifier so the same milestone is only celebrated once per session. */
  id: string;
  /** Headline shown in the toast (e.g. "Streak 7 ngày"). */
  title: string;
  /** Optional secondary line. */
  description?: string;
  /** Should we fire confetti? Defaults to true for "big" milestones below. */
  withConfetti?: boolean;
  /** Click origin for the confetti burst, viewport-relative (0..1). */
  origin?: { x?: number; y?: number };
  /** Override the palette inferred from `kind`. */
  palette?: CelebrationPalette;
}

const SESSION_KEY_PREFIX = "vb-celebrate:";

/** Milestone kinds where the default behavior is "fire confetti". */
const BIG_MILESTONE_KINDS: ReadonlySet<MilestoneKind> = new Set<MilestoneKind>(["goal", "week", "achievement"]);

/** Project design philosophy: warm (terracotta) is reserved for reflection
 * surfaces. Streak + achievement carry a reflective tone — the user is
 * reviewing time spent, not racking a productivity win — so they get the
 * warm palette. Goal completion, week wrap-up, and "all today's tasks done"
 * stay on the productivity (accent / forest green) palette. */
const PALETTE_BY_KIND: Record<MilestoneKind, CelebrationPalette> = {
  "today-complete": "accent",
  goal: "accent",
  week: "accent",
  streak: "warm",
  achievement: "warm",
};

/**
 * P2-10 Celebration Moments — orchestrator.
 *
 * Returns a `trigger(kind, payload)` callback that:
 *  1. De-duplicates via sessionStorage keyed by `${kind}:${payload.id}` —
 *     reload won't celebrate the same milestone twice.
 *  2. Fires a sonner toast rendered by `<MilestoneToast />`.
 *  3. Fires confetti for "big" milestones (goal, week, achievement) or
 *     anything where `payload.withConfetti === true`. Palette is picked
 *     by `kind` (accent for productivity, warm for reflection) unless
 *     `payload.palette` overrides it.
 *
 * Caller-side check (cooldown / streak math) lives in domain hooks. This
 * hook is intentionally dumb: it just orchestrates the visual side.
 *
 * @example
 * const celebrate = useCelebration();
 *
 * function onTaskCompleteAll() {
 *   celebrate("today-complete", {
 *     id: new Date().toDateString(),
 *     title: "Trọn vẹn một ngày",
 *     description: "Bạn đã xong hết việc hôm nay.",
 *   });
 * }
 */
export function useCelebration() {
  return useCallback((kind: MilestoneKind, payload: CelebrationPayload): boolean => {
    if (typeof window === "undefined") return false;

    const sessionKey = `${SESSION_KEY_PREFIX}${kind}:${payload.id}`;
    try {
      if (window.sessionStorage.getItem(sessionKey)) return false;
      window.sessionStorage.setItem(sessionKey, "1");
    } catch {
      // sessionStorage may be unavailable (private mode); proceed without
      // dedupe rather than silently dropping the celebration.
    }

    const shouldFireConfetti = payload.withConfetti ?? BIG_MILESTONE_KINDS.has(kind);
    if (shouldFireConfetti) {
      fireCelebration({
        ...payload.origin,
        palette: payload.palette ?? PALETTE_BY_KIND[kind],
      });
      soundService.success();
    } else {
      soundService.click();
    }

    toast.custom(() => <MilestoneToast kind={kind} title={payload.title} description={payload.description} />, {
      duration: 4000,
    });

    return true;
  }, []);
}
