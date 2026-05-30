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

export interface GoalPreviewData {
  id: string;
  goalTitle: string;
  visionIcons: { emoji: string; bgClass: string; borderClass: string }[];
  visionLabel: string;
  todayTasks: [string, string, string];
  weekLabel: string;
}

const PHASE_SCHEDULE = [700, 1500, 2400, 4000] as const;
const RESET_DELAY = 5800;

const DEFAULT_PREVIEW: GoalPreviewData = {
  id: "default",
  goalTitle: "Đọc 12 cuốn sách trong năm",
  visionIcons: [
    { emoji: "📚", bgClass: "bg-emerald-800/10", borderClass: "border-emerald-800/20" },
    { emoji: "🏃‍♂️", bgClass: "bg-amber-800/10", borderClass: "border-amber-800/20" },
    { emoji: "💼", bgClass: "bg-blue-800/10", borderClass: "border-blue-800/20" },
  ],
  visionLabel: "\"Khát vọng tương lai\"",
  todayTasks: ["Đọc 30 trang \"Atomic Habits\"", "Ghi 3 dòng phản tư", "Review tuần lúc 21h"],
  weekLabel: "Tuần 4/12",
};

interface HeroMockupAnimatedProps {
  previewData?: GoalPreviewData;
}

export function HeroMockupAnimated({ previewData }: HeroMockupAnimatedProps) {
  const data = previewData ?? DEFAULT_PREVIEW;
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (reduced) {
      setPhase(3);
      return;
    }

    let activeTimers: number[] = [];

    const runCycle = () => {
      // Clear any timers from the previous cycle
      activeTimers.forEach(window.clearTimeout);
      activeTimers = [];

      setPhase(0);

      PHASE_SCHEDULE.forEach((delay, i) => {
        activeTimers.push(
          window.setTimeout(() => setPhase(i + 1), delay)
        );
      });

      // Reset to phase 0 at 5800ms
      activeTimers.push(
        window.setTimeout(() => setPhase(0), RESET_DELAY)
      );

      // Start next cycle at 6000ms (RESET_DELAY + 200)
      activeTimers.push(
        window.setTimeout(() => runCycle(), RESET_DELAY + 200)
      );
    };

    runCycle();

    return () => {
      activeTimers.forEach(window.clearTimeout);
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
          className={`absolute -top-2 right-3 inline-flex items-center gap-1 rounded-full bg-app-accent-soft px-2.5 py-1 text-xs font-medium text-app-accent shadow-[0_4px_12px_-4px_rgba(47,93,80,0.22)] transition-all duration-medium ${
            badgeVisible ? "translate-x-0 scale-100 opacity-100" : "translate-x-3 scale-95 opacity-0"
          }`}
          style={{
            transitionTimingFunction: badgeVisible ? "var(--ease-overshoot)" : "ease-in"
          }}
        >
          <Sparkles className="size-3" />
          Streak +1
        </div>

        {/* Inspiration Vision Board Snippet */}
        <div className="mb-4 rounded-xl border border-app-line bg-app-bg-subtle/40 dark:bg-neutral-900/30 p-3 flex items-center gap-3">
          <div className="flex -space-x-2 shrink-0 select-none">
            {data.visionIcons.map((icon, i) => (
              <div
                key={icon.emoji}
                className={`h-9 w-9 rounded-lg ${icon.bgClass} border ${icon.borderClass} flex items-center justify-center text-sm shadow-sm ${i === 1 ? "rotate-3" : i === 2 ? "-rotate-3" : ""}`}
              >{icon.emoji}</div>
            ))}
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-app-accent">Bảng tầm nhìn</p>
            <p className="truncate text-xs font-bold text-app-ink-soft">{data.visionLabel}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-app-accent-soft text-app-accent">
              <Target className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">Mục tiêu</p>
              <p className="truncate text-xs font-medium text-app-ink">{data.goalTitle}</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-app-accent-soft px-2.5 py-0.5 text-xs font-semibold text-app-accent">
            {data.weekLabel}
          </span>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-app-ink-soft">
            <span>Tiến độ chu kỳ</span>
            <span className="font-semibold tabular-nums text-app-accent">{progressFilled ? 67 : 33}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-app-bg">
            <div
              className={`h-full rounded-full bg-app-accent transition-[width,box-shadow] duration-slow ease-decelerate ${
                progressFilled ? "shadow-[0_0_8px_rgba(47,93,80,0.4)]" : ""
              }`}
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
              <span className="text-xs text-app-ink-muted line-through">{data.todayTasks[0]}</span>
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
                {data.todayTasks[1]}
              </span>
            </div>

            {/* Task 3 — never ticks in this loop */}
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 shrink-0 rounded-[4px] border border-app-line" aria-hidden="true" />
              <span className="text-xs text-app-ink">{data.todayTasks[2]}</span>
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
