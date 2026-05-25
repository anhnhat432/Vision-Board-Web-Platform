import { ArrowRight, Plus, Target } from "lucide-react";

import {
  calculateGoalProgress,
  getLifeAreaLabel,
  getTwelveWeekCurrentWeek,
  getTwelveWeekWeekCompletion,
  type Goal,
} from "@/app/utils/storage";

interface ActiveGoalsCardProps {
  goals: Goal[];
  maxGoals?: number;
  onSelectGoal: (goal: Goal) => void;
  onAddGoal: () => void;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getLeadScore(goal: Goal): number {
  const system = goal.twelveWeekSystem;
  if (!system) return calculateGoalProgress(goal);

  const currentWeek = getTwelveWeekCurrentWeek(system);
  return getTwelveWeekWeekCompletion(system, currentWeek).percent;
}

function getWeekLabel(goal: Goal): string {
  const system = goal.twelveWeekSystem;
  if (!system) return "Chưa vào chu kỳ";

  return `Tuần ${getTwelveWeekCurrentWeek(system)}/${system.totalWeeks}`;
}

export function ActiveGoalsCard({ goals, maxGoals = 3, onSelectGoal, onAddGoal }: ActiveGoalsCardProps) {
  const visibleGoals = goals.slice(0, maxGoals);
  const isAtLimit = goals.length >= maxGoals;

  return (
    <section
      className="rounded-card border border-app-line bg-app-surface p-5 md:p-6"
      aria-labelledby="dashboard-active-goals-title"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="dashboard-active-goals-title" className="text-base font-semibold text-app-ink">
            Mục tiêu đang chạy
          </h2>
          <p className="mt-1 text-sm text-app-ink-muted">
            {Math.min(goals.length, maxGoals)} / {maxGoals} mục tiêu trong chu kỳ
          </p>
        </div>
        <button
          type="button"
          onClick={onAddGoal}
          disabled={isAtLimit}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-app-line bg-app-surface px-3 py-1.5 text-sm font-medium text-app-accent transition-colors duration-150 hover:bg-app-accent-soft disabled:cursor-not-allowed disabled:text-app-ink-muted disabled:hover:bg-app-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
          title={isAtLimit ? "Đã đạt giới hạn 3 mục tiêu trong chu kỳ" : "Thêm mục tiêu"}
        >
          <Plus className="h-3.5 w-3.5" />
          Thêm mục tiêu
        </button>
      </div>

      <div className="mt-5">
        {visibleGoals.length > 0 ? (
          visibleGoals.map((goal) => {
            const progress = clampPercent(getLeadScore(goal));
            const domain = getLifeAreaLabel(goal.focusArea ?? goal.category);

            return (
              <article key={goal.id} className="flex gap-4 border-b border-app-line py-4 last:border-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-app-accent-soft text-app-accent">
                  <Target className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-3 break-words text-sm font-medium leading-5 text-app-ink">
                    {goal.title}
                  </h3>
                  <p className="mt-1 text-xs text-app-ink-muted">
                    {getWeekLabel(goal)} · {domain}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-app-accent-soft" aria-hidden="true">
                    <div className="h-full rounded-full bg-app-accent" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end justify-between gap-3 text-right">
                  <span className="text-xs font-semibold tabular-nums text-app-ink">{progress}%</span>
                  <button
                    type="button"
                    onClick={() => onSelectGoal(goal)}
                    className="inline-flex items-center gap-1 text-sm font-medium text-app-accent transition-colors duration-150 hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
                    aria-label={goal.twelveWeekSystem ? `Mở 12 tuần: ${goal.title}` : `Mở mục tiêu: ${goal.title}`}
                  >
                    Mở
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-card border border-dashed border-app-line bg-app-bg p-5 text-sm leading-6 text-app-ink-soft">
            Chưa có mục tiêu đang chạy. Bắt đầu bằng Cân bằng cuộc sống để chọn đúng trọng tâm.
          </div>
        )}
      </div>
    </section>
  );
}
