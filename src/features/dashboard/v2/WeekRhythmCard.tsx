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
  hasCheckIn: boolean;
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
  Tuần: { iconBg: "bg-app-accent-subtle text-app-accent" },
  "Tỷ lệ lead": { iconBg: "bg-app-accent-subtle text-app-accent" },
  Nhịp: { iconBg: "bg-app-accent-subtle text-app-accent" },
  Chuỗi: { iconBg: "bg-app-energy/10 text-app-energy" },
};

function hasDailyCheckIn(system: TwelveWeekSystem | null, dateKey: string): boolean {
  return system?.dailyCheckIns?.some((entry) => entry.date === dateKey && entry.didWorkToday) ?? false;
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
    hasCheckIn: false,
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
      hasCheckIn: hasDailyCheckIn(system, dateKey),
    };
  });
}

/**
 * Một cột nhịp/ngày thống nhất: chấm check-in (đã làm việc hôm đó) + cột thực
 * thi (tỷ lệ hoàn thành task) + số việc. Gộp hai hàng cũ (dots và bars) để giảm
 * trùng lặp thị giác — hợp hướng calm/gọn.
 */
function WeekRhythmColumn({ day }: { day: WeekDayProgress }) {
  const fillHeight = day.isFuture || day.total === 0 ? 0 : clamp(day.percent, 10, 100);
  const fillColor = day.isToday
    ? "var(--app-accent)"
    : day.percent === 100
      ? "var(--app-accent-active)"
      : "color-mix(in srgb, var(--app-accent) 42%, transparent)";

  const checkInClass = day.hasCheckIn
    ? "bg-app-accent"
    : day.isToday
      ? "bg-transparent ring-2 ring-inset ring-app-accent/45"
      : "bg-app-line-strong/35";

  return (
    <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
      <span className={`text-[10.5px] font-extrabold ${day.isToday ? "text-app-accent" : "text-app-ink-muted"}`}>
        {day.label}
      </span>
      <span
        className={`h-2 w-2 rounded-full ${checkInClass}`}
        title={
          day.isFuture
            ? `${day.label}: Tương lai`
            : day.hasCheckIn
              ? `${day.label}: Đã check-in`
              : `${day.label}: Chưa check-in`
        }
        aria-hidden="true"
      />
      <div
        className={`flex h-16 w-5 items-end overflow-hidden rounded-full bg-app-bg-subtle ${
          day.isToday ? "border-[1.5px] border-app-accent/50" : "border-[1.5px] border-transparent"
        }`}
        aria-hidden="true"
      >
        <div
          className="w-full rounded-full transition-all duration-300"
          style={{ height: `${fillHeight}%`, backgroundColor: fillColor }}
        />
      </div>
      <span
        className={`font-mono text-[10px] font-bold tabular-nums ${day.isToday ? "text-app-accent" : "text-app-ink-muted"}`}
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
      className="rounded-card glass-panel glass-panel-hover p-[22px]"
      aria-labelledby="dashboard-week-rhythm-title"
    >
      <div className="mb-5 border-b border-app-line pb-3.5">
        <h2
          id="dashboard-week-rhythm-title"
          className="mb-1.5 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-app-ink"
        >
          <Zap className="h-[15px] w-[15px] text-app-accent" />
          Nhịp tuần {safeWeek}
        </h2>
        <p className="text-[12px] leading-relaxed text-app-ink-soft">
          Đã hoàn thành <strong className="font-extrabold text-app-accent">{completedCount}</strong> trên tổng{" "}
          <strong className="font-extrabold text-app-ink">{totalCount}</strong> việc tuần này
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          const styles = KPI_CARD_STYLES[item.caption];

          return (
            <div
              key={item.caption}
              className="rounded-[14px] border border-app-line bg-app-bg-subtle/40 p-3.5 transition-colors duration-200 hover:border-app-accent/25"
            >
              <div className={`mb-2.5 flex size-[30px] items-center justify-center rounded-[9px] ${styles.iconBg}`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-app-ink-muted">
                {item.caption}
              </p>
              <p className="font-serif text-2xl font-extrabold leading-none text-app-ink">
                {item.numericValue !== undefined ? (
                  <CountUp value={item.numericValue} suffix={item.suffix ?? ""} precision={item.precision ?? 0} />
                ) : (
                  item.value
                )}
              </p>
              <p className="mt-1.5 text-[11px] font-medium text-app-ink-muted">{item.subLine}</p>
            </div>
          );
        })}
      </div>

      {/* Nhịp thực thi & check-in tuần — một dải thống nhất theo ngày */}
      <div className="rounded-[14px] border border-app-line bg-app-bg-subtle/40 px-4 py-3.5">
        <div className="mb-3.5 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-app-ink-muted">
            Nhịp thực thi & check-in
          </span>
          <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-app-ink-muted">
            <span className="h-2 w-2 rounded-full bg-app-accent" aria-hidden="true" />
            Đã check-in
          </span>
        </div>
        <div className="flex items-end justify-between gap-2.5">
          {days.map((day) => (
            <WeekRhythmColumn key={day.key} day={day} />
          ))}
        </div>
      </div>
    </section>
  );
}
