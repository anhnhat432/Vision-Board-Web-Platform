import { Calendar, Check, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";

import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import { useSyncedUserData } from "../../hooks/useSyncedUserData";
import { soundService } from "../../services/soundService";
import { useSetAssistantPageContext } from "../../features/assistant/AssistantPageContextProvider";
import {
  formatDateInputValue,
  getActiveTwelveWeekGoal,
  getTwelveWeekCurrentWeek,
  getTwelveWeekTasksForWeek,
  getTwelveWeekTodayTasks,
  getTwelveWeekWeekCompletion,
  getTwelveWeekWeekRange,
  parseCalendarDate,
  toggleTwelveWeekTask,
  type TwelveWeekSystem,
  type TwelveWeekTaskInstance,
  type UserData,
} from "../../utils/storage";

const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;

const MOCK_GOAL_TITLE = "Hoàn thành một chu kỳ phát triển bản thân rõ ràng";
const MOCK_CURRENT_WEEK = 4;
const MOCK_TOTAL_WEEKS = 12;
const MOCK_PROGRESS_PERCENT = 42;

const QUOTE = {
  text: "Điều nhỏ được làm đều đặn sẽ đổi hướng cả một mùa sống.",
  author: "Vision Board",
};

const LIFE_BALANCE_ROWS = [
  { label: "Sức khoẻ", aliases: ["Health"], fallbackScore: 7 },
  { label: "Sự nghiệp", aliases: ["Career", "Education"], fallbackScore: 6 },
  { label: "Mối quan hệ", aliases: ["Relationships", "Family"], fallbackScore: 8 },
  { label: "Tinh thần", aliases: ["Personal Growth", "Leisure"], fallbackScore: 5 },
] as const;

interface TodayTaskViewModel {
  id: string;
  title: string;
  domain: string;
  meta: string;
  completed: boolean;
  isCurrent: boolean;
  canToggle: boolean;
}

interface WeekDayProgress {
  key: string;
  label: string;
  completed: number;
  total: number;
  percent: number;
  isToday: boolean;
  isFuture: boolean;
}

interface LifeBalanceRow {
  label: string;
  score: number;
}

interface TodayV2ViewModel {
  dateCaption: string;
  currentWeek: number;
  totalWeeks: number;
  goalTitle: string;
  goalProgressPercent: number;
  tasks: TodayTaskViewModel[];
  todayCompletedCount: number;
  todayTotalCount: number;
  weekCompletedCount: number;
  weekTotalCount: number;
  weekDays: WeekDayProgress[];
  lifeBalanceRows: LifeBalanceRow[];
  lastSavedLabel: string;
  activeGoalId: string | null;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatTodayCaption(date: Date): string {
  const weekday = new Intl.DateTimeFormat("vi-VN", { weekday: "long" }).format(date);
  return `${weekday} · Ngày ${date.getDate()} tháng ${date.getMonth() + 1}`.toLocaleUpperCase("vi-VN");
}

function formatTaskMeta(task: TwelveWeekTaskInstance): string {
  const coreLabel = task.isCore ? "Cốt lõi" : "Bổ trợ";
  return `${coreLabel} · Hôm nay`;
}

function getOverallGoalProgress(system: TwelveWeekSystem | null): number {
  if (!system) return MOCK_PROGRESS_PERCENT;

  const tasks = system.taskInstances.filter((task) => !task.skipped);
  if (tasks.length === 0) return 0;

  const completed = tasks.filter((task) => task.completed).length;
  return Math.round((completed / tasks.length) * 100);
}

function buildTaskViewModels(tasks: TwelveWeekTaskInstance[], hasRealData: boolean): TodayTaskViewModel[] {
  if (!hasRealData) {
    return [
      {
        id: "mock-task-1",
        title: "Viết 25 phút cho mục tiêu chính",
        domain: "Tập trung sâu",
        meta: "25 phút · ưu tiên sáng",
        completed: false,
        isCurrent: true,
        canToggle: false,
      },
      {
        id: "mock-task-2",
        title: "Đi bộ hoặc vận động nhẹ",
        domain: "Sức khoẻ",
        meta: "20 phút · giữ năng lượng",
        completed: true,
        isCurrent: false,
        canToggle: false,
      },
      {
        id: "mock-task-3",
        title: "Ghi lại một điều học được",
        domain: "Tinh thần",
        meta: "5 phút · cuối ngày",
        completed: false,
        isCurrent: false,
        canToggle: false,
      },
    ];
  }

  const currentTaskId = tasks.find((task) => !task.completed)?.id ?? null;

  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    domain: task.leadIndicatorName,
    meta: formatTaskMeta(task),
    completed: task.completed,
    isCurrent: task.id === currentTaskId,
    canToggle: true,
  }));
}

function buildMockWeekDays(today: Date): WeekDayProgress[] {
  const mondayBasedIndex = (today.getDay() + 6) % 7;
  const samples = [
    { completed: 2, total: 3 },
    { completed: 1, total: 2 },
    { completed: 3, total: 3 },
    { completed: 1, total: 3 },
    { completed: 0, total: 2 },
    { completed: 0, total: 1 },
    { completed: 0, total: 1 },
  ];

  return samples.map((sample, index) => ({
    key: `mock-day-${index}`,
    label: WEEKDAY_LABELS[index],
    completed: sample.completed,
    total: sample.total,
    percent: sample.total === 0 ? 0 : Math.round((sample.completed / sample.total) * 100),
    isToday: index === mondayBasedIndex,
    isFuture: index > mondayBasedIndex,
  }));
}

function buildWeekDays(system: TwelveWeekSystem | null, currentWeek: number, today: Date): WeekDayProgress[] {
  if (!system) return buildMockWeekDays(today);

  const weekRange = getTwelveWeekWeekRange(system, currentWeek);
  const startDate = parseCalendarDate(weekRange.start);
  if (!startDate) return buildMockWeekDays(today);

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

function getLifeBalanceRows(userData: UserData | null): LifeBalanceRow[] {
  return LIFE_BALANCE_ROWS.map((row) => {
    const matchedArea = userData?.currentWheelOfLife.find((area) => row.aliases.some((alias) => alias === area.name));
    const score = Math.round(clamp(matchedArea?.score ?? row.fallbackScore, 0, 10));

    return {
      label: row.label,
      score,
    };
  });
}

function getLastSavedLabel(userData: UserData | null, tasks: TwelveWeekTaskInstance[]): string {
  const timestamps = [
    ...tasks.map((task) => task.lastModifiedAt ?? 0),
    ...tasks.map((task) => (task.completedAt ? Date.parse(task.completedAt) : 0)),
    ...(userData?.goals.map((goal) => Date.parse(goal.createdAt)) ?? []),
    ...(userData?.reflections.map((reflection) => Date.parse(reflection.date)) ?? []),
  ].filter((value) => Number.isFinite(value) && value > 0);

  if (timestamps.length === 0) return "vừa xong";

  const minutes = Math.max(0, Math.round((Date.now() - Math.max(...timestamps)) / 60000));
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;

  return `${Math.round(hours / 24)} ngày trước`;
}

function buildTodayV2ViewModel(userData: UserData | null, today: Date): TodayV2ViewModel {
  const activeGoal = userData ? getActiveTwelveWeekGoal(userData.goals) : null;
  const system = activeGoal?.twelveWeekSystem ?? null;
  const hasRealSystem = Boolean(system);
  const currentWeek = system ? getTwelveWeekCurrentWeek(system, today) : MOCK_CURRENT_WEEK;
  const totalWeeks = system?.totalWeeks ?? MOCK_TOTAL_WEEKS;
  const todayTasks = system ? getTwelveWeekTodayTasks(system, today) : [];
  const weekCompletion = system
    ? getTwelveWeekWeekCompletion(system, currentWeek)
    : { completed: 7, total: 14, percent: MOCK_PROGRESS_PERCENT };
  const tasks = buildTaskViewModels(todayTasks, hasRealSystem);
  const todayCompletedCount = tasks.filter((task) => task.completed).length;

  return {
    dateCaption: formatTodayCaption(today),
    currentWeek,
    totalWeeks,
    goalTitle: activeGoal?.title ?? MOCK_GOAL_TITLE,
    goalProgressPercent: getOverallGoalProgress(system),
    tasks,
    todayCompletedCount,
    todayTotalCount: tasks.length,
    weekCompletedCount: weekCompletion.completed,
    weekTotalCount: weekCompletion.total,
    weekDays: buildWeekDays(system, currentWeek, today),
    lifeBalanceRows: getLifeBalanceRows(userData),
    lastSavedLabel: getLastSavedLabel(userData, todayTasks),
    activeGoalId: activeGoal?.id ?? null,
  };
}

function TodayV2Hero({ viewModel }: { viewModel: TodayV2ViewModel }) {
  return (
    <section className="grid gap-6 md:grid-cols-[minmax(0,1fr)_260px] md:items-end">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">
            {viewModel.dateCaption}
          </p>
          <span className="rounded-full bg-app-accent-soft px-3 py-1 text-xs font-medium text-app-accent">
            Tuần {viewModel.currentWeek} / {viewModel.totalWeeks}
          </span>
        </div>
        <h1 className="mt-4 max-w-3xl font-serif text-4xl font-medium tracking-tight text-app-ink sm:text-5xl">
          Hôm nay là một ngày bình tĩnh để tiến từng bước.
        </h1>
      </div>

      <div className="surface-raised hidden rounded-2xl border border-app-line bg-app-surface p-5 md:block">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">12-Week Goal</p>
        <p className="mt-2 line-clamp-3 break-words text-sm font-medium leading-5 text-app-ink">
          {viewModel.goalTitle}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 w-[160px] overflow-hidden rounded-full bg-app-accent-soft" aria-hidden="true">
            <div className="h-full rounded-full bg-app-accent" style={{ width: `${viewModel.goalProgressPercent}%` }} />
          </div>
          <span className="text-xs font-semibold text-app-accent">{viewModel.goalProgressPercent}%</span>
        </div>
      </div>
    </section>
  );
}

function TaskCheckbox({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-label={checked ? "Đánh dấu chưa xong" : "Đánh dấu xong"}
      aria-pressed={checked}
      onClick={onToggle}
      className={`mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-[6px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 ${
        checked ? "border border-app-accent bg-app-accent text-white" : "border-[1.5px] border-app-line-strong bg-app-surface"
      }`}
    >
      {checked ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
    </button>
  );
}

function TodayTasksCard({
  tasks,
  completedCount,
  totalCount,
  activeGoalId,
  onTaskToggle,
}: {
  tasks: TodayTaskViewModel[];
  completedCount: number;
  totalCount: number;
  activeGoalId: string | null;
  onTaskToggle: (taskId: string, completed: boolean) => void;
}) {
  return (
    <section
      className="surface-raised rounded-xl border border-app-line bg-app-surface p-5 md:p-6"
      aria-labelledby="today-v2-tasks-title"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="today-v2-tasks-title" className="font-serif text-xl font-medium text-app-ink">
            Việc hôm nay
          </h2>
          <p className="mt-1 text-sm text-app-ink-muted">
            {completedCount} trong {totalCount} việc đã xong
          </p>
        </div>
        <Link
          to="/12-week-system?tab=week"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-app-accent px-3 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-app-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
        >
          <Plus className="h-3.5 w-3.5" />
          Thêm việc
        </Link>
      </div>

      <div className="mt-5 space-y-1">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`flex items-start gap-3 rounded-xl border border-app-line bg-app-bg px-3 py-3 ${
              task.isCurrent ? "bg-app-bg ring-1 ring-app-accent/15" : ""
            }`}
          >
            <TaskCheckbox
              checked={task.completed}
              onToggle={() => {
                if (!task.canToggle || !activeGoalId) return;
                onTaskToggle(task.id, !task.completed);
              }}
            />
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-medium leading-5 ${task.completed ? "text-app-ink-muted line-through" : "text-app-ink"}`}
              >
                {task.title}
              </p>
              <p className="mt-0.5 text-xs text-app-ink-muted">
                {task.domain} · {task.meta}
              </p>
            </div>
            {task.isCurrent ? (
              <span className="mt-0.5 shrink-0 rounded-full bg-app-accent-soft px-2.5 py-1 text-xs font-medium text-app-accent">
                Đang làm
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
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
    <div className="flex snap-start flex-col items-center gap-2 text-center">
      <span className="text-xs font-medium text-app-ink-muted">{day.label}</span>
      {barContent}
      <span className="text-xs tabular-nums text-app-ink-muted">
        {day.completed}/{day.total}
      </span>
    </div>
  );
}

function WeekProgressCard({
  currentWeek,
  completedCount,
  totalCount,
  days,
}: {
  currentWeek: number;
  completedCount: number;
  totalCount: number;
  days: WeekDayProgress[];
}) {
  return (
    <section
      className="surface-raised rounded-xl border border-app-line bg-app-surface p-5 md:p-6"
      aria-labelledby="today-v2-week-title"
    >
      <div>
        <h2 id="today-v2-week-title" className="font-serif text-xl font-medium text-app-ink">
          Tuần {currentWeek} · Tiến độ
        </h2>
        <p className="mt-1 text-sm text-app-ink-muted">
          {completedCount}/{totalCount} việc
        </p>
      </div>

      <div className="-mx-1 mt-5 overflow-x-auto pb-2">
        <div className="grid min-w-[420px] snap-x grid-cols-7 gap-2 px-1 max-[374px]:min-w-0 max-[374px]:grid-cols-4">
          {days.map((day) => (
            <WeekProgressDay key={day.key} day={day} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ReflectionPrompt() {
  return (
    <section
      className="surface-raised rounded-xl border border-app-warm-border bg-app-warm-soft p-5 md:p-6"
      aria-labelledby="today-v2-reflection-title"
    >
      <span className="inline-flex rounded-full bg-app-warm-soft px-3 py-1 text-xs font-medium text-app-warm ring-1 ring-app-warm-border">
        Phản tư cuối ngày
      </span>
      <h2
        id="today-v2-reflection-title"
        className="mt-4 font-serif text-2xl font-medium leading-7 text-app-warm-strong"
      >
        Hôm nay điều gì khiến bạn cảm thấy gần với phiên bản tốt hơn của chính mình?
      </h2>
      <Link
        to="/journal"
        className="mt-5 inline-flex rounded-lg bg-app-warm px-3.5 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-app-warm-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-warm/30"
      >
        Viết phản tư →
      </Link>
    </section>
  );
}

function LifeBalanceCard({ rows }: { rows: LifeBalanceRow[] }) {
  return (
    <section
      className="surface-raised rounded-xl border border-app-line bg-app-surface p-5 md:p-6"
      aria-labelledby="today-v2-balance-title"
    >
      <div>
        <h2 id="today-v2-balance-title" className="font-serif text-xl font-medium text-app-ink">
          Cân bằng cuộc sống
        </h2>
        <p className="mt-1 text-sm text-app-ink-muted">Tuần này so với mục tiêu</p>
      </div>

      <div className="mt-5 space-y-4">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-app-ink-soft">{row.label}</span>
              <span className="text-xs tabular-nums text-app-ink-muted">{row.score}/10</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-app-bg-subtle" aria-hidden="true">
              <div className="h-full rounded-full bg-app-accent" style={{ width: `${row.score * 10}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function QuoteBlock() {
  return (
    <figure className="px-4 text-center">
      <blockquote className="font-serif text-sm italic leading-6 text-app-ink-soft">“{QUOTE.text}”</blockquote>
      <figcaption className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-app-ink-muted">
        {QUOTE.author}
      </figcaption>
    </figure>
  );
}

function TodayV2Footer({ lastSavedLabel }: { lastSavedLabel: string }) {
  return (
    <footer className="border-t border-app-line py-5 text-xs text-app-ink-muted">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span>Đã lưu cục bộ · {lastSavedLabel}</span>
        <span>Hôm nay · Dear Our Future</span>
      </div>
    </footer>
  );
}

function TodayV2EmptyState({ onNavigate }: { onNavigate: (href: string) => void }) {
  return (
    <div className="min-h-screen bg-app-bg text-app-ink">
      <div className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
        <section className="surface-empty rounded-2xl border border-dashed border-app-line bg-app-bg/50 p-8 text-center md:p-12">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-app-accent-soft text-app-accent">
            <Calendar className="h-7 w-7" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-accent">HÔM NAY</p>
          <h1 className="mt-3 font-serif text-3xl font-medium leading-tight text-app-ink">
            Bạn chưa có chu kỳ 12 tuần đang chạy.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-app-ink-soft">
            Tạo một mục tiêu 12 tuần để Hôm nay biết bạn nên làm gì, tuần đang ở đâu và khi nào cần review.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Button type="button" onClick={() => onNavigate("/12-week-setup")}>Tạo mục tiêu 12 tuần</Button>
            <Button type="button" variant="outline" onClick={() => onNavigate("/")}>Về Trang chính</Button>
          </div>
        </section>
      </div>
    </div>
  );
}

export function TodaySkeleton() {
  return (
    <div className="min-h-screen bg-app-bg text-app-ink" aria-busy="true">
      <div className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
        <section className="grid gap-6 md:grid-cols-[minmax(0,1fr)_260px] md:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-4 w-36 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="mt-5 h-12 w-full max-w-3xl rounded-xl sm:h-16" />
            <Skeleton className="mt-3 h-12 w-4/5 max-w-2xl rounded-xl sm:h-16" />
          </div>
          <div className="surface-raised hidden rounded-2xl border border-app-line bg-app-surface p-5 md:block">
            <Skeleton className="h-4 w-28 rounded-full" />
            <Skeleton className="mt-3 h-14 w-full rounded-xl" />
            <Skeleton className="mt-5 h-2 w-full rounded-full" />
          </div>
        </section>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <section className="surface-raised rounded-xl border border-app-line bg-app-surface p-5 md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Skeleton className="h-7 w-44 rounded-lg" />
                  <Skeleton className="mt-2 h-4 w-32 rounded-full" />
                </div>
                <Skeleton className="h-7 w-20 rounded-full" />
              </div>
              <div className="mt-5 space-y-3">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="rounded-xl border border-app-line bg-app-bg p-4">
                    <div className="flex gap-3">
                      <Skeleton className="size-11 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-4/5 rounded-lg" />
                        <Skeleton className="h-4 w-2/5 rounded-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section className="surface-raised rounded-xl border border-app-line bg-app-surface p-5 md:p-6">
              <Skeleton className="h-7 w-40 rounded-lg" />
              <div className="mt-5 grid min-w-[420px] grid-cols-7 gap-2 overflow-hidden max-[374px]:min-w-0 max-[374px]:grid-cols-4">
                {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((dayKey) => (
                  <Skeleton key={dayKey} className="h-24 rounded-xl" />
                ))}
              </div>
            </section>
          </div>
          <aside className="space-y-5">
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-52 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </aside>
        </div>
      </div>
    </div>
  );
}

export function TodayV2Page() {
  const navigate = useNavigate();
  const { userData, reloadUserData } = useSyncedUserData();
  const [isHydrating, setIsHydrating] = useState(true);
  const today = useMemo(() => new Date(), []);
  const viewModel = useMemo(() => buildTodayV2ViewModel(userData, today), [userData, today]);
  const hasRealSystem = Boolean(viewModel.activeGoalId);

  useSetAssistantPageContext({
    pageType: "today",
    hint: "Đang xem task hôm nay",
  });

  useEffect(() => {
    const timerId = window.setTimeout(() => setIsHydrating(false), 80);
    return () => window.clearTimeout(timerId);
  }, []);

  const handleTaskToggle = (taskId: string, completed: boolean) => {
    if (!viewModel.activeGoalId) return;
    toggleTwelveWeekTask(viewModel.activeGoalId, taskId, completed);
    if (completed) {
      soundService.click();
    }
    reloadUserData();
  };

  if (isHydrating) {
    return <TodaySkeleton />;
  }

  if (!hasRealSystem) {
    return <TodayV2EmptyState onNavigate={navigate} />;
  }

  return (
    <div className="min-h-screen bg-app-bg text-app-ink">
      <div className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
        <TodayV2Hero viewModel={viewModel} />

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <TodayTasksCard
              tasks={viewModel.tasks}
              completedCount={viewModel.todayCompletedCount}
              totalCount={viewModel.todayTotalCount}
              activeGoalId={viewModel.activeGoalId}
              onTaskToggle={handleTaskToggle}
            />
            <WeekProgressCard
              currentWeek={viewModel.currentWeek}
              completedCount={viewModel.weekCompletedCount}
              totalCount={viewModel.weekTotalCount}
              days={viewModel.weekDays}
            />
          </div>

          <aside className="space-y-5">
            <ReflectionPrompt />
            <LifeBalanceCard rows={viewModel.lifeBalanceRows} />
            <QuoteBlock />
          </aside>
        </div>

        <TodayV2Footer lastSavedLabel={viewModel.lastSavedLabel} />
      </div>
    </div>
  );
}
