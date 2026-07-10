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
      <div className="relative overflow-hidden rounded-[var(--app-radius-card-lg)] border border-app-line/70 bg-app-surface px-5 py-6 shadow-[var(--app-shadow-sm)] transition-shadow duration-200 hover:shadow-[var(--app-shadow-md)] motion-reduce:transition-none sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-app-accent/15 bg-app-accent-soft/55 text-app-accent transition-transform duration-200 motion-reduce:transition-none">
              <Target className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-1.5">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-app-accent">Tiêu điểm hôm nay</p>
              <h3 className="text-base font-bold leading-snug text-app-ink">Không có việc cần ưu tiên ngay</h3>
              <p className="max-w-2xl text-sm leading-relaxed text-app-ink-soft">
                Bạn đã xử lý xong các mục tiêu đang cần chú ý. Có thể bắt đầu một chu kỳ mới khi đã sẵn sàng.
              </p>
            </div>
          </div>
          <Button
            onClick={onStartGuidedGoalFlow}
            className="h-auto rounded-full bg-app-accent px-5 py-3 text-[13px] font-bold text-white transition-all duration-200 hover:bg-app-accent-hover hover:shadow-[var(--app-shadow-md)] hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100 sm:shrink-0"
          >
            Thiết lập mục tiêu mới
          </Button>
        </div>
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
    <div className="relative overflow-hidden rounded-[var(--app-radius-card-lg)] border border-app-accent/20 bg-app-accent-subtle/55 px-5 py-5 pl-6 shadow-[var(--app-shadow-sm)] dark:bg-app-accent-subtle/25 sm:px-6 sm:py-6 sm:pl-7">
      <span className="absolute inset-y-0 left-0 w-1.5 bg-app-accent" aria-hidden="true" />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-3.5">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-app-accent" />
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-app-accent">Tiêu điểm hôm nay</p>
          </div>

          <div className="space-y-1.5">
            <h2 className="break-words text-lg font-bold leading-snug tracking-[-0.01em] text-app-ink sm:text-xl">
              {goal.title}
            </h2>
            <p className="text-[12.5px] font-semibold text-app-ink-soft">
              {isTwelveWeek ? `Tuần ${systemCurrentWeek ?? "-"}/12` : "Mục tiêu thường"} ·{" "}
              <span className="text-app-accent">{getLifeAreaLabel(goal.category)}</span>
            </p>
          </div>

          {showTaskCheckbox && firstOpenTask ? (
            <div className="inline-flex max-w-full items-center gap-3 rounded-2xl border border-app-accent/16 bg-app-surface/78 px-4 py-3 shadow-[0_12px_28px_-24px_rgba(23,21,15,0.45)] transition-shadow duration-200 hover:shadow-[0_12px_28px_-20px_rgba(23,21,15,0.5)] motion-reduce:transition-none dark:bg-app-surface/80">
              <button
                type="button"
                onClick={() => handleToggleTask(goal.id, firstOpenTask.id)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-app-accent/35 bg-app-surface text-app-accent transition-all duration-200 hover:bg-app-accent-soft hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 motion-reduce:transition-none motion-reduce:hover:scale-100"
                aria-label="Chốt việc"
              >
                <Circle className="size-3.5 shrink-0" />
              </button>
              <span className="min-w-0 truncate text-[13.5px] font-semibold text-app-ink">{firstOpenTask.title}</span>
            </div>
          ) : (
            <p className="max-w-2xl text-sm font-medium leading-relaxed text-app-ink-soft">{recommendedAction}</p>
          )}
        </div>

        <Button
          onClick={handleCtaClick}
          className="h-auto rounded-full bg-app-accent px-[22px] py-[13px] text-[13.5px] font-bold text-white shadow-none transition-all duration-200 hover:bg-app-accent-hover hover:shadow-[var(--app-shadow-md)] hover:scale-[1.03] motion-reduce:transition-none motion-reduce:hover:scale-100 sm:shrink-0"
        >
          {ctaLabel}
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
