/**
 * GoalFleetItem — Compact goal row cho Command Center
 *
 * Mỗi mục tiêu là một dòng compact với:
 * - Icon + title + meta
 * - Mini progress bar
 * - Status dot
 * - Delete button
 * - "Tiếp tục" action cho 12-week goals
 *
 * Contract: giữ tương thích MissionCardProps.
 */

import {
  ArrowRight,
  Award,
  Circle,
  Trash2,
} from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/utils";
import {
  getGoalArchetypeIcon,
} from "@/app/components/illustrations";
import {
  getGoalExecutionStats,
  getLifeAreaLabel,
  getTwelveWeekCurrentWeek,
  getTwelveWeekTodayTasks,
  type Goal,
  type PricingPlanCode,
} from "@/app/utils/storage";

/* ─── Life area accent colors ─── */
function getLifeAreaAccent(category: string): string {
  const colorMap: Record<string, string> = {
    career: "var(--color-career-accent, #2563EB)",
    finance: "var(--color-finance-accent, #E7A400)",
    health: "var(--color-health-accent, #16A34A)",
    education: "var(--color-education-accent, #7C5CFC)",
    relationships: "var(--color-relationships-accent, #E8456B)",
    family: "var(--color-family-accent, #0E9F8E)",
    "personal-growth": "var(--color-personal-growth-accent, #EA7A2B)",
    leisure: "var(--color-leisure-accent, #2BA8E0)",
  };
  return colorMap[category] || "var(--app-accent, #0C5E3A)";
}

function getLifeAreaAccentSoft(category: string): string {
  const colorMap: Record<string, string> = {
    career: "rgba(37, 99, 235, 0.12)",
    finance: "rgba(231, 164, 0, 0.12)",
    health: "rgba(22, 163, 74, 0.12)",
    education: "rgba(124, 92, 252, 0.12)",
    relationships: "rgba(232, 69, 107, 0.12)",
    family: "rgba(14, 159, 142, 0.12)",
    "personal-growth": "rgba(234, 122, 43, 0.12)",
    leisure: "rgba(43, 168, 224, 0.12)",
  };
  return colorMap[category] || "var(--app-accent-soft, #E4EEDF)";
}

/* ─── Health status ─── */
interface HealthStatus {
  label: string;
  dotClass: string;
}

function getFleetHealthStatus(
  goal: Goal,
  progress: number,
  isOverdue: boolean,
  isNearDeadline: boolean,
): HealthStatus {
  const stats = getGoalExecutionStats(goal);

  if (progress === 100) {
    return { label: "Hoàn thành", dotClass: "bg-app-status-success" };
  }
  if (isOverdue) {
    return { label: "Cần chỉnh nhịp", dotClass: "bg-app-status-warning" };
  }
  if (stats.reviewDueToday) {
    return { label: "Đến ngày review", dotClass: "bg-app-status-warning" };
  }
  if (isNearDeadline) {
    return { label: "Sắp đến hạn", dotClass: "bg-app-status-warning" };
  }
  return { label: "Đang đi đều", dotClass: "bg-app-status-info" };
}

/* ─── GoalFleetItem Props ─── */
export interface GoalFleetItemProps {
  goal: Goal;
  currentPlanCode: PricingPlanCode;
  progress: number;
  isOverdue: boolean;
  isNearDeadline: boolean;
  handleToggleTask: (goalId: string, taskId: string) => void;
  openTwelveWeekCenter: (goalId: string) => void;
  setGoalToDelete: (goalId: string) => void;
}

export function GoalFleetItem({
  goal,
  progress,
  isOverdue,
  isNearDeadline,
  handleToggleTask,
  openTwelveWeekCenter,
  setGoalToDelete,
}: GoalFleetItemProps) {
  const system = goal.twelveWeekSystem;
  const systemCurrentWeek = system ? getTwelveWeekCurrentWeek(system) : null;
  const GoalArchetypeIcon = getGoalArchetypeIcon(system?.goalType ?? goal.category);

  const health = useMemo(
    () => getFleetHealthStatus(goal, progress, isOverdue, isNearDeadline),
    [goal, progress, isOverdue, isNearDeadline],
  );

  const isCompleted = progress === 100;

  const todayTasks = useMemo(() => {
    if (system) {
      return getTwelveWeekTodayTasks(system).filter((t) => !t.completed).slice(0, 1);
    }
    return (goal.tasks || []).filter((t) => !t.completed).slice(0, 1);
  }, [system, goal.tasks]);

  const stats = useMemo(() => getGoalExecutionStats(goal), [goal]);

  const areaColor = getLifeAreaAccent(goal.category);
  const areaColorSoft = getLifeAreaAccentSoft(goal.category);

  return (
    <article
      id={`goal-fleet-${goal.id}`}
      className={cn(
        "group relative rounded-card border p-4 transition-all duration-200",
        "motion-safe:hover:-translate-y-px motion-safe:hover:shadow-app-md",
        isCompleted
          ? "border-app-accent/20 bg-app-accent-subtle/30"
          : "border-app-line bg-app-surface shadow-app-sm hover:border-app-accent/20",
      )}
      style={system && !isCompleted ? { borderTop: `3px solid ${areaColor}` } : undefined}
    >
      <div className="flex items-start gap-3.5">
        {/* Icon — area-colored */}
        <div
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: areaColorSoft, color: areaColor }}
        >
          <GoalArchetypeIcon className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2.5">
          {/* Title + meta row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold leading-snug text-app-ink break-words line-clamp-1">
                {goal.title}
              </h3>
              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-app-ink-muted">
                <span className="font-semibold" style={{ color: areaColor }}>
                  {getLifeAreaLabel(goal.category)}
                </span>
                {system && systemCurrentWeek && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold tabular-nums">
                      Tuần {systemCurrentWeek}/12
                    </span>
                  </>
                )}
                {goal.deadline && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Hạn: {new Date(goal.deadline).toLocaleDateString("vi-VN")}</span>
                  </>
                )}
              </p>
            </div>

            {/* Delete button */}
            <button
              type="button"
              className="shrink-0 h-8 w-8 rounded-lg text-app-ink-muted/30 hover:text-app-status-error hover:bg-app-status-error/5 transition-colors duration-150 flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-status-error/30"
              onClick={() => setGoalToDelete(goal.id)}
              aria-label={`Xóa mục tiêu ${goal.title}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Progress bar — area-colored */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 overflow-hidden rounded-full bg-app-bg">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progress}%`,
                  backgroundColor: isCompleted ? undefined : areaColor,
                  background: isCompleted ? "var(--app-status-success)" : undefined,
                }}
              />
            </div>
            <span className="font-mono text-xs font-bold tabular-nums text-app-ink shrink-0">
              {progress}%
            </span>
          </div>

          {/* Bottom row: health + today task + action */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Health dot — larger */}
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-app-ink-soft">
              <span className={cn("h-2 w-2 rounded-full shrink-0", health.dotClass)} aria-hidden="true" />
              {health.label}
            </span>

            {/* Today task preview */}
            {todayTasks.length > 0 && !isCompleted && (
              <>
                <span className="text-app-ink-muted text-xs" aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => handleToggleTask(goal.id, todayTasks[0].id)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-app-ink-soft hover:text-app-accent transition-colors max-w-[200px]"
                  aria-label={`Chốt việc: ${todayTasks[0].title}`}
                >
                  <Circle className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{todayTasks[0].title}</span>
                </button>
              </>
            )}

            {/* Completed badge */}
            {isCompleted && (
              <>
                <span className="text-app-ink-muted text-xs" aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-app-status-success">
                  <Award className="h-3.5 w-3.5" />
                  {stats.completed}/{stats.total} việc
                </span>
              </>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Action button for 12-week goals — area-colored */}
            {system && !isCompleted && (
              <Button
                type="button"
                variant="ghost"
                className="h-8 rounded-full px-3.5 text-xs font-bold gap-1"
                style={{ color: areaColor }}
                onClick={() => openTwelveWeekCenter(goal.id)}
              >
                Tiếp tục
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}