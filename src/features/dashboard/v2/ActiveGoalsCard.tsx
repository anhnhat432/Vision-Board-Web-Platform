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
      className="surface-raised rounded-xl border border-app-line bg-app-surface p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow duration-300"
      aria-labelledby="dashboard-active-goals-title"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-app-line pb-4 mb-5">
        <div>
          <h2 id="dashboard-active-goals-title" className="text-base font-bold text-app-ink flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-500" />
            Mục tiêu đang chạy
          </h2>
          <p className="mt-1 text-xs font-semibold tracking-wide text-app-ink-muted">
            {Math.min(goals.length, maxGoals)} / {maxGoals} mục tiêu trong chu kỳ
          </p>
        </div>
        <button
          type="button"
          onClick={onAddGoal}
          disabled={isAtLimit}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-app-line bg-app-surface px-4 py-2 text-xs font-bold text-app-accent hover:bg-app-accent-soft disabled:cursor-not-allowed disabled:text-app-ink-muted disabled:hover:bg-app-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 transition-all duration-200 shadow-sm"
          title={isAtLimit ? "Đã đạt giới hạn 3 mục tiêu trong chu kỳ" : "Thêm mục tiêu"}
        >
          <Plus className="h-3.5 w-3.5" />
          Thêm mục tiêu
        </button>
      </div>

      <div className="space-y-4">
        {visibleGoals.length > 0 ? (
          visibleGoals.map((goal) => {
            const progress = clampPercent(getLeadScore(goal));
            const domain = getLifeAreaLabel(goal.focusArea ?? goal.category);

            return (
              <article
                key={goal.id}
                className="flex gap-4 rounded-xl border border-app-line bg-app-bg/50 p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:bg-app-bg hover:border-app-line-strong"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 shadow-sm">
                  <Target className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 break-words text-sm font-bold leading-relaxed text-app-ink">
                    {goal.title}
                  </h3>
                  <p className="mt-1 text-xs font-semibold tracking-wide text-app-ink-muted">
                    {getWeekLabel(goal)} · <span className="text-app-accent">{domain}</span>
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950/40" aria-hidden="true">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end justify-between gap-3 text-right">
                  <span className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{progress}%</span>
                  <button
                    type="button"
                    onClick={() => onSelectGoal(goal)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-app-accent hover:text-emerald-600 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
                    aria-label={goal.twelveWeekSystem ? `Mở 12 tuần: ${goal.title}` : `Mở mục tiêu: ${goal.title}`}
                  >
                    Chi tiết
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <div className="surface-empty rounded-xl border border-dashed border-app-line bg-app-bg/50 p-6 text-sm leading-relaxed text-app-ink-muted text-center italic">
            Chưa có mục tiêu đang chạy. Bắt đầu bằng Cân bằng cuộc sống để chọn đúng trọng tâm.
          </div>
        )}
      </div>
    </section>
  );
}
