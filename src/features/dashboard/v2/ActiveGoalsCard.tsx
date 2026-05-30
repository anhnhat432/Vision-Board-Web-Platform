import { ArrowRight, Plus, Target } from "lucide-react";

import {
  calculateGoalProgress,
  type Goal,
  getLifeAreaLabel,
  getTwelveWeekCurrentWeek,
  getTwelveWeekWeekCompletion,
} from "@/app/utils/storage";

interface ActiveGoalsCardProps {
  goals: Goal[];
  maxGoals?: number;
  onSelectGoal: (goal: Goal) => void;
  onAddGoal: () => void;
}

const AREA_THEMES = {
  default: {
    bg: "bg-app-accent-soft text-app-accent",
    text: "text-app-accent/70",
    bar: "bg-app-accent",
    accentText: "text-app-accent",
    icon: Target,
  },
};

function getAreaTheme(_areaKey: string | undefined | null) {
  return AREA_THEMES.default;
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
      className="rounded-[18px] border border-app-line bg-app-surface p-5 md:p-6 shadow-app-sm transition-all duration-300 hover:border-app-accent/20"
      aria-labelledby="dashboard-active-goals-title"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-app-line pb-4 mb-5">
        <div>
          <h2 id="dashboard-active-goals-title" className="text-base font-bold text-app-ink flex items-center gap-2">
            <Target className="h-5 w-5 text-app-accent/80" />
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
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-app-line bg-app-surface px-3 py-1.5 text-xs font-bold text-app-accent/90 hover:bg-app-accent hover:text-white disabled:cursor-not-allowed disabled:bg-app-bg-subtle disabled:text-app-ink-muted disabled:border-app-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 transition-all duration-250 shadow-sm"
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
            const theme = getAreaTheme(goal.focusArea ?? goal.category);
            const GoalIcon = theme.icon;

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
                className="group flex gap-4 rounded-[14px] border border-app-line bg-app-surface p-4 hover:border-app-accent/30 hover:bg-app-bg-subtle/20 hover:shadow-app-md transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] ${theme.bg} shadow-sm group-hover:scale-105 transition-all duration-300`}
                >
                  <GoalIcon className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <h3 className="line-clamp-2 break-words text-xs font-bold leading-relaxed text-app-ink group-hover:text-app-accent transition-colors duration-200">
                    {goal.title}
                  </h3>
                  <p className="text-[10px] font-semibold tracking-wide text-app-ink-muted">
                    {getWeekLabel(goal)} · <span className={`${theme.accentText} font-bold`}>{domain}</span>
                  </p>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-800/60" aria-hidden="true">
                    <div
                      className={`h-full rounded-full ${theme.bar} transition-all duration-500 ease-out`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end justify-between gap-3 text-right">
                  <span className={`text-xs font-extrabold tabular-nums ${theme.accentText}`}>{progress}%</span>
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1 text-[10px] font-bold ${theme.accentText} focus-visible:outline-none group-hover:translate-x-0.5 transition-transform duration-200`}
                    aria-label={goal.twelveWeekSystem ? `Mở 12 tuần: ${goal.title}` : `Mở mục tiêu: ${goal.title}`}
                  >
                    Chi tiết
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-[14px] border border-dashed border-app-line bg-app-bg-subtle/20 p-8 text-center flex flex-col items-center justify-center gap-3">
            <Target className="h-8 w-8 text-app-ink-muted/40 stroke-[1.25] animate-bounce" />
            <p className="text-xs font-semibold leading-relaxed text-app-ink-soft max-w-[36ch]">
              Chưa có mục tiêu đang chạy. Hãy bắt đầu bằng Cân bằng cuộc sống để tìm ra trọng tâm ưu tiên nhất!
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
