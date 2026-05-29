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
      className="rounded-[18px] border border-app-line bg-app-surface p-5 md:p-6 shadow-app-sm transition-all duration-300 hover:shadow-app-md"
      aria-labelledby="dashboard-active-goals-title"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-app-line pb-4 mb-5">
        <div>
          <h2 id="dashboard-active-goals-title" className="text-base font-bold text-app-ink flex items-center gap-2">
            <Target className="h-5 w-5 text-app-accent animate-pulse" />
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
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-app-line bg-app-surface px-4 py-2 text-xs font-bold text-app-accent hover:bg-app-accent hover:text-white disabled:cursor-not-allowed disabled:text-app-ink-muted disabled:hover:bg-app-surface disabled:hover:text-app-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 transition-all duration-200 shadow-app-sm hover:shadow-app-md"
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
              // biome-ignore lint/a11y/useSemanticElements: Card container acts as interactive block containing complex children
              <div
                key={goal.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectGoal(goal)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectGoal(goal);
                  }
                }}
                className="group flex gap-4 rounded-[14px] border border-app-line bg-app-surface p-4 hover:border-app-accent/30 hover:bg-app-accent-subtle/30 hover:shadow-app-md transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-app-accent-soft text-app-accent group-hover:scale-105 group-hover:bg-app-accent group-hover:text-white transition-all duration-300">
                  <Target className="h-5 w-5" />
                </div>
                
                <div className="min-w-0 flex-1 space-y-2">
                  <h3 className="line-clamp-2 break-words text-sm font-bold leading-relaxed text-app-ink group-hover:text-app-accent transition-colors duration-200">
                    {goal.title}
                  </h3>
                  <p className="text-xs font-semibold tracking-wide text-app-ink-muted">
                    {getWeekLabel(goal)} · <span className="text-app-accent/80 font-bold">{domain}</span>
                  </p>
                  <div className="h-2 overflow-hidden rounded-full bg-app-accent-soft/60" aria-hidden="true">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-app-accent/80 to-app-accent transition-all duration-500 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end justify-between gap-3 text-right">
                  <span className="text-sm font-extrabold tabular-nums text-app-accent">{progress}%</span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-bold text-app-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 group-hover/btn:translate-x-0.5 transition-transform duration-200"
                    aria-label={goal.twelveWeekSystem ? `Mở 12 tuần: ${goal.title}` : `Mở mục tiêu: ${goal.title}`}
                  >
                    Chi tiết
                    <ArrowRight className="h-3.5 w-3.5 transform transition-transform duration-200 group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="surface-empty rounded-[14px] border border-dashed border-app-line bg-app-bg-subtle/50 p-8 text-sm leading-relaxed text-app-ink-muted text-center italic shadow-inner">
            Chưa có mục tiêu đang chạy. Bắt đầu bằng Cân bằng cuộc sống để chọn đúng trọng tâm.
          </div>
        )}
      </div>
    </section>
  );
}
