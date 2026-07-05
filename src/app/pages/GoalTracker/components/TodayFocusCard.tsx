import { ArrowRight, Circle, Target } from "lucide-react";
import type { TwelveWeekTaskInstance } from "@/app/utils/storage";
import { getLifeAreaLabel, getTwelveWeekCurrentWeek, getTwelveWeekTodayTasks } from "@/app/utils/storage";
import { Button } from "@/app/components/ui/button";
import type { FocusGoalData } from "./types";

interface TodayFocusCardProps {
  focusData: FocusGoalData | null;
  openTwelveWeekCenter: (goalId: string) => void;
  handleToggleTask: (goalId: string, taskId: string) => void;
  onStartGuidedGoalFlow: () => void;
}

export function TodayFocusCard({
  focusData,
  openTwelveWeekCenter,
  handleToggleTask,
  onStartGuidedGoalFlow,
}: TodayFocusCardProps) {
  if (!focusData) {
    return (
      <div className="rounded-[var(--app-radius-card)] border border-app-line bg-app-surface p-5 shadow-[var(--app-shadow-sm)] text-center py-6 space-y-3 relative overflow-hidden">
        <div className="absolute -top-2 left-6 w-12 h-3.5 bg-app-accent/10 dark:bg-app-accent/20 backdrop-blur-[1px] rotate-[-2deg] border border-dashed border-app-accent/15 z-10" />
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-app-accent-soft text-app-accent">
          <Target className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-app-ink">Tất cả mục tiêu đã hoàn tất!</h3>
          <p className="text-xs text-app-ink-soft leading-relaxed max-w-md mx-auto">
            Không có tiêu điểm hành động cần xử lý. Hãy thiết lập một chu kỳ 12 tuần mới hoặc thêm mục tiêu thường để
            tiếp tục hành trình.
          </p>
        </div>
        <Button
          onClick={onStartGuidedGoalFlow}
          className="bg-app-accent hover:bg-app-accent-hover text-white text-xs font-bold rounded-lg px-4 py-2"
        >
          Thiết lập mục tiêu mới
        </Button>
      </div>
    );
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
    <div className="rounded-[18px] bg-app-accent-subtle dark:bg-app-accent-subtle border border-app-accent/20 px-6 py-[22px] shadow-[var(--app-shadow-sm)] flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden">
      <div className="space-y-3 min-w-0 flex-1 z-10">
        <div className="flex items-center gap-[7px] mb-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-app-accent shrink-0" />
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-app-accent">
            Tiêu điểm hôm nay
          </p>
        </div>

        <div className="space-y-[5px]">
          <h2
            className="goaltracker-visual-text block text-[16px] font-bold leading-[1.4] text-app-ink break-words"
            data-visual-text={goal.title}
            aria-label={goal.title}
          >
            <span className="sr-only">{goal.title}</span>
          </h2>
          <p className="text-[12px] text-[#5C7A5C] font-semibold">
            {isTwelveWeek ? `Tuần ${systemCurrentWeek ?? "-"}/12` : "Mục tiêu thường"} ·{" "}
            <span className="font-bold text-app-accent">{getLifeAreaLabel(goal.category)}</span>
          </p>
        </div>

        <div className="flex items-start gap-2 pt-0.5 min-w-0">
          {showTaskCheckbox && firstOpenTask ? (
            <div className="inline-flex items-center gap-[10px] rounded-[11px] border border-app-accent/[0.16] bg-white/70 dark:bg-white/10 px-[15px] py-[11px] transition-all duration-300">
              <button
                type="button"
                onClick={() => handleToggleTask(goal.id, firstOpenTask.id)}
                className="flex shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
                aria-label="Chốt việc"
              >
                <span className="flex size-[18px] items-center justify-center rounded-full border-2 border-app-accent hover:bg-app-accent/10 transition-all duration-200">
                  <Circle className="size-3 text-app-ink-muted hover:text-app-accent shrink-0 opacity-0" />
                </span>
              </button>
              <span
                className="goaltracker-visual-text block truncate text-[13px] font-semibold text-app-ink"
                data-visual-text={firstOpenTask.title}
              />
            </div>
          ) : (
            <p className="text-sm text-app-ink-soft leading-relaxed font-medium">💡 {recommendedAction}</p>
          )}
        </div>
      </div>

      <div className="shrink-0 z-10 self-end sm:self-center">
        <Button
          onClick={handleCtaClick}
          className="bg-app-accent text-white hover:bg-app-accent-hover font-bold rounded-full px-[22px] py-[13px] text-[13.5px] shadow-none transition-all duration-200 flex items-center gap-[9px] whitespace-nowrap"
        >
          {ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
