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

  const cardToneClass = progress === 100 ? "border-app-accent/25 bg-app-accent-subtle/35" : "border-app-line/70 bg-app-surface";
  const completionLiftClass = progress === 100 && !prefersReducedMotion ? "completed-goal-glow" : "";

  return (
    <div id={`goal-card-${goal.id}`} className="perspective-1000 relative w-full">
      <div className={cn("preserve-3d card-transition relative w-full", isFlipped ? "rotate-y-180" : "")}>
        {/* FRONT SIDE */}
        <div className="backface-hidden w-full" aria-hidden={isFlipped}>
          <SpotlightCard
            className={cn(
              "relative overflow-hidden rounded-[24px] border p-0 shadow-[var(--app-shadow-card)] transition-[border-color,box-shadow] duration-300 hover:border-app-accent/25 hover:shadow-[var(--app-shadow-md)]",
              cardToneClass,
              completionLiftClass,
            )}
          >
            <div className="grid min-w-0 lg:grid-cols-[minmax(0,1.28fr)_minmax(300px,0.72fr)]">
              <div className="min-w-0 space-y-5 px-5 py-5 sm:px-6 sm:py-6 lg:border-r lg:border-app-line/45">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-app-accent/12 bg-app-accent-soft/65 text-app-accent">
                    <GoalArchetypeIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-app-accent/15 bg-app-accent-soft/45 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-app-accent">
                        {system ? `Tuần ${systemCurrentWeek ?? "-"}/12` : "Mục tiêu thường"}
                      </span>
                      {system && (
                        <span className="rounded-full border border-app-line/70 bg-app-bg-subtle px-2.5 py-1 text-[10px] font-bold text-app-ink-muted">
                          {getPlanLabel(currentPlanCode)}
                        </span>
                      )}
                    </div>
                    <h3 className="break-words text-[17px] font-bold leading-[1.35] tracking-[-0.01em] text-app-ink sm:text-lg">
                      {goal.title}
                    </h3>
                    <p className="flex flex-wrap items-center gap-2 text-[12px] font-medium text-app-ink-muted">
                      <span className="font-bold text-app-accent">{getLifeAreaLabel(goal.category)}</span>
                      {goal.deadline && (
                        <>
                          <span className="text-app-ink-muted/45">·</span>
                          <span className="inline-flex items-center gap-1 text-app-ink-muted">
                            <Calendar className="h-3.5 w-3.5" />
                            Hạn {new Date(goal.deadline).toLocaleDateString("vi-VN")}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold", health.bgClass)}>
                    {health.label}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-app-line/60 bg-app-bg-subtle px-3 py-1 text-[11px] font-semibold text-app-ink-soft">
                    {completedTasksCount}/{totalTasksCount} việc hôm nay
                  </span>
                </div>

                {system && (
                  <div className="space-y-3 rounded-[18px] border border-app-line/60 bg-app-surface/72 p-4">
                    <StreakHeatmap system={system} />
                    <WeeklyQuestLine system={system} />
                  </div>
                )}

                <div className="space-y-2.5 rounded-[18px] border border-app-line/60 bg-app-bg-subtle/45 p-4">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-app-ink-muted">Tiến độ</span>
                      <p className="mt-1 text-xs font-medium text-app-ink-soft">Tổng tiến triển của mục tiêu</p>
                    </div>
                    <span className="font-serif text-3xl font-extrabold leading-none text-app-accent tabular-nums">
                      <CountUp value={progress} suffix="%" />
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-app-line/35" aria-hidden="true">
                    <div
                      className="h-full rounded-full bg-app-accent transition-all duration-500 ease-out will-change-[width]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  {system && (
                    <Button
                      type="button"
                      className="h-auto rounded-full bg-app-accent px-[18px] py-[11px] text-[13px] font-bold text-white shadow-none transition-all duration-200 hover:bg-app-accent-hover"
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
                      className="h-10 rounded-full border border-app-accent/25 bg-app-surface px-3.5 text-xs font-bold text-app-accent transition-all hover:bg-app-accent-subtle"
                      aria-pressed={isFlipped}
                    >
                      <Award className="h-4 w-4 text-app-accent" />
                      Vinh danh
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex min-w-0 flex-col bg-app-bg-subtle/35 px-5 py-5 sm:px-6 sm:py-6 lg:bg-app-surface/45">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-app-ink-muted">
                      {system ? "Việc hôm nay" : "Nhiệm vụ chưa xong"}
                    </p>
                    <p className="mt-1 text-xs font-medium text-app-ink-soft">Ưu tiên các bước còn mở</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-app-accent/14 bg-app-accent-soft/45 px-2.5 py-1 font-mono text-[12px] font-bold tabular-nums text-app-accent">
                      {completedTasksCount}/{totalTasksCount}
                    </span>
                    <button
                      type="button"
                      className="rounded-full p-2 text-app-ink-muted transition-colors hover:bg-app-status-error/8 hover:text-app-status-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-status-error/25"
                      onClick={() => setGoalToDelete(goal.id)}
                      aria-label={`Xóa mục tiêu ${goal.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 space-y-2.5">
                  {displayTasks.map((task) => (
                    <div
                      key={task.id}
                      className="group/task flex items-center gap-3 rounded-2xl border border-app-line/55 bg-app-surface px-3.5 py-3 transition-all duration-200 hover:border-app-accent/20 hover:bg-app-accent-subtle/12"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleTask(goal.id, task.id)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-app-line/70 bg-app-bg-subtle text-app-ink-muted transition-colors hover:border-app-accent/45 hover:text-app-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
                        aria-label={task.completed ? "Hủy chốt việc" : "Chốt việc"}
                      >
                        {task.completed ? (
                          <CheckCircle2 className="size-4.5 shrink-0 text-app-accent" />
                        ) : (
                          <Circle className="size-3.5 shrink-0" />
                        )}
                      </button>
                      <span
                        className={cn(
                          "min-w-0 truncate text-[13px] font-semibold leading-snug transition-all duration-200",
                          task.completed ? "text-app-ink-muted opacity-60 line-through" : "text-app-ink",
                        )}
                      >
                        {task.title}
                      </span>
                    </div>
                  ))}

                  {displayTasks.length === 0 && (
                    <div className="flex min-h-[128px] items-center justify-center rounded-2xl border border-dashed border-app-line/70 bg-app-surface/72 px-4 text-center">
                      <p className="text-[12.5px] font-medium text-app-ink-muted">
                        {system ? "Không có việc hôm nay." : "Đã chốt hết việc chưa xong."}
                      </p>
                    </div>
                  )}
                </div>

                {system && (
                  <button
                    type="button"
                    className="group/more mt-5 inline-flex min-h-11 items-center gap-1.5 self-start rounded-full px-1 text-[12.5px] font-bold text-app-accent transition-colors duration-150 hover:text-app-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/25"
                    onClick={() => openTwelveWeekCenter(goal.id)}
                  >
                    <span>Xem toàn bộ chu kỳ</span>
                    <ArrowRight className="h-3.5 w-3.5 transform transition-transform duration-200 group-hover/more:translate-x-0.5" />
                  </button>
                )}
              </div>
            </div>
          </SpotlightCard>
        </div>

        {/* BACK SIDE */}
        <div className="backface-hidden rotate-y-180 absolute inset-0 z-10 h-full w-full" aria-hidden={!isFlipped}>
          <SpotlightCard
            className={cn(
              "flex h-full flex-col justify-between overflow-y-auto rounded-[var(--app-radius-card)] border bg-gradient-to-br from-app-bg-subtle via-app-surface to-app-accent-subtle p-5 shadow-[var(--app-shadow-lg)] sm:p-6",
              progress === 100 && (prefersReducedMotion ? "border-app-accent/40" : "completed-goal-glow"),
            )}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-app-line pb-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-energy/10 text-app-energy shadow-[var(--app-shadow-sm)]">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-app-energy">
                    Thành tích xuất sắc
                  </h4>
                  <p className="text-sm font-semibold text-app-ink-soft">Mục tiêu đã hoàn thành</p>
                </div>
              </div>

              <div className="space-y-2">
                <span className="block break-words font-serif text-lg font-bold leading-snug text-app-ink line-clamp-3 sm:text-xl">
                  {goal.title}
                </span>

                <div className="grid grid-cols-2 gap-4 pt-1 text-xs">
                  <div className="rounded-lg border border-app-line/40 bg-app-bg/50 p-2.5">
                    <p className="font-medium text-app-ink-muted">Hoàn thành ngày</p>
                    <p className="mt-1 text-sm font-bold text-app-ink">{completionDetails.completedAtStr}</p>
                  </div>
                  <div className="rounded-lg border border-app-line/40 bg-app-bg/50 p-2.5">
                    <p className="font-medium text-app-ink-muted">Nhiệm vụ đã chốt</p>
                    <p className="mt-1 text-sm font-bold text-app-accent tabular-nums">
                      {completionDetails.completedTasks}/{completionDetails.totalTasks} việc
                    </p>
                  </div>
                </div>
              </div>

              <p className="rounded-xl border border-app-accent/10 bg-app-accent-subtle p-3 font-serif text-sm italic leading-relaxed text-app-ink-soft">
                “Bạn đã biến một mục tiêu lớn thành kết quả cụ thể. Hãy ghi nhận nỗ lực này.”
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-2.5 border-t border-app-line/50 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFlipped(false)}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-app-line bg-app-surface px-4 py-2 text-xs font-bold text-app-ink-soft transition-all hover:bg-app-bg sm:text-sm"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Quay lại mục tiêu
              </Button>
              {system && (
                <Button
                  type="button"
                  className="inline-flex h-auto items-center gap-2 rounded-full bg-app-accent px-[18px] py-[10px] text-[12.5px] font-bold text-white shadow-none transition-all duration-200 hover:bg-app-accent-hover"
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
