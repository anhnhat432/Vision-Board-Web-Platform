import {
  Activity,
  ArrowRight,
  Briefcase,
  Compass,
  GraduationCap,
  Heart,
  Plus,
  Sparkles,
  Target,
  Users,
  Wallet,
} from "lucide-react";

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

// Color and icon themes mapping to Life Areas to avoid monotonic green
const AREA_THEMES: Record<
  string,
  {
    bg: string;
    text: string;
    bar: string;
    accentText: string;
    icon: typeof Target;
  }
> = {
  Health: {
    bg: "bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400",
    text: "text-emerald-600/80 dark:text-emerald-400/80",
    bar: "bg-emerald-500/75 dark:bg-emerald-600/75",
    accentText: "text-emerald-600 dark:text-emerald-400",
    icon: Activity,
  },
  Career: {
    bg: "bg-blue-50/70 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400",
    text: "text-blue-600/80 dark:text-blue-400/80",
    bar: "bg-blue-500/75 dark:bg-blue-600/75",
    accentText: "text-blue-600 dark:text-blue-400",
    icon: Briefcase,
  },
  Relationships: {
    bg: "bg-rose-50/70 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400",
    text: "text-rose-600/80 dark:text-rose-400/80",
    bar: "bg-rose-500/75 dark:bg-rose-600/75",
    accentText: "text-rose-600 dark:text-rose-400",
    icon: Heart,
  },
  "Personal Growth": {
    bg: "bg-teal-50/70 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400",
    text: "text-teal-600/80 dark:text-teal-400/80",
    bar: "bg-teal-500/75 dark:bg-teal-600/75",
    accentText: "text-teal-600 dark:text-teal-400",
    icon: Sparkles,
  },
  Finance: {
    bg: "bg-amber-50/70 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400",
    text: "text-amber-600/80 dark:text-amber-400/80",
    bar: "bg-amber-500/75 dark:bg-amber-600/75",
    accentText: "text-amber-600 dark:text-amber-400",
    icon: Wallet,
  },
  Family: {
    bg: "bg-indigo-50/70 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400",
    text: "text-indigo-600/80 dark:text-indigo-400/80",
    bar: "bg-indigo-500/75 dark:bg-indigo-600/75",
    accentText: "text-indigo-600 dark:text-indigo-400",
    icon: Users,
  },
  Education: {
    bg: "bg-violet-50/70 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400",
    text: "text-violet-600/80 dark:text-violet-400/80",
    bar: "bg-violet-500/75 dark:bg-violet-600/75",
    accentText: "text-violet-600 dark:text-violet-400",
    icon: GraduationCap,
  },
  Leisure: {
    bg: "bg-fuchsia-50/70 dark:bg-fuchsia-950/20 text-fuchsia-600 dark:text-fuchsia-400",
    text: "text-fuchsia-600/80 dark:text-fuchsia-400/80",
    bar: "bg-fuchsia-500/75 dark:bg-fuchsia-600/75",
    accentText: "text-fuchsia-600 dark:text-fuchsia-400",
    icon: Compass,
  },
  default: {
    bg: "bg-app-accent-soft/70 text-app-accent",
    text: "text-app-accent/70",
    bar: "bg-app-accent/75",
    accentText: "text-app-accent",
    icon: Target,
  },
};

function getAreaTheme(areaKey: string | undefined | null) {
  if (!areaKey) return AREA_THEMES.default;
  const normalizedKey = areaKey.trim();
  const labelToKeyMap: Record<string, string> = {
    "Sức khỏe": "Health",
    "Sức khoẻ": "Health",
    "Sự nghiệp": "Career",
    "Mối quan hệ": "Relationships",
    "Tài chính": "Finance",
    "Học tập": "Education",
    "Gia đình": "Family",
    "Phát triển bản thân": "Personal Growth",
    "Giải trí": "Leisure",
  };
  const englishKey = labelToKeyMap[normalizedKey] || normalizedKey;
  return AREA_THEMES[englishKey] || AREA_THEMES.default;
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
            <Target className="h-5 w-5 text-app-accent/80 animate-pulse" />
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
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-app-line bg-app-surface px-4 py-2 text-xs font-bold text-app-accent/90 hover:bg-app-accent-soft hover:text-app-accent disabled:cursor-not-allowed disabled:text-app-ink-muted disabled:hover:bg-app-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 transition-all duration-200 shadow-app-sm hover:shadow-app-md"
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
                className="group flex gap-4 rounded-[14px] border border-app-line bg-app-surface p-4 hover:border-app-accent/20 hover:bg-app-bg-subtle/40 hover:shadow-app-md transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] ${theme.bg} group-hover:scale-105 transition-all duration-300`}
                >
                  <GoalIcon className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <h3 className="line-clamp-2 break-words text-sm font-bold leading-relaxed text-app-ink group-hover:text-app-accent transition-colors duration-200">
                    {goal.title}
                  </h3>
                  <p className="text-xs font-semibold tracking-wide text-app-ink-muted">
                    {getWeekLabel(goal)} · <span className={`${theme.accentText} font-bold`}>{domain}</span>
                  </p>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-800" aria-hidden="true">
                    <div
                      className={`h-full rounded-full ${theme.bar} transition-all duration-500 ease-out`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end justify-between gap-3 text-right">
                  <span className={`text-sm font-extrabold tabular-nums ${theme.accentText}`}>{progress}%</span>
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1 text-xs font-bold ${theme.accentText} hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 group-hover/btn:translate-x-0.5 transition-transform duration-200`}
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
