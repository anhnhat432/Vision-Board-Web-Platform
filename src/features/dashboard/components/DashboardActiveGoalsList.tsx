import { ArrowRight, Plus, Target } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { Progress } from "@/app/components/ui/progress";
import {
  calculateGoalProgress,
  getTwelveWeekCurrentWeek,
  getTwelveWeekWeekCompletion,
} from "@/app/utils/storage";
import type { Goal } from "@/app/utils/storage-types";

type DashboardActiveGoalsListProps = {
  goals: Goal[];
  onSelectGoal: (goal: Goal) => void;
  onAddGoal: () => void;
  maxGoals?: number;
};

function getLeadScore(goal: Goal) {
  const system = goal.twelveWeekSystem;
  if (!system) return calculateGoalProgress(goal);

  const currentWeek = getTwelveWeekCurrentWeek(system);
  return getTwelveWeekWeekCompletion(system, currentWeek).percent;
}

function getWeekLabel(goal: Goal) {
  const system = goal.twelveWeekSystem;
  if (!system) return "Chưa vào cycle";

  return `Tuần ${getTwelveWeekCurrentWeek(system)}/${system.totalWeeks}`;
}

export function DashboardActiveGoalsList({
  goals,
  onSelectGoal,
  onAddGoal,
  maxGoals = 3,
}: DashboardActiveGoalsListProps) {
  const visibleGoals = goals.slice(0, maxGoals);
  const isAtLimit = goals.length >= maxGoals;

  return (
    <div className="stack-stack">
      {visibleGoals.length > 0 ? (
        <div className="grid gap-[var(--space-stack)] lg:grid-cols-3">
          {visibleGoals.map((goal) => {
            const leadScore = getLeadScore(goal);

            return (
              <article
                key={goal.id}
                className="card-hover-lift rounded-[var(--r-card)] bg-white/92 p-5 ring-1 ring-slate-200/70 dark:bg-slate-900/70 dark:ring-slate-700"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-tile)] bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-700 shadow-sm dark:from-violet-950/50 dark:to-fuchsia-950/40 dark:text-violet-200">
                    <Target className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-base font-semibold leading-6 text-foreground">{goal.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{getWeekLabel(goal)}</p>
                  </div>
                </div>

                <div className="mt-[var(--space-stack)] stack-tight">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-muted-foreground">Lead score tuần này</span>
                    <span className="font-semibold text-foreground">{leadScore}%</span>
                  </div>
                  <Progress value={leadScore} className="h-2 bg-slate-100" />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-[var(--space-stack)] w-full justify-between border-violet-200/70 bg-white text-violet-700 hover:bg-violet-50 dark:border-violet-400/20 dark:bg-slate-900 dark:text-violet-200"
                  onClick={() => onSelectGoal(goal)}
                >
                  Mở
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[var(--r-card)] bg-white/92 p-5 ring-1 ring-slate-200/70 dark:bg-slate-900/70 dark:ring-slate-700">
          <p className="font-semibold text-foreground">Chưa có mục tiêu đang chạy.</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Dashboard sẽ gọn hơn sau khi bạn chọn một mục tiêu và tạo cycle 12 tuần đầu tiên.
          </p>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full justify-center border-border bg-white text-foreground hover:bg-muted sm:w-auto dark:bg-slate-900"
        onClick={onAddGoal}
        disabled={isAtLimit}
        title={isAtLimit ? "Đã đạt giới hạn 3 goals/cycle (theo 12 Week Year)" : "Thêm mục tiêu vào cycle"}
      >
        <Plus className="h-4 w-4" />
        Thêm mục tiêu ({Math.min(goals.length, maxGoals)}/{maxGoals})
      </Button>
    </div>
  );
}
