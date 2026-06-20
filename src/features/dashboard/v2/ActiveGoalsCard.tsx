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
      className="rounded-card border border-app-line bg-app-surface p-6 shadow-app-sm transition-all duration-300 hover:border-app-accent/25 hover:shadow-app-md overflow-hidden relative"
      aria-labelledby="dashboard-active-goals-title"
    >
      {/* 📌 Floating wood pin at the header */}
      <span className="hidden sm:inline absolute -top-3 left-6 text-base opacity-70 select-none cursor-default z-10">
        📌
      </span>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-app-line pb-4 mb-6 pt-2 relative z-10">
        <div>
          <h2
            id="dashboard-active-goals-title"
            className="text-xs font-bold uppercase tracking-[0.2em] text-app-ink-soft flex items-center gap-2"
          >
            <Target className="h-4.5 w-4.5 text-app-accent/80" />
            Mục tiêu chu kỳ
          </h2>
          <p className="mt-1 text-[10px] font-semibold text-app-ink-muted">
            {Math.min(goals.length, maxGoals)} / {maxGoals} Mục tiêu đang chạy
          </p>
        </div>

        <button
          type="button"
          onClick={onAddGoal}
          disabled={isAtLimit}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-app-line bg-app-surface px-4 py-2 text-[10px] font-bold text-app-accent hover:bg-app-accent hover:text-[var(--app-ink-on-accent)] disabled:cursor-not-allowed disabled:bg-app-bg-subtle disabled:text-app-ink-disabled disabled:border-app-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 transition-all duration-200 shadow-app-sm"
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

            // Alternating subtle tilts to echo Variant B vision-board look
            const tilts = ["-rotate-[0.5deg]", "rotate-[0.4deg]", "-rotate-[0.3deg]"];
            const tiltClass = tilts[index % tilts.length];

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
                className={`group flex gap-4 rounded-control border border-app-line bg-app-bg-subtle p-5 hover:border-app-accent/25 hover:bg-app-surface hover:shadow-app-sm transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 relative ${tiltClass} hover:rotate-0 hover:scale-[1.005]}`}
              >
                {/* Accent glow on hover */}
                <div className="absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r from-app-accent/40 to-app-accent/10 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-b-control" />

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-app-bg-subtle text-app-ink-muted border border-app-line group-hover:scale-110 transition-all duration-300 group-hover:bg-app-accent-soft/20 group-hover:border-app-accent/20">
                  <GoalIcon className="h-4.5 w-4.5 text-app-accent/80 transition-colors duration-300 group-hover:text-app-accent" />
                </div>

                <div className="min-w-0 flex-1 space-y-2.5 pt-0.5">
                  <h3 className="line-clamp-2 break-words text-xs font-bold leading-relaxed text-app-ink group-hover:text-app-accent transition-colors duration-200">
                    {goal.title}
                  </h3>

                  <p className="text-[10px] font-semibold text-app-ink-muted">
                    {getWeekLabel(goal)} · <span className="text-app-accent font-extrabold">{domain}</span>
                  </p>

                  <div
                    className="h-1.5 w-full overflow-hidden rounded-full bg-app-bg-subtle shadow-inner"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full rounded-full bg-app-accent transition-all duration-500 ease-out"
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
          <div className="rounded-control border border-dashed border-app-line bg-app-bg-subtle p-8 text-center flex flex-col items-center justify-center gap-3">
            <Target className="h-7 w-7 text-app-ink-muted stroke-[1.25]" />
            <p className="text-xs font-semibold leading-relaxed text-app-ink-muted max-w-[36ch]">
              Chưa có mục tiêu đang chạy. Hãy bắt đầu bằng Cân bằng cuộc sống để tìm ra trọng tâm ưu tiên nhất!
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
