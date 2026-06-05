import { CalendarDays, Clock3, Flame, TrendingUp, Zap } from "lucide-react";

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

const KPI_CARD_STYLES = {
  Tuần: {
    bg: "bg-white/70 dark:bg-neutral-950/30 border-neutral-200/50 dark:border-neutral-850/60 hover:border-app-accent/30 hover:bg-white dark:hover:bg-neutral-950/80 -rotate-[0.8deg] hover:rotate-0 hover:scale-[1.03] hover:shadow-app-sm transition-all duration-300",
    iconBg: "bg-neutral-50 dark:bg-neutral-900 text-app-accent border border-neutral-200/50 dark:border-neutral-800/50",
  },
  "Tỷ lệ lead": {
    bg: "bg-white/70 dark:bg-neutral-950/30 border-neutral-200/50 dark:border-neutral-850/60 hover:border-app-accent/30 hover:bg-white dark:hover:bg-neutral-950/80 rotate-[0.6deg] hover:rotate-0 hover:scale-[1.03] hover:shadow-app-sm transition-all duration-300",
    iconBg: "bg-neutral-50 dark:bg-neutral-900 text-app-accent border border-neutral-200/50 dark:border-neutral-800/50",
  },
  Nhịp: {
    bg: "bg-white/70 dark:bg-neutral-950/30 border-neutral-200/50 dark:border-neutral-850/60 hover:border-app-accent/30 hover:bg-white dark:hover:bg-neutral-950/80 -rotate-[0.6deg] hover:rotate-0 hover:scale-[1.03] hover:shadow-app-sm transition-all duration-300",
    iconBg: "bg-neutral-50 dark:bg-neutral-900 text-app-accent border border-neutral-200/50 dark:border-neutral-800/50",
  },
  Chuỗi: {
    bg: "bg-white/70 dark:bg-neutral-950/30 border-neutral-200/50 dark:border-neutral-850/60 hover:border-app-accent/30 hover:bg-white dark:hover:bg-neutral-950/80 rotate-[0.8deg] hover:rotate-0 hover:scale-[1.03] hover:shadow-app-sm transition-all duration-300",
    iconBg: "bg-neutral-50 dark:bg-neutral-900 text-app-accent border border-neutral-200/50 dark:border-neutral-800/50",
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
        <div
          className="h-16 w-5 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-transparent"
          aria-hidden="true"
        />
      );
    }

    if (day.isToday) {
      const fillHeight = day.total === 0 ? 0 : clamp(day.percent, 12, 100);
      return (
        <div
          className="flex h-16 w-5 items-end rounded-full bg-neutral-100 dark:bg-neutral-900 border border-app-accent/40 shadow-inner"
          aria-hidden="true"
        >
          <div
            className="w-full rounded-full bg-gradient-to-t from-app-accent to-[#5ba590] animate-pulse"
            style={{ height: `${fillHeight}%` }}
          />
        </div>
      );
    }

    const fillHeight = day.total === 0 ? 0 : clamp(day.percent, 12, 100);
    return (
      <div
        className="flex h-16 w-5 items-end rounded-full bg-neutral-100 dark:bg-neutral-900 border border-transparent shadow-inner"
        aria-hidden="true"
      >
        <div
          className={`w-full rounded-full transition-all duration-300 ${
            day.percent === 100
              ? "bg-gradient-to-t from-app-accent/80 to-[#5ba590]/90 group-hover:from-app-accent group-hover:to-[#5ba590]"
              : "bg-gradient-to-t from-app-accent/40 to-[#5ba590]/40 group-hover:from-app-accent/60 group-hover:to-[#5ba590]/60"
          }`}
          style={{ height: `${fillHeight}%` }}
        />
      </div>
    );
  })();

  return (
    <div className="group flex flex-col items-center gap-1.5 text-center transition-all duration-300 hover:scale-105">
      <span className={`text-[10px] font-bold ${day.isToday ? "text-app-accent font-extrabold" : "text-neutral-400"}`}>
        {day.label}
      </span>
      {barContent}
      <span
        className={`text-[9px] tabular-nums font-bold ${day.isToday ? "text-app-accent font-extrabold" : "text-neutral-500"}`}
      >
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
    value?: string;
    numericValue?: number;
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
      ...(wheelScoreReady ? { numericValue: wheelScore, precision: 1 } : { value: "--" }),
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
      className="rounded-3xl border border-neutral-200/70 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/10 backdrop-blur-md p-6 shadow-[0_4px_24px_rgba(0,0,0,0.005)] transition-all duration-300 hover:border-app-accent/25 hover:shadow-[0_8px_32px_rgba(0,0,0,0.015)] overflow-hidden relative select-none"
      aria-labelledby="dashboard-week-rhythm-title"
    >
      {/* Grid Pattern overlay for texture */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808004_1px,transparent_1px),linear-gradient(to_bottom,#80808004_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

      {/* Ambient glow mesh */}
      <div className="pointer-events-none absolute -right-20 -bottom-20 h-48 w-48 rounded-full bg-app-accent/5 blur-[50px]" />

      {/* 📌 Floating wood pin at the header */}
      <span className="hidden sm:inline absolute -top-3 left-6 text-xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.05)] transition-transform duration-300 hover:rotate-12 cursor-default z-10">
        📌
      </span>

      <div className="flex flex-col gap-1 border-b border-neutral-200/50 dark:border-neutral-800/55 pb-4 mb-6 pt-2 relative z-10">
        <h2
          id="dashboard-week-rhythm-title"
          className="text-xs font-bold uppercase tracking-[0.2em] text-app-ink-soft flex items-center gap-2"
        >
          <Zap className="h-4.5 w-4.5 text-app-accent/80" />
          Nhịp tuần {safeWeek}
        </h2>
        <p className="text-xs font-semibold tracking-wide text-neutral-500">
          Đã hoàn thành <span className="text-app-accent font-extrabold">{completedCount}</span> trên tổng số{" "}
          <span className="text-neutral-700 dark:text-neutral-300 font-extrabold">{totalCount}</span> việc tuần này
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 relative z-10">
        {stats.map((item, _index) => {
          const Icon = item.icon;
          const styles = KPI_CARD_STYLES[item.caption];

          return (
            <div
              key={item.caption}
              className={`rounded-2xl border ${styles.bg} p-4 shadow-sm hover:-translate-y-0.5 transition-all duration-350 relative`}
            >
              <div className="flex items-center justify-between">
                <div className={`p-1.5 rounded-xl ${styles.iconBg}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>

              <p className="mt-4 text-[9px] font-bold uppercase tracking-[0.16em] text-neutral-400">{item.caption}</p>

              <p className="mt-1 font-serif text-2xl font-semibold leading-none text-neutral-800 dark:text-neutral-200">
                {item.numericValue !== undefined ? (
                  <CountUp value={item.numericValue} suffix={item.suffix ?? ""} precision={item.precision ?? 0} />
                ) : (
                  item.value
                )}
              </p>

              <p className="mt-2 text-[9px] font-semibold text-neutral-400">{item.subLine}</p>
            </div>
          );
        })}
      </div>

      {/* Daily Checkins dots */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/60 dark:bg-neutral-900/20 px-5 py-3 shadow-[inset_0_1px_2px_rgba(0,0,0,0.005)]">
        <span className="text-xs font-semibold text-neutral-500">Nhịp check-in hàng ngày:</span>
        <div className="flex items-center gap-3">
          {days.map((day) => {
            const hasCheckIn = system?.dailyCheckIns?.some((c) => c.date === day.key && c.didWorkToday) ?? false;
            let dotClass = "";
            let tooltipText = "";

            if (day.isFuture) {
              dotClass = "bg-neutral-200/60 dark:bg-neutral-800 border-transparent";
              tooltipText = `${day.label}: Tương lai`;
            } else if (hasCheckIn) {
              dotClass = "bg-app-accent border-transparent shadow-[0_2px_6px_rgba(47,93,80,0.2)]";
              tooltipText = `${day.label}: Đã check-in`;
            } else {
              dotClass = "bg-transparent border border-neutral-200 dark:border-neutral-800";
              tooltipText = `${day.label}: Chưa check-in`;
            }

            return (
              <div key={day.key} className="flex flex-col items-center gap-1.5" title={tooltipText}>
                <div className="relative flex items-center justify-center h-4 w-4">
                  {day.isToday && (
                    <span className="absolute inline-flex h-full w-full rounded-full bg-app-accent/10 scale-125" />
                  )}
                  <div
                    className={`h-2 w-2 rounded-full transition-all duration-300 ${dotClass} ${
                      day.isToday ? "ring-1 ring-app-accent/30" : ""
                    }`}
                  />
                </div>
                <span
                  className={`text-[9px] font-extrabold uppercase tracking-wider ${day.isToday ? "text-app-accent" : "text-neutral-400"}`}
                >
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 border-t border-neutral-200/80 dark:border-neutral-800/80 pt-6">
        <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider text-neutral-500">
          <Clock3 className="h-4 w-4 text-app-accent/80" />
          Nhịp độ thực thi hàng ngày
        </div>
        <div className="grid grid-cols-7 gap-2 sm:gap-4 max-w-sm mx-auto pt-2">
          {days.map((day) => (
            <WeekProgressDay key={day.key} day={day} />
          ))}
        </div>
      </div>
    </section>
  );
}
