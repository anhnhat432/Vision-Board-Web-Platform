import { CalendarDays, Flame, TrendingUp, Zap, Clock3 } from "lucide-react";

import { CountUp } from "@/app/components/ui/count-up";
import {
  formatDateInputValue,
  getTwelveWeekTasksForWeek,
  getTwelveWeekWeekRange,
  parseCalendarDate,
  type TwelveWeekSystem,
} from "@/app/utils/storage";

const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;

interface WeekDayProgress {
  key: string;
  label: string;
  completed: number;
  total: number;
  percent: number;
  isToday: boolean;
  isFuture: boolean;
}

interface WeekRhythmCardProps {
  system: TwelveWeekSystem | null;
  currentWeek: number | null;
  totalWeeks: number;
  completedCount: number;
  totalCount: number;
  leadAverage: number;
  wheelScore: number;
  streak: number;
  today?: Date;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return clamp(Math.round(value), 0, 100);
}

// Custom HSL gradients for KPI Cards
const KPI_CARD_STYLES = {
  "Tuần": {
    bg: "bg-gradient-to-br from-indigo-500/5 to-transparent border-indigo-200/50 dark:border-indigo-900/30",
    text: "text-indigo-600 dark:text-indigo-400",
    iconBg: "bg-indigo-50 dark:bg-indigo-950/40",
  },
  "Tỷ lệ lead": {
    bg: "bg-gradient-to-br from-emerald-500/5 to-transparent border-emerald-200/50 dark:border-emerald-900/30",
    text: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
  },
  "Nhịp": {
    bg: "bg-gradient-to-br from-amber-500/5 to-transparent border-amber-200/50 dark:border-amber-900/30",
    text: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-50 dark:bg-amber-950/40",
  },
  "Chuỗi": {
    bg: "bg-gradient-to-br from-rose-500/5 to-transparent border-rose-200/50 dark:border-rose-900/30",
    text: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-50 dark:bg-rose-950/40",
  },
};

function buildEmptyWeekDays(today: Date): WeekDayProgress[] {
  const mondayBasedIndex = (today.getDay() + 6) % 7;

  return WEEKDAY_LABELS.map((label, index) => ({
    key: `empty-day-${index}`,
    label,
    completed: 0,
    total: 0,
    percent: 0,
    isToday: index === mondayBasedIndex,
    isFuture: index > mondayBasedIndex,
  }));
}

function buildWeekDays(system: TwelveWeekSystem | null, currentWeek: number | null, today: Date): WeekDayProgress[] {
  if (!system || !currentWeek) return buildEmptyWeekDays(today);

  const weekRange = getTwelveWeekWeekRange(system, currentWeek);
  const startDate = parseCalendarDate(weekRange.start);
  if (!startDate) return buildEmptyWeekDays(today);

  const todayKey = formatDateInputValue(today);
  const weekTasks = getTwelveWeekTasksForWeek(system, currentWeek).filter((task) => !task.skipped);

  return WEEKDAY_LABELS.map((label, index) => {
    const date = addDays(startDate, index);
    const dateKey = formatDateInputValue(date);
    const dayTasks = weekTasks.filter((task) => task.scheduledDate === dateKey);
    const completed = dayTasks.filter((task) => task.completed).length;
    const total = dayTasks.length;

    return {
      key: dateKey,
      label,
      completed,
      total,
      percent: total === 0 ? 0 : Math.round((completed / total) * 100),
      isToday: dateKey === todayKey,
      isFuture: dateKey > todayKey,
    };
  });
}

function WeekProgressDay({ day }: { day: WeekDayProgress }) {
  const barContent = (() => {
    if (day.isFuture) {
      return (
        <div className="h-16 w-5.5 rounded-full border border-dashed border-slate-300 bg-transparent dark:border-slate-800" aria-hidden="true" />
      );
    }

    if (day.isToday) {
      const fillHeight = day.total === 0 ? 18 : clamp(day.percent, 18, 100);
      return (
        <div
          className="flex h-16 w-5.5 items-end rounded-full bg-emerald-100 dark:bg-emerald-950/40 ring-2 ring-emerald-400 ring-offset-1 dark:ring-offset-slate-900 shadow-[0_0_8px_rgba(52,211,153,0.3)]"
          aria-hidden="true"
        >
          <div className="w-full rounded-full bg-gradient-to-t from-emerald-500 to-teal-400" style={{ height: `${fillHeight}%` }} />
        </div>
      );
    }

    // Past day bar chart fill representation
    const fillHeight = day.total === 0 ? 0 : clamp(day.percent, 10, 100);
    return (
      <div className="flex h-16 w-5.5 items-end rounded-full bg-slate-100 dark:bg-slate-800/50" aria-hidden="true">
        <div
          className="w-full rounded-full bg-gradient-to-t from-emerald-600/70 to-teal-400/70"
          style={{ height: `${fillHeight}%` }}
        />
      </div>
    );
  })();

  return (
    <div className="flex flex-col items-center gap-2 text-center group hover:scale-[1.05] transition-transform duration-200">
      <span className={`text-xs font-bold ${day.isToday ? "text-emerald-500 font-extrabold" : "text-app-ink-muted"}`}>{day.label}</span>
      {barContent}
      <span className={`text-[10px] tabular-nums font-bold ${day.isToday ? "text-emerald-500" : "text-app-ink-muted"}`}>
        {day.completed}/{day.total}
      </span>
    </div>
  );
}

export function WeekRhythmCard({
  system,
  currentWeek,
  totalWeeks,
  completedCount,
  totalCount,
  leadAverage,
  wheelScore,
  streak,
  today = new Date(),
}: WeekRhythmCardProps) {
  const days = buildWeekDays(system, currentWeek, today);
  const safeWeek = currentWeek ?? "--";
  const wheelScoreReady = Number.isFinite(wheelScore) && wheelScore > 0;
  const stats: Array<{
    icon: typeof CalendarDays;
    caption: "Tuần" | "Tỷ lệ lead" | "Nhịp" | "Chuỗi";
    /** When set, render `value` static (e.g. composite strings like "5/12"). */
    value?: string;
    /** When set, render an animated CountUp that respects reduced-motion. */
    numericValue?: number;
    /** Display formatter for numericValue. */
    suffix?: string;
    /** Precision for numeric value. */
    precision?: number;
    subLine: string;
  }> = [
    {
      icon: CalendarDays,
      caption: "Tuần",
      value: `${safeWeek}/${totalWeeks}`,
      subLine: "trong chu kỳ",
    },
    {
      icon: TrendingUp,
      caption: "Tỷ lệ lead",
      numericValue: clampPercent(leadAverage),
      suffix: "%",
      subLine: "hoàn thành tuần",
    },
    {
      icon: Zap,
      caption: "Nhịp",
      ...(wheelScoreReady
        ? { numericValue: wheelScore, precision: 1 }
        : { value: "--" }),
      subLine: "điểm cuộc sống",
    },
    {
      icon: Flame,
      caption: "Chuỗi",
      numericValue: streak,
      subLine: "tuần giữ nhịp",
    },
  ];

  return (
    <section
      data-testid="dashboard-kpi-row"
      className="surface-raised rounded-xl border border-app-line bg-app-surface p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow duration-300"
      aria-labelledby="dashboard-week-rhythm-title"
    >
      <div className="flex flex-col gap-1 border-b border-app-line pb-4 mb-5">
        <h2 id="dashboard-week-rhythm-title" className="text-base font-bold text-app-ink flex items-center gap-2">
          <Zap className="h-5 w-5 text-emerald-500 animate-pulse" />
          Nhịp tuần {safeWeek}
        </h2>
        <p className="text-xs font-semibold tracking-wide text-app-ink-muted">
          Đã hoàn thành <span className="text-emerald-500 font-extrabold">{completedCount}</span> trên tổng số <span className="text-app-ink font-extrabold">{totalCount}</span> việc tuần này
        </p>
      </div>

      {/* Stats Cards V2 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          const styles = KPI_CARD_STYLES[item.caption];

          return (
            <div
              key={item.caption}
              className={`rounded-xl border p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${styles.bg}`}
            >
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${styles.iconBg} ${styles.text}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-app-ink-muted">
                {item.caption}
              </p>
              <p className="mt-1 font-serif text-3xl font-bold leading-none text-app-ink">
                {item.numericValue !== undefined ? (
                  <CountUp
                    value={item.numericValue}
                    suffix={item.suffix ?? ""}
                    precision={item.precision ?? 0}
                  />
                ) : (
                  item.value
                )}
              </p>
              <p className="mt-2 text-[10px] font-semibold text-app-ink-muted">{item.subLine}</p>
            </div>
          );
        })}
      </div>

      {/* Week Progress Bar Chart V2 */}
      <div className="mt-6 border-t border-app-line pt-6">
        <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider text-app-ink-muted">
          <Clock3 className="h-4 w-4 text-emerald-500" />
          Nhịp độ thực thi hàng ngày
        </div>
        <div className="grid grid-cols-7 gap-2.5 max-w-md mx-auto pt-2">
          {days.map((day) => (
            <WeekProgressDay key={day.key} day={day} />
          ))}
        </div>
      </div>
    </section>
  );
}
