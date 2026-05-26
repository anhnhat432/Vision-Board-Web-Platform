import { useEffect, useState } from "react";
import { Check, Sparkles, Target } from "lucide-react";

import { useReducedMotion } from "@/app/hooks/useReducedMotion";

/**
 * P2-04 Hero Mockup Live Animation.
 *
 * Loops a 4-phase narrative every ~6s on the public landing hero:
 *  - phase 0 (0ms)    : initial state, 1/3 task done, progress 33%
 *  - phase 1 (700ms)  : task #2 ticks, line-through animates in
 *  - phase 2 (1500ms) : progress fills 33% → 67%
 *  - phase 3 (2400ms) : "Streak +1" badge slides in from right
 *  - phase 4 (4000ms) : badge fades out
 *  - reset (5800ms)   : back to phase 0
 *
 * Reduced motion: render the final state (phase 3) statically, no loop.
 */

const PHASE_SCHEDULE = [700, 1500, 2400, 4000] as const;
const RESET_DELAY = 5800;

export function HeroMockupAnimated() {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (reduced) {
      setPhase(3);
      return;
    }

    const timers: number[] = [];
    PHASE_SCHEDULE.forEach((delay, i) => {
      timers.push(window.setTimeout(() => setPhase(i + 1), delay));
    });
    timers.push(window.setTimeout(() => setPhase(0), RESET_DELAY));

    const loop = window.setInterval(() => {
      // Re-run the schedule by toggling state through a fresh cycle.
      // The cleanup below will clear pending timers, so this only fires
      // once the previous cycle has finished.
      setPhase(0);
      PHASE_SCHEDULE.forEach((delay, i) => {
        timers.push(window.setTimeout(() => setPhase(i + 1), delay));
      });
    }, RESET_DELAY + 200);

    return () => {
      timers.forEach(window.clearTimeout);
      window.clearInterval(loop);
    };
  }, [reduced]);

  const taskTwoChecked = phase >= 1;
  const progressFilled = phase >= 2;
  const badgeVisible = phase >= 3 && phase < 4;

  return (
    <div className="appear-fade-up mx-auto w-full max-w-[360px] lg:mx-0 lg:max-w-none lg:[animation-delay:120ms]">
      <div className="surface-elevated relative rounded-2xl border border-app-line bg-app-surface p-5 lg:rotate-1">
        {/* Streak badge — slides in from right around phase 3.
         * Uses accent palette (NOT warm) to keep the hero on a single
         * forest-green tone — the project design philosophy reserves
         * terracotta exclusively for reflection surfaces. */}
        <div
          aria-hidden="true"
          className={`absolute -top-2 right-3 inline-flex items-center gap-1 rounded-full bg-app-accent-soft px-2.5 py-1 text-xs font-medium text-app-accent shadow-[0_4px_12px_-4px_rgba(47,93,80,0.22)] transition-all duration-medium ease-emphasized ${
            badgeVisible ? "translate-x-0 scale-100 opacity-100" : "translate-x-3 scale-95 opacity-0"
          }`}
        >
          <Sparkles className="size-3" />
          Streak +1
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-app-accent-soft text-app-accent">
              <Target className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">Mục tiêu</p>
              <p className="truncate text-xs font-medium text-app-ink">Đọc 12 cuốn sách trong năm</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-app-accent-soft px-2.5 py-0.5 text-xs font-semibold text-app-accent">
            Tuần 4/12
          </span>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-app-ink-soft">
            <span>Tiến độ chu kỳ</span>
            <span className="font-semibold tabular-nums text-app-accent">{progressFilled ? 67 : 33}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-app-bg">
            <div
              className="h-full rounded-full bg-app-accent transition-[width] duration-slow ease-decelerate"
              style={{ width: progressFilled ? "67%" : "33%" }}
            />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">
            Việc hôm nay · {taskTwoChecked ? "8" : "7"}/14
          </p>
          <div className="space-y-1.5">
            {/* Task 1 — always done */}
            <div className="flex items-center gap-2">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] bg-app-accent text-white">
                <Check className="h-2.5 w-2.5" />
              </span>
              <span className="text-xs text-app-ink-muted line-through">Đọc 30 trang "Atomic Habits"</span>
            </div>

            {/* Task 2 — ticks at phase 1 */}
            <div className="flex items-center gap-2">
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] transition-all duration-base ease-decelerate ${
                  taskTwoChecked
                    ? "border-0 bg-app-accent text-white"
                    : "border border-app-line bg-transparent text-transparent"
                }`}
              >
                <Check
                  className={`h-2.5 w-2.5 transition-transform duration-base ease-decelerate ${
                    taskTwoChecked ? "scale-100" : "scale-50"
                  }`}
                />
              </span>
              <span
                className={`text-xs transition-colors duration-base ease-standard ${
                  taskTwoChecked ? "text-app-ink-muted line-through" : "text-app-ink"
                }`}
              >
                Ghi 3 dòng phản tư
              </span>
            </div>

            {/* Task 3 — never ticks in this loop */}
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 shrink-0 rounded-[4px] border border-app-line" aria-hidden="true" />
              <span className="text-xs text-app-ink">Review tuần lúc 21h</span>
            </div>
          </div>
        </div>

        <p className="mt-4 border-t border-app-line pt-3 text-xs italic text-app-ink-muted">
          Ảnh chụp giao diện · dữ liệu mô phỏng
        </p>
      </div>
    </div>
  );
}
