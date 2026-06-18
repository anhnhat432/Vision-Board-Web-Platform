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
      className="rounded-3xl border border-neutral-200/70 dark:border-neutral-800/80 bg-white/90 dark:bg-neutral-900/80 p-6 shadow-[0_4px_24px_rgba(0,0,0,0.005)] transition-all duration-300 hover:border-app-accent/25 hover:shadow-[0_8px_32px_rgba(0,0,0,0.015)] overflow-hidden relative select-none"
      aria-labelledby="dashboard-active-goals-title"
    >
      {/* Grid Pattern overlay for texture */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808005_1px,transparent_1px),linear-gradient(to_bottom,#80808005_1px,transparent_1px)] bg-[size:12px_12px] pointer-events-none" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-200/50 dark:border-neutral-800/55 pb-4 mb-6 pt-2 relative z-10">
        <div>
          <h2
            id="dashboard-active-goals-title"
            className="text-xs font-bold uppercase tracking-[0.2em] text-app-ink-soft flex items-center gap-2"
          >
            <Target className="h-4.5 w-4.5 text-app-accent/80" />
            Mục tiêu chu kỳ
          </h2>
          <p className="mt-1 text-[10px] font-semibold text-neutral-500">
            {Math.min(goals.length, maxGoals)} / {maxGoals} Mục tiêu đang chạy
          </p>
        </div>

        <button
          type="button"
          onClick={onAddGoal}
          disabled={isAtLimit}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-2 text-[10px] font-bold text-app-accent hover:bg-app-accent hover:text-white disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400 disabled:border-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 transition-all duration-200 shadow-sm"
          title={isAtLimit ? "Đã đạt giới hạn 3 mục tiêu trong chu kỳ" : "Thêm mục tiêu"}
        >
          <Plus className="h-3.5 w-3.5" />
          Thêm mục tiêu
        </button>
      </div>

      <div className="space-y-4 relative z-10">
        {visibleGoals.length > 0 ? (
          visibleGoals.map((goal, index) => {
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
                className={`group flex gap-4 rounded-2xl border border-neutral-200/60 dark:border-neutral-800/70 bg-white/70 dark:bg-neutral-950/20 p-5 hover:border-app-accent/25 hover:bg-white dark:hover:bg-neutral-950 hover:shadow-xs transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 relative`}
              >
                {/* Accent glow on hover */}
                <div className="absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r from-app-accent/40 to-emerald-500/20 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-b-2xl" />

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-50 dark:bg-neutral-900 text-neutral-500 border border-neutral-200/80 dark:border-neutral-800/85 group-hover:scale-110 transition-all duration-300 group-hover:bg-app-accent-soft/20 group-hover:border-app-accent/20">
                  <GoalIcon className="h-4.5 w-4.5 text-app-accent/80 transition-colors duration-300 group-hover:text-app-accent" />
                </div>

                <div className="min-w-0 flex-1 space-y-2.5 pt-0.5">
                  <h3 className="line-clamp-2 break-words text-xs font-bold leading-relaxed text-neutral-800 dark:text-neutral-200 group-hover:text-app-accent transition-colors duration-200">
                    {goal.title}
                  </h3>

                  <p className="text-[10px] font-semibold text-neutral-500">
                    {getWeekLabel(goal)} · <span className="text-app-accent font-extrabold">{domain}</span>
                  </p>

                  <div
                    className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800/80 shadow-inner"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-app-accent to-[#5ba590] dark:from-[#3a6e60] dark:to-[#5ba590] transition-all duration-500 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end justify-between gap-3 text-right pt-0.5">
                  <span className="text-xs font-extrabold text-app-accent tabular-nums">{progress}%</span>
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-app-accent group-hover:translate-x-0.5 transition-transform duration-200">
                    Chi tiết
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50/10 p-8 text-center flex flex-col items-center justify-center gap-3">
            <Target className="h-7 w-7 text-neutral-400 stroke-[1.25]" />
            <p className="text-xs font-semibold leading-relaxed text-neutral-500 max-w-[36ch]">
              Chưa có mục tiêu đang chạy. Hãy bắt đầu bằng Cân bằng cuộc sống để tìm ra trọng tâm ưu tiên nhất!
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
