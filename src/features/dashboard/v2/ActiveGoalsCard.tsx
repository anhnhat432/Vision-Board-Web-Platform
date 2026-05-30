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
      className="rounded-2xl border border-app-line bg-white/40 dark:bg-neutral-900/10 backdrop-blur-sm p-6 shadow-[0_4px_20px_rgba(0,0,0,0.01)] transition-all duration-300 hover:border-app-accent/20 hover:shadow-[0_8px_24px_rgba(0,0,0,0.02)]"
      aria-labelledby="dashboard-active-goals-title"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-app-line/65 pb-4 mb-5">
        <div>
          <h2 id="dashboard-active-goals-title" className="text-sm font-bold uppercase tracking-[0.2em] text-app-ink-soft flex items-center gap-2">
            <Target className="h-4.5 w-4.5 text-app-accent/80" />
            Mục tiêu chu kỳ
          </h2>
          <p className="mt-1 text-xs font-semibold text-app-ink-muted">
            {Math.min(goals.length, maxGoals)} / {maxGoals} Mục tiêu đang chạy
          </p>
        </div>
        <button
          type="button"
          onClick={onAddGoal}
          disabled={isAtLimit}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-app-line/75 bg-white dark:bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-app-accent hover:bg-app-accent hover:text-white disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400 disabled:border-app-line/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 transition-all duration-200 shadow-sm"
          title={isAtLimit ? "Đã đạt giới hạn 3 mục tiêu trong chu kỳ" : "Thêm mục tiêu"}
        >
          <Plus className="h-3.5 w-3.5" />
          Thêm mục tiêu
        </button>
      </div>

      <div className="space-y-3.5">
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
                className="group flex gap-4 rounded-xl border border-app-line/65 bg-white/50 dark:bg-neutral-950/20 p-4 hover:border-app-accent/25 hover:bg-white dark:hover:bg-neutral-950 hover:shadow-sm transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-900 text-app-ink-soft border border-app-line/60 group-hover:scale-105 transition-all duration-300"
                >
                  <GoalIcon className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <h3 className="line-clamp-2 break-words text-xs font-semibold leading-relaxed text-app-ink group-hover:text-app-accent transition-colors duration-200">
                    {goal.title}
                  </h3>
                  <p className="text-[10px] font-medium tracking-wide text-app-ink-soft/85">
                    {getWeekLabel(goal)} · <span className="text-app-accent font-semibold">{domain}</span>
                  </p>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800" aria-hidden="true">
                    <div
                      className="h-full rounded-full bg-app-accent transition-all duration-500 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end justify-between gap-3 text-right">
                  <span className="text-xs font-bold text-app-accent tabular-nums">{progress}%</span>
                  <span
                    className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-app-accent group-hover:translate-x-0.5 transition-transform duration-200"
                  >
                    Chi tiết
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-app-line bg-neutral-50/10 p-8 text-center flex flex-col items-center justify-center gap-3">
            <Target className="h-7 w-7 text-app-ink-muted/50 stroke-[1.25]" />
            <p className="text-xs font-medium leading-relaxed text-app-ink-soft max-w-[36ch]">
              Chưa có mục tiêu đang chạy. Hãy bắt đầu bằng Cân bằng cuộc sống để tìm ra trọng tâm ưu tiên nhất!
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
