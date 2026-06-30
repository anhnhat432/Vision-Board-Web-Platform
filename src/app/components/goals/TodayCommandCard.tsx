/**
 * TodayCommandCard — Signature moment của /goals (Command Center Studio)
 *
 * Editorial card lớn full-width với:
 * - Hình ảnh góc làm việc lớn (visual anchor cảm xúc)
 * - Progress ring lớn với draw-on animation
 * - Mini week roadmap (12 dots)
 * - Inline task checkbox
 * - CTA outcome-based
 *
 * Contract: SpotlightFocusData interface giữ nguyên.
 */

import { ArrowRight, Circle, Target, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/utils";
import {
  getLifeAreaLabel,
  getTwelveWeekCurrentWeek,
  getTwelveWeekTodayTasks,
  type Goal,
  type TwelveWeekTaskInstance,
} from "@/app/utils/storage";

export interface SpotlightFocusData {
  goal: Goal;
  progress: number;
  isOverdue: boolean;
  isNearDeadline: boolean;
  isTwelveWeek: boolean;
  type: "today_tasks" | "review_due" | "due_warning" | "first_active_12week";
}

interface TodayCommandCardProps {
  focusData: SpotlightFocusData | null;
  openTwelveWeekCenter: (goalId: string) => void;
  handleToggleTask: (goalId: string, taskId: string) => void;
  onStartGuidedGoalFlow: () => void;
}

export function TodayCommandCard({
  focusData,
  openTwelveWeekCenter,
  handleToggleTask,
  onStartGuidedGoalFlow,
}: TodayCommandCardProps) {
  if (!focusData) {
    return <CommandEmptyState onStartGuidedGoalFlow={onStartGuidedGoalFlow} />;
  }

  const { goal, progress, isTwelveWeek, type } = focusData;
  const system = goal.twelveWeekSystem;
  const systemCurrentWeek = system ? getTwelveWeekCurrentWeek(system) : null;

  let recommendedAction = "";
  let ctaLabel = "Tiếp tục chu kỳ";
  let showTaskCheckbox = false;
  let firstOpenTask: TwelveWeekTaskInstance | null = null;

  if (isTwelveWeek && system) {
    const todayTasks = getTwelveWeekTodayTasks(system);
    firstOpenTask = todayTasks.find((t) => !t.completed) || null;
  }

  if (type === "today_tasks" && firstOpenTask) {
    recommendedAction = "Việc nhỏ nhất bạn có thể chốt hôm nay";
    showTaskCheckbox = true;
  } else if (type === "review_due") {
    recommendedAction = "Đã đến ngày đánh giá tuần này";
    ctaLabel = "Đánh giá tuần";
  } else if (type === "due_warning") {
    recommendedAction = "Mục tiêu sắp hoặc đã trễ hạn";
    ctaLabel = isTwelveWeek ? "Tiếp tục chu kỳ" : "Xem chi tiết";
  } else {
    recommendedAction = isTwelveWeek
      ? "Lên kế hoạch hành động cho tuần này"
      : "Cập nhật các nhiệm vụ của bạn";
    ctaLabel = isTwelveWeek ? "Tiếp tục chu kỳ" : "Xem chi tiết";
  }

  const handleCtaClick = () => {
    if (isTwelveWeek) {
      openTwelveWeekCenter(goal.id);
    } else {
      const el = document.getElementById(`goal-fleet-${goal.id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-app-accent/40");
        setTimeout(() => el.classList.remove("ring-2", "ring-app-accent/40"), 2000);
      }
    }
  };

  return (
    <section
      className="relative rounded-card-lg overflow-hidden border border-app-line bg-app-surface shadow-app-card"
      aria-label="Tiêu điểm hôm nay"
    >
      {/* Subtle gradient overlay */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-app-accent-subtle/20 via-transparent to-transparent pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 p-5 sm:p-7 lg:p-8">
        {/* Top row: label + meta */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-app-accent opacity-30 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-app-accent" />
            </span>
            <p className="text-[11px] font-bold uppercase tracking-widest text-app-accent">
              Tiêu điểm hôm nay
            </p>
          </div>
          {isTwelveWeek && systemCurrentWeek && (
            <span className="rounded-full bg-app-accent-soft px-3 py-1 text-xs font-bold text-app-accent tabular-nums">
              Tuần {systemCurrentWeek}/12
            </span>
          )}
        </div>

        {/* Main content: 3-column on desktop */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-8">
          {/* Left: Goal info + action (flex-1) */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Goal title */}
            <div className="space-y-1.5">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold leading-snug text-app-ink text-balance break-words">
                {goal.title}
              </h2>
              <p className="text-sm text-app-ink-soft font-medium">
                <span className="font-semibold text-app-accent">
                  {getLifeAreaLabel(goal.category)}
                </span>
                {isTwelveWeek && systemCurrentWeek && (
                  <>
                    <span className="mx-1.5 text-app-ink-muted" aria-hidden="true">·</span>
                    <span>Chu kỳ 12 tuần</span>
                  </>
                )}
              </p>
            </div>

            {/* Action area */}
            <div className="space-y-3">
              {showTaskCheckbox && firstOpenTask ? (
                <TaskCommand
                  goalId={goal.id}
                  task={firstOpenTask}
                  onToggle={handleToggleTask}
                />
              ) : (
                <p className="text-sm text-app-ink-soft leading-relaxed flex items-start gap-2">
                  <Zap className="h-4 w-4 text-app-accent shrink-0 mt-0.5" aria-hidden="true" />
                  {recommendedAction}
                </p>
              )}
            </div>

            {/* CTA */}
            <Button
              onClick={handleCtaClick}
              className={cn(
                "rounded-full font-bold shadow-app-md transition-all duration-200",
                "bg-app-accent text-white hover:bg-app-accent-hover",
                "px-6 py-3 text-sm",
                "flex items-center gap-2",
                "motion-safe:hover:scale-[1.02]",
                "whitespace-nowrap",
              )}
            >
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Center: Progress ring + Week roadmap */}
          <div className="flex flex-row lg:flex-col items-center gap-5 lg:gap-4 shrink-0">
            <AnimatedProgressRing value={progress} size={140} strokeWidth={8} />
            {isTwelveWeek && (
              <MiniWeekRoadmap
                currentWeek={systemCurrentWeek ?? 1}
                progress={progress}
              />
            )}
          </div>

          {/* Right: Study desk image */}
          <div className="hidden lg:block shrink-0 w-[200px]">
            <div
              className="w-full aspect-[3/4] rounded-card overflow-hidden"
              style={{ outline: "1px solid rgba(23, 21, 15, 0.08)", outlineOffset: "-1px" }}
            >
              <img
                src="/study_desk_corner.png"
                alt=""
                className="w-full h-full object-cover transition-transform duration-700 motion-safe:group-hover:scale-105"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Animated Progress Ring SVG with draw-on ─── */

interface ProgressRingProps {
  value: number;
  size: number;
  strokeWidth: number;
}

function AnimatedProgressRing({ value, size, strokeWidth }: ProgressRingProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Animate from 0 to value on mount
    const duration = 900;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - (1 - progress) ** 3;
      setAnimatedValue(Math.round(eased * value));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setAnimatedValue(value);
    } else {
      rafRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedValue / 100) * circumference;

  const isCompleted = value === 100;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-app-accent-soft"
        />
        {/* Fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(
            "transition-colors duration-300",
            isCompleted ? "text-app-status-success" : "text-app-accent",
          )}
        />
      </svg>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            "text-2xl font-bold tabular-nums leading-none",
            isCompleted ? "text-app-status-success" : "text-app-ink",
          )}
        >
          {animatedValue}%
        </span>
        <span className="text-[10px] text-app-ink-muted mt-1">hoàn thành</span>
      </div>
    </div>
  );
}

/* ─── Mini Week Roadmap — 12 dots grid ─── */

interface MiniWeekRoadmapProps {
  currentWeek: number;
  progress: number;
}

function MiniWeekRoadmap({ currentWeek, progress }: MiniWeekRoadmapProps) {
  const weeks = Array.from({ length: 12 }, (_, i) => i + 1);
  const completedWeeks = Math.floor((progress / 100) * 12);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="grid grid-cols-6 gap-2">
        {weeks.map((week, index) => {
          const isCompleted = week <= completedWeeks;
          const isCurrent = week === currentWeek;
          return (
            <div
              key={week}
              className={cn(
                "h-4 w-4 rounded-full transition-all duration-300",
                isCompleted
                  ? "bg-app-accent scale-100"
                  : isCurrent
                    ? "bg-app-accent/50 ring-2 ring-app-accent/30 scale-110"
                    : "bg-app-line scale-90",
              )}
              style={{
                animationDelay: `${index * 30}ms`,
              }}
              aria-hidden="true"
            />
          );
        })}
      </div>
      <span className="text-[11px] font-medium text-app-ink-muted tabular-nums">
        Tuần {currentWeek}/12
      </span>
    </div>
  );
}

/* ─── Task Command — inline action for today's task ─── */

interface TaskCommandProps {
  goalId: string;
  task: TwelveWeekTaskInstance;
  onToggle: (goalId: string, taskId: string) => void;
}

function TaskCommand({ goalId, task, onToggle }: TaskCommandProps) {
  return (
    <div className="flex items-center gap-3 rounded-control border border-app-line bg-app-bg-subtle px-4 py-3 transition-all duration-200 w-full sm:w-auto sm:max-w-md motion-safe:hover:shadow-app-sm">
      <button
        type="button"
        onClick={() => onToggle(goalId, task.id)}
        className="flex shrink-0 items-center justify-center min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 rounded-lg motion-safe:hover:scale-105 transition-transform duration-150"
        aria-label={`Chốt việc: ${task.title}`}
      >
        <span className="flex size-[22px] items-center justify-center rounded-full border-2 border-app-accent hover:bg-app-accent/10 transition-all duration-200">
          <Circle className="size-3.5 text-app-ink-muted hover:text-app-accent shrink-0 opacity-0" />
        </span>
      </button>
      <span className="truncate text-sm font-semibold text-app-ink">
        {task.title}
      </span>
    </div>
  );
}

/* ─── Empty state when no focus ─── */

interface CommandEmptyStateProps {
  onStartGuidedGoalFlow: () => void;
}

function CommandEmptyState({ onStartGuidedGoalFlow }: CommandEmptyStateProps) {
  return (
    <section
      className="relative rounded-card-lg border border-dashed border-app-line bg-app-surface p-8 sm:p-10 shadow-app-sm text-center overflow-hidden"
      aria-label="Tiêu điểm hôm nay"
    >
      <div className="relative z-10 space-y-4 py-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-app-accent-soft text-app-accent motion-safe:animate-bounce">
          <Target className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h3 className="font-serif text-xl font-bold text-app-ink text-balance">
            Sẵn sàng cho mục tiêu tiếp theo
          </h3>
          <p className="text-sm text-app-ink-soft leading-relaxed max-w-sm mx-auto">
            Chưa có việc nào cần xử lý ngay. Bắt đầu một chu kỳ 12 tuần mới để tạo tiêu điểm hành động.
          </p>
        </div>
        <Button
          onClick={onStartGuidedGoalFlow}
          className="bg-app-accent hover:bg-app-accent-hover text-white text-sm font-bold rounded-full px-6 py-3 shadow-app-md motion-safe:hover:scale-[1.02] transition-all duration-200"
        >
          <Zap className="h-4 w-4 mr-1.5" />
          Bắt đầu chu kỳ 12 tuần
        </Button>
      </div>
    </section>
  );
}