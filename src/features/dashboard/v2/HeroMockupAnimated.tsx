import { Check, Sparkles, Target } from "lucide-react";
import { useEffect, useState } from "react";

import { useReducedMotion } from "@/app/hooks/useReducedMotion";

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
    { emoji: "📚", bgClass: "bg-app-accent-soft/50", borderClass: "border-app-accent/20" },
    { emoji: "🏃‍♂️", bgClass: "bg-app-status-warning/10", borderClass: "border-app-status-warning/20" },
    { emoji: "💼", bgClass: "bg-blue-800/10", borderClass: "border-blue-800/20" },
  ],
  visionLabel: '"Khát vọng tương lai"',
  todayTasks: ['Đọc 30 trang "Atomic Habits"', "Ghi 3 dòng phản tư", "Review tuần lúc 21h"],
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
        activeTimers.push(window.setTimeout(() => setPhase(i + 1), delay));
      });

      // Reset to phase 0 at 5800ms
      activeTimers.push(window.setTimeout(() => setPhase(0), RESET_DELAY));

      // Start next cycle at 6000ms (RESET_DELAY + 200)
      activeTimers.push(window.setTimeout(() => runCycle(), RESET_DELAY + 200));
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
    <div className="appear-fade-up mx-auto w-full max-w-[440px] lg:mx-0 lg:max-w-md lg:[animation-delay:120ms]">
      {/* SaaS Browser Shell Container */}
      <div className="relative rounded-2xl border border-app-line/80 bg-app-surface shadow-[0_24px_50px_-12px_rgba(47,93,80,0.12),0_8px_24px_-8px_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-300">
        {/* Browser Header Bar */}
        <div className="flex items-center justify-between bg-app-bg-subtle/80 backdrop-blur-md px-4 py-3 border-b border-app-line/65 select-none">
          {/* Mac-style Window Dot Controls */}
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#FF5F56]/90 shadow-sm" />
            <span className="h-3 w-3 rounded-full bg-[#FFBD2E]/90 shadow-sm" />
            <span className="h-3 w-3 rounded-full bg-[#27C93F]/90 shadow-sm" />
          </div>
          {/* Fake URL Bar */}
          <div className="bg-app-surface border border-app-line/60 rounded-md px-4 py-0.5 text-[10px] text-app-ink-muted/80 font-mono tracking-wide text-center w-48 truncate">
            dearourfuture.com/dashboard
          </div>
          {/* Small Empty Space to Balance Dot controls */}
          <div className="w-12" />
        </div>

        {/* Browser Page Body: Dashboard Mockup */}
        <div className="relative p-6 bg-gradient-to-b from-app-surface/40 via-app-surface to-app-surface min-h-[340px]">
          {/* Floating Streak Badge - elegant glass badge popping from the corner */}
          <div
            aria-hidden="true"
            className={`absolute top-4 right-4 z-20 inline-flex items-center gap-1.5 rounded-full bg-app-accent/10 px-3 py-1 text-[10px] font-semibold text-app-accent shadow-sm border border-app-accent/20 transition-all duration-500 ${
              badgeVisible ? "translate-y-0 scale-100 opacity-100" : "-translate-y-2 scale-95 opacity-0"
            }`}
            style={{
              transitionTimingFunction: badgeVisible ? "var(--ease-overshoot)" : "ease-in",
            }}
          >
            <Sparkles className="size-3 text-app-accent animate-spin-slow" />
            Streak +1 Ngày!
          </div>

          {/* Grid Layout: Vision Canvas & Focus Plan */}
          <div className="grid grid-cols-1 xs:grid-cols-12 gap-5">
            {/* Left Column (Span 5): Mini Vision Board Pins (Polaroid Vibe) */}
            <div className="xs:col-span-5 flex flex-col justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-app-accent mb-3">Tầm nhìn của tôi</p>
                <div className="relative h-32 w-full select-none">
                  {/* Polaroid Card 1: Books */}
                  <div className="absolute top-0 left-0 w-28 bg-app-surface p-2 rounded shadow-md border border-app-line/50 -rotate-[6deg] transition-transform hover:rotate-0 duration-300">
                    <div className="h-16 w-full rounded bg-app-accent-soft/50 flex items-center justify-center text-xl">
                      📚
                    </div>
                    <p className="text-[9px] text-center font-medium mt-1.5 text-app-ink-soft">12 cuốn sách</p>
                  </div>
                  {/* Polaroid Card 2: Runner */}
                  <div className="absolute top-4 left-6 w-28 bg-app-surface p-2 rounded shadow-lg border border-app-line/60 rotate-[4deg] transition-transform hover:rotate-0 duration-300">
                    <div className="h-16 w-full rounded bg-app-status-warning/10 flex items-center justify-center text-xl">
                      🏃‍♂️
                    </div>
                    <p className="text-[9px] text-center font-medium mt-1.5 text-app-ink-soft">Chạy bộ 5km</p>
                  </div>
                </div>
              </div>
              <div className="mt-3 p-2 bg-app-accent-soft/30 dark:bg-app-accent-soft/5 border border-app-accent/15 rounded-lg">
                <span className="text-[8px] font-semibold uppercase text-app-accent tracking-wider block">
                  Châm ngôn
                </span>
                <p className="text-[10px] font-serif italic text-app-ink-soft leading-snug mt-0.5">
                  {data.visionLabel}
                </p>
              </div>
            </div>

            {/* Right Column (Span 7): Today Focus Execution */}
            <div className="xs:col-span-7 space-y-4">
              {/* Target & Week progress */}
              <div className="p-3.5 bg-app-bg-subtle border border-app-line/65 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-app-ink-muted">
                    Chu kỳ hiện tại
                  </span>
                  <span className="rounded-full bg-app-accent/10 px-2 py-0.5 text-[9px] font-semibold text-app-accent border border-app-accent/10">
                    {data.weekLabel}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-app-ink mt-1.5 truncate flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-app-accent shrink-0" />
                  {data.goalTitle}
                </h4>

                {/* 12-Week Mini Progress Bar */}
                <div className="mt-3.5 pt-2 border-t border-app-line/45">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-app-ink-soft">Tiến độ</span>
                    <span className="font-bold text-app-accent tabular-nums">{progressFilled ? 67 : 33}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-app-bg-subtle/70 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-app-accent transition-all duration-1000 ease-out"
                      style={{ width: progressFilled ? "67%" : "33%" }}
                    />
                  </div>
                </div>
              </div>

              {/* Tasks Checklist */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-app-ink-muted">
                    Hành động hôm nay
                  </p>
                  <span className="text-[9px] font-semibold text-app-accent tabular-nums bg-app-accent-soft px-1.5 py-0.5 rounded">
                    {taskTwoChecked ? "2" : "1"}/3 Hoàn thành
                  </span>
                </div>

                <div className="space-y-2">
                  {/* Task 1: Always completed */}
                  <div className="flex items-center gap-2.5 p-2 bg-app-bg-subtle/50 border border-app-line/40 rounded-lg">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-app-accent text-white shadow-sm">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                    <span className="text-xs text-app-ink-muted line-through font-medium opacity-65 truncate">
                      {data.todayTasks[0]}
                    </span>
                  </div>

                  {/* Task 2: Animates checking in/out */}
                  <div className="flex items-center gap-2.5 p-2 bg-app-surface border border-app-line/80 rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-all duration-300">
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all duration-500 ${
                        taskTwoChecked
                          ? "border-transparent bg-app-accent text-white shadow-sm"
                          : "border-app-line bg-app-surface text-transparent"
                      }`}
                    >
                      <Check
                        className={`h-2.5 w-2.5 transition-transform duration-500 ${
                          taskTwoChecked ? "scale-100" : "scale-50"
                        }`}
                        strokeWidth={3}
                      />
                    </span>
                    <span
                      className={`text-xs font-semibold truncate transition-colors duration-500 ${
                        taskTwoChecked ? "text-app-ink-muted line-through opacity-65" : "text-app-ink"
                      }`}
                    >
                      {data.todayTasks[1]}
                    </span>
                  </div>

                  {/* Task 3: Uncompleted */}
                  <div className="flex items-center gap-2.5 p-2 bg-app-surface border border-app-line/80 rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                    <span
                      className="h-4 w-4 shrink-0 rounded-full border border-app-line bg-app-surface"
                      aria-hidden="true"
                    />
                    <span className="text-xs font-medium text-app-ink truncate">{data.todayTasks[2]}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Minimalist status bar footer */}
          <div className="mt-6 pt-3 border-t border-app-line/45 flex items-center justify-between text-[9px] text-app-ink-muted/65 font-medium">
            <span>● Đồng bộ đám mây cục bộ</span>
            <span>Vite SPA v2.1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
