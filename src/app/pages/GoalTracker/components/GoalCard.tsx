import { ArrowRight, Award, Calendar, CheckCircle2, Circle, RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { getGoalArchetypeIcon } from "@/app/components/illustrations";
import type { Goal, PricingPlanCode } from "@/app/utils/storage";
import { getLifeAreaLabel, getTwelveWeekCurrentWeek, getTwelveWeekTodayTasks } from "@/app/utils/storage";
import { getPlanLabel } from "@/app/utils/twelve-week-premium";
import { Button } from "@/app/components/ui/button";
import { CountUp } from "@/app/components/ui/count-up";
import { SpotlightCard } from "@/app/components/ui/spotlight-card";
import { cn } from "@/app/components/ui/utils";
import { useReducedMotion } from "@/app/hooks/useReducedMotion";
import { FutureSelfLetter } from "./FutureSelfLetter";
import { getGoalCompletionDetails, getGoalHealthStatus } from "./helpers";
import { StreakHeatmap } from "./StreakHeatmap";
import { WeeklyQuestLine } from "./WeeklyQuestLine";

interface GoalCardProps {
  goal: Goal;
  currentPlanCode: PricingPlanCode;
  progress: number;
  isOverdue: boolean;
  isNearDeadline: boolean;
  handleToggleTask: (goalId: string, taskId: string) => void;
  openTwelveWeekCenter: (goalId: string) => void;
  setGoalToDelete: (goalId: string) => void;
}

export function GoalCard({
  goal,
  currentPlanCode,
  progress,
  isOverdue,
  isNearDeadline,
  handleToggleTask,
  openTwelveWeekCenter,
  setGoalToDelete,
}: GoalCardProps) {
  const system = goal.twelveWeekSystem;
  const systemCurrentWeek = system ? getTwelveWeekCurrentWeek(system) : null;
  const GoalArchetypeIcon = getGoalArchetypeIcon(system?.goalType ?? goal.category);

  const displayTasks = useMemo(() => {
    if (system) {
      const todayTasks = getTwelveWeekTodayTasks(system);
      return todayTasks.filter((task) => !task.completed).slice(0, 2);
    }
    return (goal.tasks || []).filter((task) => !task.completed).slice(0, 2);
  }, [system, goal.tasks]);

  const completedTasksCount = useMemo(() => {
    if (system) {
      const todayTasks = getTwelveWeekTodayTasks(system);
      return todayTasks.filter((t) => t.completed).length;
    }
    return (goal.tasks || []).filter((t) => t.completed).length;
  }, [system, goal.tasks]);

  const totalTasksCount = useMemo(() => {
    if (system) {
      const todayTasks = getTwelveWeekTodayTasks(system);
      return todayTasks.length;
    }
    return (goal.tasks || []).length;
  }, [system, goal.tasks]);

  const [isFlipped, setIsFlipped] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const completionDetails = useMemo(() => getGoalCompletionDetails(goal), [goal]);
  const health = useMemo(
    () => getGoalHealthStatus(goal, progress, isOverdue, isNearDeadline),
    [goal, progress, isOverdue, isNearDeadline],
  );

  const glowClass =
    progress === 100
      ? prefersReducedMotion
        ? "border-app-accent/40 shadow-[0_0_12px_rgba(47,163,107,0.1)] bg-app-accent-subtle"
        : "completed-goal-glow bg-app-accent-subtle border-app-accent/25"
      : "bg-app-surface border-app-line/70";

  return (
    <div id={`goal-card-${goal.id}`} className="perspective-1000 w-full relative">
      <div className={cn("preserve-3d card-transition w-full relative", isFlipped ? "rotate-y-180" : "")}>
        {/* FRONT SIDE */}
        <div className="backface-hidden w-full" aria-hidden={isFlipped}>
          <SpotlightCard
            className={cn(
            "rounded-[20px] border p-0 transition-all duration-300 hover:border-app-accent/20 hover:shadow-[var(--app-shadow-md)] relative overflow-hidden",
              glowClass,
            )}
          >
            <div className="grid lg:grid-cols-[1.35fr_1fr]">
              {/* Cột trái: Goal Info */}
              <div className="min-w-0 space-y-3.5 border-app-line/40 px-6 py-[22px] lg:border-r">
                <div className="flex items-start gap-[13px] mb-4">
                  <div
                    className={cn(
                      "mt-0.5 flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px]",
                      "bg-app-accent-subtle text-app-accent",
                    )}
                  >
                    <GoalArchetypeIcon className="h-[19px] w-[19px]" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="text-[14.5px] font-bold leading-[1.35] text-app-ink break-words line-clamp-3 mb-[5px]">
                      {goal.title}
                    </h3>
                    <p className="flex flex-wrap items-center gap-2 text-[11.5px] font-medium text-app-ink-muted">
                      <span>{system ? `Tuần ${systemCurrentWeek ?? "-"}/12` : "Mục tiêu thường"}</span>
                      <span className="text-app-ink-muted/50">·</span>
                      <span className="font-bold text-app-accent">{getLifeAreaLabel(goal.category)}</span>
                      {goal.deadline && (
                        <>
                          <span className="text-app-ink-muted/50">·</span>
                          <span className="inline-flex items-center gap-1 text-app-ink-muted font-normal">
                            <Calendar className="h-3 w-3" />
                            Hạn: {new Date(goal.deadline).toLocaleDateString("vi-VN")}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-[7px] mb-[18px]">
                  <span
                    className={cn(
                      "inline-flex items-center gap-[5px] rounded-full px-[11px] py-[4px] text-[10.5px] font-semibold",
                      "bg-app-accent-subtle text-app-accent",
                    )}
                  >
                    {getLifeAreaLabel(goal.category)}
                  </span>

                  <span
                    className={cn("inline-flex items-center gap-[5px] rounded-full px-[11px] py-[4px] text-[10.5px] font-semibold", health.bgClass)}
                  >
                    {health.label}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-app-accent" aria-label="trạng thái"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                  </span>

                  {system && (
                    <span className="rounded-full bg-[#FFF8DE] border border-[#FFF8DE]/50 px-[11px] py-[4px] text-[10.5px] font-bold text-[#9A7B00]">
                      {getPlanLabel(currentPlanCode)}
                    </span>
                  )}
                </div>

                {/* Streak Heatmap (chỉ cho mục tiêu 12 tuần) */}
                {system && (
                  <div className="pt-0.5 space-y-1.5">
                    <StreakHeatmap system={system} />
                    <WeeklyQuestLine system={system} />
                  </div>
                )}

                {/* Progress Bar */}
                <div className="space-y-2 pt-0.5">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.1em]">
                    <span className="text-app-ink-muted">Tiến độ</span>
                    <span className="font-mono text-[13px] font-bold tabular-nums text-app-accent">
                      <CountUp value={progress} suffix="%" />
                    </span>
                  </div>
                  <div className="h-[7px] overflow-hidden rounded-full bg-app-bg" aria-hidden="true">
                    <div
                      className="h-full rounded-full bg-app-accent transition-all duration-500 ease-out will-change-[width]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Action chính */}
                <div className="pt-1 flex flex-wrap items-center gap-2">
                  {system && (
                    <Button
                      type="button"
                      className="rounded-full bg-app-accent text-white hover:bg-app-accent-hover px-[18px] py-[10px] text-[12.5px] font-bold shadow-none transition-all duration-200 inline-flex items-center gap-2 h-auto"
                      onClick={() => openTwelveWeekCenter(goal.id)}
                    >
                      Tiếp tục chu kỳ
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {system ? <FutureSelfLetter goalId={goal.id} progress={progress} system={system} /> : null}
                  {progress === 100 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsFlipped(true)}
                      className="rounded-lg border border-app-accent/30 text-app-accent hover:bg-app-accent-subtle px-3.5 py-2 text-xs font-bold transition-all h-9 flex items-center gap-1.5"
                      aria-pressed={isFlipped}
                    >
                      <Award className="h-4 w-4 text-app-accent" />
                      Vinh danh
                    </Button>
                  )}
                </div>
              </div>

              {/* Cột phải: Nhiệm vụ */}
              <div className="flex min-w-0 flex-col px-6 py-[22px]">
                <div className="flex-1">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-app-ink">
                      {system ? "Việc hôm nay" : "Nhiệm vụ chưa xong"}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-app-accent/10 px-2.5 py-0.5 font-mono text-[12px] font-bold tabular-nums text-app-accent">
                        {completedTasksCount}/{totalTasksCount}
                      </span>
                      <button
                        type="button"
                        className="text-[#C7C2B5] hover:text-app-status-error transition-colors"
                        onClick={() => setGoalToDelete(goal.id)}
                        aria-label={`Xóa mục tiêu ${goal.title}`}
                      >
                        <Trash2 className="h-[15px] w-[15px]" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {displayTasks.map((task) => (
                      <div
                        key={task.id}
                        className="group/task flex items-center gap-[11px] rounded-xl border border-app-line/50 bg-[#FAF8F3] px-[15px] py-[13px] transition-all duration-200 hover:border-app-accent/20 hover:bg-app-accent-subtle/10"
                      >
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => handleToggleTask(goal.id, task.id)}
                          className="sr-only"
                          aria-label={task.completed ? "Hủy chốt việc" : "Chốt việc"}
                        />
                        <button
                          type="button"
                          onClick={() => handleToggleTask(goal.id, task.id)}
                          className="flex shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
                          aria-label={task.completed ? "Hủy chốt việc" : "Chốt việc"}
                        >
                          <span className="flex size-4.5 items-center justify-center">
                            {task.completed ? (
                              <CheckCircle2 className="size-4.5 text-app-accent shrink-0" />
                            ) : (
                              <span className="flex size-4 items-center justify-center rounded-full border-[1.5px] border-app-line/60 bg-white transition-all duration-200 hover:border-app-accent">
                                <Circle className="size-2.5 text-app-ink-muted/40 shrink-0" />
                              </span>
                            )}
                          </span>
                        </button>
                        <span
                          className={cn(
                            "truncate text-[13px] font-semibold transition-all duration-200",
                            task.completed ? "line-through text-app-ink-muted opacity-60" : "text-app-ink",
                          )}
                        >
                          {task.title}
                        </span>
                      </div>
                    ))}

                    {displayTasks.length === 0 && (
                      <div className="flex min-h-[120px] items-center justify-center">
                        <p className="text-[12.5px] italic text-[#C7C2B5]">
                          {system ? "Không có việc hôm nay." : "Đã chốt hết việc chưa xong."}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {system && (
                  <button
                    type="button"
                    className="group/more mt-5 inline-flex items-center gap-1.5 self-start text-[12px] font-bold text-app-accent transition-colors duration-150 hover:text-app-accent-hover"
                    onClick={() => openTwelveWeekCenter(goal.id)}
                  >
                    <span>Xem toàn bộ</span>
                    <ArrowRight className="h-3 w-3 transform transition-transform duration-200 group-hover/more:translate-x-0.5" />
                  </button>
                )}
              </div>
            </div>
          </SpotlightCard>
        </div>

        {/* BACK SIDE */}
        <div
          className="backface-hidden rotate-y-180 absolute inset-0 w-full h-full z-10"
          aria-hidden={!isFlipped}
        >
          <SpotlightCard
            className={cn(
              "h-full rounded-[var(--app-radius-card)] border p-5 sm:p-6 bg-gradient-to-br from-app-bg-subtle via-app-surface to-app-accent-subtle shadow-[var(--app-shadow-lg)] flex flex-col justify-between overflow-y-auto",
              progress === 100 &&
                (prefersReducedMotion
                  ? "border-app-accent/40 shadow-[0_0_12px_rgba(47,163,107,0.1)]"
                  : "completed-goal-glow"),
            )}
          >
            <div className="space-y-4">
              {/* Certificate Header */}
              <div className="flex items-center gap-3 border-b border-app-line pb-3">
                <div className="flex h-10 w-10 shrink-0 rounded-xl items-center justify-center bg-app-energy/10 text-app-energy shadow-[var(--app-shadow-sm)]">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-app-energy">
                    Thành tích xuất sắc
                  </h4>
                  <p className="text-sm font-semibold text-app-ink-soft">Mục tiêu đã hoàn thành</p>
                </div>
              </div>

              {/* Goal Title & Completion Metadata */}
              <div className="space-y-2">
                <span
                  className="goaltracker-visual-text block font-serif text-lg sm:text-xl font-bold text-app-ink leading-snug break-words line-clamp-3"
                  data-visual-text={goal.title}
                />

                <div className="grid grid-cols-2 gap-4 pt-1 text-xs">
                  <div className="bg-app-bg/50 rounded-lg p-2.5 border border-app-line/40">
                    <p className="text-app-ink-muted font-medium">Hoàn thành ngày</p>
                    <p className="mt-1 font-bold text-app-ink text-sm">{completionDetails.completedAtStr}</p>
                  </div>
                  <div className="bg-app-bg/50 rounded-lg p-2.5 border border-app-line/40">
                    <p className="text-app-ink-muted font-medium">Nhiệm vụ đã chốt</p>
                    <p className="mt-1 font-bold text-app-accent text-sm tabular-nums">
                      {completionDetails.completedTasks}/{completionDetails.totalTasks} việc
                    </p>
                  </div>
                </div>
              </div>

              {/* Encouragement message */}
              <p className="text-sm italic leading-relaxed text-app-ink-soft bg-app-accent-subtle border border-app-accent/10 rounded-xl p-3 font-serif">
                "Bạn đã biến một mục tiêu lớn thành kết quả cụ thể. Hãy ghi nhận nỗ lực này."
              </p>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-app-line/50 flex flex-wrap gap-2.5 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFlipped(false)}
                className="rounded-lg border border-app-line bg-app-surface text-app-ink-soft hover:bg-app-bg px-4 py-2 text-xs sm:text-sm font-bold transition-all h-9 flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Quay lại mục tiêu
              </Button>
              {system && (
                    <Button
                      type="button"
                      className="rounded-full bg-app-accent text-white hover:bg-app-accent-hover px-[18px] py-[10px] text-[12.5px] font-bold shadow-none transition-all duration-200 inline-flex items-center gap-2 h-auto"
                      onClick={() => openTwelveWeekCenter(goal.id)}
                    >
                      Tiếp tục chu kỳ
                      <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </SpotlightCard>
        </div>
      </div>
    </div>
  );
}
