/**
 * TodayCommandCard — Signature moment của /goals (Command Center concept)
 *
 * Card lớn chiếm ~60% viewport, hiển thị:
 * - Mục tiêu cần hành động nhất hôm nay
 * - Việc hôm nay đầu tiên (checkbox inline)
 * - Progress ring SVG
 * - CTA duy nhất
 *
 * Khi không có focus → empty state inviting.
 *
 * Contract: SpotlightFocusData interface giữ nguyên.
 */

import { ArrowRight, Circle, Target, Zap } from "lucide-react";
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
      className="relative rounded-card-lg overflow-hidden border border-app-accent/20 bg-app-surface shadow-app-card"
      aria-label="Tiêu điểm hôm nay"
    >
      {/* Accent gradient — larger, more visible */}
      <div
        className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-app-accent-subtle/50 via-app-accent-subtle/20 to-transparent rounded-bl-full pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 p-6 sm:p-8 lg:p-10">
        {/* Top row: label + meta */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-app-accent opacity-30 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-app-accent" />
            </span>
            <p className="text-xs font-bold text-app-accent">
              Tiêu điểm hôm nay
            </p>
          </div>
          {isTwelveWeek && systemCurrentWeek && (
            <span className="rounded-full bg-app-accent-soft px-3 py-1 text-xs font-bold text-app-accent tabular-nums">
              Tuần {systemCurrentWeek}/12
            </span>
          )}
        </div>

        {/* Main content: 2-column on desktop */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-10">
          {/* Left: Goal info + action */}
          <div className="flex-1 min-w-0 space-y-5">
            {/* Goal title */}
            <div className="space-y-2">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold leading-snug text-app-ink break-words">
                {goal.title}
              </h2>
              <p className="text-sm text-app-ink-soft font-medium">
                <span className="font-semibold text-app-accent">
                  {getLifeAreaLabel(goal.category)}
                </span>
                {isTwelveWeek && systemCurrentWeek && (
                  <>
                    <span className="mx-2 text-app-ink-muted" aria-hidden="true">·</span>
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
                <p className="text-sm text-app-ink-soft leading-relaxed flex items-start gap-2.5">
                  <Zap className="h-4 w-4 text-app-accent shrink-0 mt-0.5" aria-hidden="true" />
                  {recommendedAction}
                </p>
              )}
            </div>
          </div>

          {/* Right: Journey illustration + Progress ring + CTA */}
          <div className="flex flex-row lg:flex-col items-center gap-6 lg:gap-5 shrink-0">
            {/* Journey illustration */}
            <JourneyIllustration progress={progress} />

            {/* CTA — larger */}
            <Button
              onClick={handleCtaClick}
              className={cn(
                "rounded-full font-bold shadow-app-md transition-all duration-200",
                "bg-app-accent text-white hover:bg-app-accent-hover",
                "px-6 py-3.5 text-sm",
                "flex items-center gap-2",
                "motion-safe:hover:scale-[1.03]",
                "whitespace-nowrap",
              )}
            >
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Progress Ring SVG ─── */

interface ProgressRingProps {
  value: number;
  size: number;
  strokeWidth: number;
}

function ProgressRing({ value, size, strokeWidth }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

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
            "transition-all duration-700 ease-out",
            isCompleted ? "text-app-status-success" : "text-app-accent",
          )}
        />
      </svg>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            "font-mono text-lg font-bold tabular-nums leading-none",
            isCompleted ? "text-app-status-success" : "text-app-ink",
          )}
        >
          {value}%
        </span>
      </div>
    </div>
  );
}

/* ─── Journey Illustration SVG ─── */

interface JourneyIllustrationProps {
  progress: number;
}

function JourneyIllustration({ progress }: JourneyIllustrationProps) {
  const isCompleted = progress === 100;
  const isHighProgress = progress >= 66;
  const isMidProgress = progress >= 33;

  return (
    <div className="relative" style={{ width: 140, height: 100 }}>
      <svg
        width={140}
        height={100}
        viewBox="0 0 140 100"
        fill="none"
        aria-hidden="true"
      >
        {/* Path - winding road */}
        <path
          d="M10 80 Q35 80 45 60 Q55 40 75 40 Q95 40 105 25 Q115 10 130 10"
          stroke="var(--app-accent-soft)"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
        {/* Progress path */}
        <path
          d="M10 80 Q35 80 45 60 Q55 40 75 40 Q95 40 105 25 Q115 10 130 10"
          stroke={isCompleted ? "var(--app-status-success)" : "var(--app-accent)"}
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          strokeDasharray="200"
          strokeDashoffset={200 - (progress / 100) * 200}
          className="transition-all duration-700 ease-out"
        />
        {/* Milestone 1 - start */}
        <circle
          cx={10}
          cy={80}
          r={5}
          fill={isMidProgress ? "var(--app-accent)" : "var(--app-accent-soft)"}
          className="transition-colors duration-500"
        />
        {/* Milestone 2 - middle */}
        <circle
          cx={75}
          cy={40}
          r={5}
          fill={isHighProgress ? "var(--app-accent)" : "var(--app-accent-soft)"}
          className="transition-colors duration-500"
        />
        {/* Milestone 3 - end (flag) */}
        <circle
          cx={130}
          cy={10}
          r={6}
          fill={isCompleted ? "var(--app-status-success)" : "var(--app-accent-soft)"}
          className="transition-colors duration-500"
        />
        {/* Flag at end */}
        <path
          d="M130 10 L130 2 L138 6 L130 10"
          fill={isCompleted ? "var(--app-status-success)" : "var(--app-accent-soft)"}
          className="transition-colors duration-500"
        />
        {/* Current position dot */}
        {!isCompleted && (
          <circle
            cx={10 + (progress / 100) * 120}
            cy={80 - (progress / 100) * 70}
            r={4}
            fill="var(--app-accent)"
            className="motion-safe:animate-pulse"
          />
        )}
      </svg>
      {/* Progress label */}
      <div className="absolute bottom-0 left-0 right-0 text-center">
        <span
          className={cn(
            "font-mono text-sm font-bold tabular-nums",
            isCompleted ? "text-app-status-success" : "text-app-ink",
          )}
        >
          {progress}%
        </span>
      </div>
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
    <div className="flex items-center gap-3 rounded-control border border-app-accent/20 bg-app-accent-subtle/30 px-4 py-3 transition-all duration-200 w-full sm:w-auto sm:max-w-md">
      <button
        type="button"
        onClick={() => onToggle(goalId, task.id)}
        className="flex shrink-0 items-center justify-center min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 rounded-lg"
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
      className="relative rounded-card-lg border border-dashed border-app-line bg-app-surface p-6 sm:p-8 shadow-app-sm text-center overflow-hidden"
      aria-label="Tiêu điểm hôm nay"
    >
      <div className="relative z-10 space-y-4 py-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-app-accent-soft text-app-accent">
          <Target className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h3 className="font-serif text-lg font-bold text-app-ink">
            Sẵn sàng cho mục tiêu tiếp theo
          </h3>
          <p className="text-sm text-app-ink-soft leading-relaxed max-w-sm mx-auto">
            Chưa có việc nào cần xử lý ngay. Bắt đầu một chu kỳ 12 tuần mới để tạo tiêu điểm hành động.
          </p>
        </div>
        <Button
          onClick={onStartGuidedGoalFlow}
          className="bg-app-accent hover:bg-app-accent-hover text-white text-sm font-bold rounded-full px-5 py-2.5 shadow-app-sm"
        >
          <Zap className="h-4 w-4 mr-1.5" />
          Bắt đầu chu kỳ 12 tuần
        </Button>
      </div>
    </section>
  );
}