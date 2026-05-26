import { CalendarDays, Flame, TrendingUp, Zap } from "lucide-react";

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

function getBarOpacity(percent: number): number {
  if (percent >= 80) return 0.85;
  if (percent >= 40) return 0.6;
  return 0.4;
}

function WeekProgressDay({ day }: { day: WeekDayProgress }) {
  const barContent = (() => {
    if (day.isFuture) {
      return (
        <div className="h-12 w-5 rounded-md border border-dashed border-app-line bg-transparent" aria-hidden="true" />
      );
    }

    if (day.isToday) {
      const fillHeight = day.total === 0 ? 18 : clamp(day.percent, 18, 100);
      return (
        <div
          className="flex h-12 w-5 items-end rounded-md bg-app-accent-soft ring-2 ring-app-accent"
          aria-hidden="true"
        >
          <div className="w-full rounded-md bg-app-accent" style={{ height: `${fillHeight}%` }} />
        </div>
      );
    }

    return (
      <div
        className="h-12 w-5 rounded-md bg-app-accent"
        style={{ opacity: getBarOpacity(day.percent) }}
        aria-hidden="true"
      />
    );
  })();

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="text-xs font-medium text-app-ink-muted">{day.label}</span>
      {barContent}
      <span className="text-xs tabular-nums text-app-ink-muted">
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
    caption: string;
    /** When set, render `value` static (e.g. composite strings like "5/12"). */
    value?: string;
    /** When set, render an animated CountUp that respects reduced-motion. */
    numericValue?: number;
    /** Display formatter for numericValue. */
    suffix?: string;
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
      className="surface-raised rounded-xl border border-app-line bg-app-surface p-5 md:p-6"
      aria-labelledby="dashboard-week-rhythm-title"
    >
      <div>
        <h2 id="dashboard-week-rhythm-title" className="text-base font-semibold text-app-ink">
          Nhịp tuần {safeWeek}
        </h2>
        <p className="mt-1 text-sm text-app-ink-muted">
          {completedCount}/{totalCount} việc tuần này
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.caption} className="rounded-xl border border-app-line bg-app-bg p-3">
              <Icon className="h-4 w-4 text-app-accent" />
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted">
                {item.caption}
              </p>
              <p className="mt-1 font-serif text-3xl font-medium leading-none text-app-ink sm:text-3xl">
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
              <p className="mt-2 text-xs text-app-ink-muted">{item.subLine}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 border-t border-app-line pt-5">
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => (
            <WeekProgressDay key={day.key} day={day} />
          ))}
        </div>
      </div>
    </section>
  );
}
