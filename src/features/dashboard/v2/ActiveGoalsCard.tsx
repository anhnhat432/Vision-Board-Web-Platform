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
      className="rounded-card border border-app-line bg-app-surface p-[22px] shadow-[0_16px_38px_-30px_rgba(23,21,15,0.28)]"
      aria-labelledby="dashboard-active-goals-title"
    >
      <div className="mb-4 flex flex-col gap-3 border-b border-app-line pb-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            id="dashboard-active-goals-title"
            className="mb-1 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-app-ink"
          >
            <Target className="h-[15px] w-[15px] text-app-accent" />
            Mục tiêu chu kỳ
          </h2>
          <p className="text-[10.5px] font-semibold text-app-ink-muted">
            <span className="font-mono">
              {Math.min(goals.length, maxGoals)} / {maxGoals}
            </span>{" "}
            mục tiêu đang chạy
          </p>
        </div>

        <button
          type="button"
          onClick={onAddGoal}
          disabled={isAtLimit}
          className="inline-flex items-center justify-center gap-1.5 self-start rounded-full border border-app-line bg-app-surface px-3.5 py-2 text-[11.5px] font-bold text-app-accent transition-all duration-200 hover:bg-app-accent hover:text-white disabled:cursor-not-allowed disabled:border-app-line disabled:bg-app-bg-subtle disabled:text-app-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:self-auto"
          title={isAtLimit ? "Đã đạt giới hạn 3 mục tiêu trong chu kỳ" : "Thêm mục tiêu"}
        >
          <Plus className="h-3.5 w-3.5" />
          Thêm mục tiêu
        </button>
      </div>

      <div className="space-y-3">
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
                className="group cursor-pointer rounded-[14px] border border-app-line p-4 transition-colors duration-200 hover:border-app-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-app-accent-subtle text-app-accent"
                      aria-hidden="true"
                    >
                      <GoalIcon className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="mb-1 line-clamp-2 break-words text-sm font-bold leading-snug text-app-ink">
                        {goal.title}
                      </h3>
                      <p className="font-mono text-[11px] font-semibold text-app-ink-muted">
                        {getWeekLabel(goal)} · <span className="text-app-accent">{domain}</span>
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 font-serif text-[18px] font-extrabold text-app-accent tabular-nums">
                    {progress}%
                  </span>
                </div>

                <div className="flex items-center gap-3.5">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-app-bg-subtle" aria-hidden="true">
                    <div
                      className="h-full rounded-full bg-app-accent transition-all duration-500 ease-out"
                      style={{ width: `${Math.max(progress, 2)}%` }}
                    />
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-bold text-app-accent">
                    Chi tiết
                    <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-[14px] border border-dashed border-app-line bg-app-bg-subtle/20 p-8 text-center">
            <Target className="h-7 w-7 stroke-[1.25] text-app-ink-muted" />
            <p className="max-w-[36ch] text-xs font-semibold leading-relaxed text-app-ink-muted">
              Chưa có mục tiêu đang chạy. Hãy bắt đầu bằng Cân bằng cuộc sống để tìm ra trọng tâm ưu tiên nhất!
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
