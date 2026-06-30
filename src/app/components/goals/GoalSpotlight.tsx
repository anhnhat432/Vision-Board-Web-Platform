/**
 * GoalSpotlight — Signature moment của trang /goals
 *
 * "Today Spotlight trên bàn làm việc" — một card lớn như tờ giấy được đèn bàn chiếu sáng,
 * với tiêu điểm hôm nay rõ ràng và một hành động duy nhất.
 *
 * Concept: Studio Desk / Mission Board
 */

import { ArrowRight, Circle, Target } from "lucide-react";
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

interface GoalSpotlightProps {
  focusData: SpotlightFocusData | null;
  openTwelveWeekCenter: (goalId: string) => void;
  handleToggleTask: (goalId: string, taskId: string) => void;
  onStartGuidedGoalFlow: () => void;
}

export function GoalSpotlight({
  focusData,
  openTwelveWeekCenter,
  handleToggleTask,
  onStartGuidedGoalFlow,
}: GoalSpotlightProps) {
  if (!focusData) {
    return <GoalSpotlightEmpty onStartGuidedGoalFlow={onStartGuidedGoalFlow} />;
  }

  const { goal, isTwelveWeek, type } = focusData;
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
    recommendedAction = "Chọn một việc nhỏ nhất có thể hoàn thành trong hôm nay.";
    showTaskCheckbox = true;
  } else if (type === "review_due") {
    recommendedAction = "Đã đến ngày đánh giá. Hãy hoàn thành review tuần này để đúc kết bài học.";
    ctaLabel = "Đánh giá tuần";
  } else if (type === "due_warning") {
    recommendedAction = "Mục tiêu sắp hoặc đã trễ hạn. Hãy rà soát lại các hành động để tránh trễ hạn.";
    ctaLabel = isTwelveWeek ? "Tiếp tục chu kỳ" : "Xem chi tiết";
  } else {
    recommendedAction = isTwelveWeek
      ? "Lên kế hoạch các hành động tiếp theo cho tuần này."
      : "Cập nhật các nhiệm vụ của bạn.";
    ctaLabel = isTwelveWeek ? "Tiếp tục chu kỳ" : "Xem chi tiết";
  }

  const handleCtaClick = () => {
    if (isTwelveWeek) {
      openTwelveWeekCenter(goal.id);
    } else {
      const el = document.getElementById(`goal-card-${goal.id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-app-accent/40");
        setTimeout(() => el.classList.remove("ring-2", "ring-app-accent/40"), 2000);
      }
    }
  };

  return (
    <section
      className="relative rounded-[20px] overflow-hidden"
      aria-label="Tiêu điểm hôm nay"
    >
      {/* Spotlight glow effect — soft light from desk lamp */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-app-accent-subtle via-app-accent-subtle/60 to-transparent dark:from-app-accent-subtle/30 dark:via-app-accent-subtle/10 dark:to-transparent pointer-events-none"
        aria-hidden="true"
      />

      {/* Paper texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
        }}
        aria-hidden="true"
      />

      {/* Washi tape decoration — top left */}
      <div
        className="absolute -top-1.5 left-10 w-16 h-4 bg-app-accent/10 dark:bg-app-accent/15 backdrop-blur-[1px] rotate-[-2deg] rounded-sm border border-dashed border-app-accent/15 z-10"
        aria-hidden="true"
      />

      {/* Main content */}
      <div className="relative z-20 border border-app-accent/20 dark:border-app-accent/15 rounded-[20px] bg-app-surface/80 dark:bg-app-surface/60 backdrop-blur-sm p-5 sm:p-7 shadow-app-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          {/* Left: Focus content */}
          <div className="space-y-3 min-w-0 flex-1">
            {/* Label */}
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-app-accent opacity-40 motion-safe:animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-app-accent" />
              </span>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-app-accent">
                Tiêu điểm hôm nay
              </p>
            </div>

            {/* Goal title */}
            <div className="space-y-1.5">
              <h2 className="font-serif text-lg sm:text-xl font-bold leading-snug text-app-ink break-words">
                {goal.title}
              </h2>
              <p className="text-xs text-app-ink-soft font-medium">
                {isTwelveWeek ? (
                  <>
                    <span className="font-bold text-app-accent">Tuần {systemCurrentWeek ?? "-"}/12</span>
                    <span className="mx-1.5 text-app-ink-muted">·</span>
                    <span className="font-semibold">{getLifeAreaLabel(goal.category)}</span>
                  </>
                ) : (
                  <span className="font-semibold">{getLifeAreaLabel(goal.category)}</span>
                )}
              </p>
            </div>

            {/* Action area */}
            <div className="flex items-start gap-3 pt-1 min-w-0">
              {showTaskCheckbox && firstOpenTask ? (
                <TaskCheckbox
                  goalId={goal.id}
                  task={firstOpenTask}
                  onToggle={handleToggleTask}
                />
              ) : (
                <p className="text-sm text-app-ink-soft leading-relaxed">
                  <span className="mr-1.5" aria-hidden="true">💡</span>
                  {recommendedAction}
                </p>
              )}
            </div>
          </div>

          {/* Right: CTA */}
          <div className="shrink-0 self-end sm:self-center">
            <Button
              onClick={handleCtaClick}
              className={cn(
                "rounded-full font-bold shadow-app-sm transition-all duration-200",
                "bg-app-accent text-white hover:bg-app-accent-hover",
                "px-5 py-3 text-sm",
                "flex items-center gap-2",
                "motion-safe:hover:scale-[1.02]",
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

/* ─── Task Checkbox — inline action for today's task ─── */

interface TaskCheckboxProps {
  goalId: string;
  task: TwelveWeekTaskInstance;
  onToggle: (goalId: string, taskId: string) => void;
}

function TaskCheckbox({ goalId, task, onToggle }: TaskCheckboxProps) {
  return (
    <div className="inline-flex items-center gap-3 rounded-[12px] border border-app-accent/20 bg-app-surface/70 dark:bg-app-surface/40 px-4 py-3 transition-all duration-200 w-full sm:w-auto">
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

interface GoalSpotlightEmptyProps {
  onStartGuidedGoalFlow: () => void;
}

function GoalSpotlightEmpty({ onStartGuidedGoalFlow }: GoalSpotlightEmptyProps) {
  return (
    <section
      className="relative rounded-[20px] border border-dashed border-app-line bg-app-surface p-6 sm:p-8 shadow-app-sm text-center overflow-hidden"
      aria-label="Tiêu điểm hôm nay"
    >
      {/* Washi tape decoration */}
      <div
        className="absolute -top-2 left-10 w-14 h-4 bg-app-accent/8 dark:bg-app-accent/15 backdrop-blur-[1px] rotate-[-2deg] rounded-sm border border-dashed border-app-accent/10 z-10"
        aria-hidden="true"
      />

      <div className="relative z-10 space-y-4 py-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-app-accent-soft text-app-accent">
          <Target className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h3 className="font-serif text-base font-bold text-app-ink">
            Tất cả mục tiêu đã hoàn tất!
          </h3>
          <p className="text-sm text-app-ink-soft leading-relaxed max-w-sm mx-auto">
            Không có tiêu điểm hành động cần xử lý. Hãy bắt đầu một chu kỳ mới để tiếp tục hành trình.
          </p>
        </div>
        <Button
          onClick={onStartGuidedGoalFlow}
          className="bg-app-accent hover:bg-app-accent-hover text-white text-sm font-bold rounded-full px-5 py-2.5 shadow-app-sm"
        >
          Thiết lập mục tiêu mới
        </Button>
      </div>
    </section>
  );
}
