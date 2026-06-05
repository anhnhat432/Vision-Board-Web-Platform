import { formatDateInputValue, getCalendarDateKey, getCalendarDayIndex, parseCalendarDate } from "./storage-date-utils";
import type {
  Goal,
  LeadIndicator,
  LeadIndicatorCommitment,
  TacticType,
  TwelveWeekSystem,
  TwelveWeekTaskInstance,
  UniversalDailyCheckIn,
  UniversalScoreboardWeek,
  UniversalWeeklyReview,
  UserData,
  WeeklyPlanEntry,
} from "./storage-types";

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function addCalendarDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getLegacyPhaseName(weekNumber: number): string {
  if (weekNumber <= 4) return "Khởi động";
  if (weekNumber <= 8) return "Bứt phá";
  return "Hoàn tất / Thực hiện";
}

function getWeekStartOffset(weekStartsOn: TwelveWeekSystem["weekStartsOn"]): number {
  return weekStartsOn === "Sunday" ? 0 : 1;
}

export function getStartOfWeek(date: Date, weekStartsOn: TwelveWeekSystem["weekStartsOn"]): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const offset = getWeekStartOffset(weekStartsOn);
  const delta = (start.getDay() - offset + 7) % 7;
  start.setDate(start.getDate() - delta);
  return start;
}

function inferSystemStartDate(system: TwelveWeekSystem): Date {
  const weekStartsOn = system.weekStartsOn ?? "Monday";
  const parsedStartDate = parseCalendarDate(system.startDate ?? "");

  if (parsedStartDate) {
    return getStartOfWeek(parsedStartDate, weekStartsOn);
  }

  const currentWeek = clampNumber(system.currentWeek || 1, 1, Math.max(system.totalWeeks || 12, 1));
  const inferredToday = getStartOfWeek(new Date(), weekStartsOn);
  return addCalendarDays(inferredToday, (currentWeek - 1) * -7);
}

function getUnclampedTwelveWeekNumber(system: TwelveWeekSystem, referenceDate = new Date()): number {
  const startDate = inferSystemStartDate(system);
  const calculatedWeek = Math.floor((getCalendarDayIndex(referenceDate) - getCalendarDayIndex(startDate)) / 7) + 1;

  return Math.max(system.currentWeek || 1, calculatedWeek, 1);
}

export function getTwelveWeekCycleWeekNumber(system: TwelveWeekSystem, referenceDate = new Date()): number {
  return getUnclampedTwelveWeekNumber(system, referenceDate);
}

export function isTwelveWeekCycleReviewPhase(system: TwelveWeekSystem, referenceDate = new Date()): boolean {
  return (
    system.status === "completed" || getUnclampedTwelveWeekNumber(system, referenceDate) > (system.totalWeeks || 12)
  );
}

export function getCycleEndDate(startDate: Date, totalWeeks: number): Date {
  return addCalendarDays(startDate, totalWeeks * 7 - 1);
}

function getLeadTargetCount(target: string): number {
  const parsed = Number.parseInt(target, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return clampNumber(parsed, 1, 7);
  }

  return 1;
}

function buildLeadIndicatorId(name: string, index: number): string {
  const normalizedName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `tactic_${normalizedName || "item"}_${index + 1}`;
}

const COMMITMENT_FIELDS = ["want", "cost", "means", "tradeoff", "reward"] as const;

function normalizeCommitmentValue(value: unknown): LeadIndicatorCommitment | undefined {
  if (!value || typeof value !== "object") return undefined;

  const source = value as Partial<Record<(typeof COMMITMENT_FIELDS)[number] | "filledAt", unknown>>;
  const commitment: LeadIndicatorCommitment = {
    want: typeof source.want === "string" ? source.want : "",
    cost: typeof source.cost === "string" ? source.cost : "",
    means: typeof source.means === "string" ? source.means : "",
    tradeoff: typeof source.tradeoff === "string" ? source.tradeoff : "",
    reward: typeof source.reward === "string" ? source.reward : "",
  };

  if (typeof source.filledAt === "string" && source.filledAt.trim()) {
    commitment.filledAt = source.filledAt;
  }

  return COMMITMENT_FIELDS.some((field) => commitment[field].trim().length > 0) ? commitment : undefined;
}

export function hasFilledCommitment(indicator: Partial<LeadIndicator>): boolean {
  return Boolean(normalizeCommitmentValue(indicator.commitment));
}

function getTaskOffsetsForFrequency(frequency: number): number[] {
  const normalized = clampNumber(frequency, 1, 7);

  switch (normalized) {
    case 1:
      return [1];
    case 2:
      return [1, 4];
    case 3:
      return [1, 3, 5];
    case 4:
      return [0, 2, 4, 6];
    case 5:
      return [0, 1, 2, 4, 6];
    case 6:
      return [0, 1, 2, 3, 4, 6];
    default:
      return [0, 1, 2, 3, 4, 5, 6];
  }
}

function normalizeScheduleOffsets(schedule: number[] | undefined, target: string, preferredDays?: number[]): number[] {
  if (Array.isArray(schedule) && schedule.length > 0) {
    return Array.from(new Set(schedule.map((offset) => clampNumber(offset, 0, 6)))).sort((left, right) => left - right);
  }

  const frequency = getLeadTargetCount(target);

  if (Array.isArray(preferredDays) && preferredDays.length > 0) {
    const sorted = Array.from(new Set(preferredDays.map((d) => clampNumber(d, 0, 6)))).sort((a, b) => a - b);
    if (frequency <= sorted.length) {
      return sorted.slice(0, frequency);
    }
    const remaining = [0, 1, 2, 3, 4, 5, 6].filter((d) => !sorted.includes(d));
    return [...sorted, ...remaining].slice(0, frequency).sort((a, b) => a - b);
  }

  return getTaskOffsetsForFrequency(frequency);
}

function getReviewDayOffset(reviewDay: string, weekStartsOn: TwelveWeekSystem["weekStartsOn"]): number {
  return (getReviewDayIndex(reviewDay) - getWeekStartOffset(weekStartsOn) + 7) % 7;
}

function getReviewAwareScheduleOffsets(indicator: LeadIndicator, system: TwelveWeekSystem): number[] {
  const baseOffsets = normalizeScheduleOffsets(indicator.schedule, indicator.target || "1", system.preferredDays);
  const reviewOffset = getReviewDayOffset(system.reviewDay, system.weekStartsOn ?? "Monday");
  const maxWorkOffset = reviewOffset === 0 ? 6 : reviewOffset - 1;
  const desiredCount = Math.min(baseOffsets.length, maxWorkOffset + 1);
  if (desiredCount <= 0) return [];

  const selected = new Set<number>();
  baseOffsets
    .filter((offset) => offset <= maxWorkOffset)
    .slice(0, desiredCount)
    .forEach((offset) => {
      selected.add(offset);
    });

  const candidates = [
    ...baseOffsets.map((offset) => Math.min(offset, maxWorkOffset)),
    ...Array.from({ length: maxWorkOffset + 1 }, (_, index) => maxWorkOffset - index),
  ];

  for (const candidate of candidates) {
    if (selected.size >= desiredCount) break;
    selected.add(candidate);
  }

  return Array.from(selected).sort((left, right) => left - right);
}

function keepGeneratedTaskOutOfPast(startDate: Date, totalWeeks: number, weekNumber: number, generatedDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekStart = addCalendarDays(startDate, (weekNumber - 1) * 7);
  const weekEnd = addCalendarDays(weekStart, 6);
  const todayIndex = getCalendarDayIndex(today);

  if (todayIndex < getCalendarDayIndex(weekStart) || todayIndex > getCalendarDayIndex(weekEnd)) {
    return generatedDate;
  }

  const todayKey = formatDateInputValue(today);
  if (generatedDate >= todayKey) return generatedDate;

  const cycleEnd = getCycleEndDate(startDate, totalWeeks);
  return todayIndex <= getCalendarDayIndex(cycleEnd) ? todayKey : generatedDate;
}

function normalizeLeadIndicator(indicator: LeadIndicator, index: number): LeadIndicator {
  const normalizedCommitment = normalizeCommitmentValue(indicator.commitment);

  return {
    ...indicator,
    id: indicator.id || buildLeadIndicatorId(indicator.name || "", index),
    name: indicator.name || `Tactic ${index + 1}`,
    target: indicator.target || "1",
    unit: indicator.unit || "lần/tuần",
    type: indicator.type === "optional" ? "optional" : "core",
    priority: clampNumber(indicator.priority ?? index + 1, 1, 7),
    schedule: normalizeScheduleOffsets(indicator.schedule, indicator.target || "1"),
    commitment: normalizedCommitment,
  };
}

function buildTaskInstanceId(weekNumber: number, tacticId: string, slotIndex: number): string {
  return `tw_task_${weekNumber}_${tacticId}_${slotIndex}`;
}

function getDefaultWeeklyPlans(totalWeeks: number, week12Outcome: string): WeeklyPlanEntry[] {
  return Array.from({ length: totalWeeks }, (_, index) => {
    const weekNumber = index + 1;
    const phaseName = getLegacyPhaseName(weekNumber);

    return {
      weekNumber,
      phaseName,
      focus:
        weekNumber <= 4
          ? "Xây nền tảng và giữ nhịp hành động cốt lõi."
          : weekNumber <= 8
            ? "Tăng tốc đầu ra và củng cố điều đang hiệu quả."
            : "Về đích có chọn lọc và hoàn tất đầu ra quan trọng.",
      milestone: weekNumber === 12 ? week12Outcome : "",
      completed: false,
    };
  });
}

export function getDefaultScoreboard(totalWeeks: number): UniversalScoreboardWeek[] {
  return Array.from({ length: totalWeeks }, (_, index) => ({
    weekNumber: index + 1,
    leadCompletionPercent: 0,
    mainMetricProgress: "",
    outputDone: "",
    reviewDone: false,
    weeklyScore: 0,
  }));
}

export function syncWeeklyPlans(
  existingPlans: WeeklyPlanEntry[],
  totalWeeks: number,
  week12Outcome: string,
): WeeklyPlanEntry[] {
  const fallbackPlans = getDefaultWeeklyPlans(totalWeeks, week12Outcome);

  return fallbackPlans.map((fallbackPlan) => {
    const existingPlan = existingPlans.find((plan) => plan.weekNumber === fallbackPlan.weekNumber);
    if (!existingPlan) return fallbackPlan;

    return {
      ...fallbackPlan,
      ...existingPlan,
      milestone: existingPlan.milestone || (fallbackPlan.weekNumber === 12 ? week12Outcome : fallbackPlan.milestone),
    };
  });
}

function syncScoreboard(existingScoreboard: UniversalScoreboardWeek[], totalWeeks: number): UniversalScoreboardWeek[] {
  const fallbackScoreboard = getDefaultScoreboard(totalWeeks);

  return fallbackScoreboard.map((fallbackWeek) => {
    const existingWeek = existingScoreboard.find((week) => week.weekNumber === fallbackWeek.weekNumber);
    return existingWeek ? { ...fallbackWeek, ...existingWeek } : fallbackWeek;
  });
}

function normalizeTextArray(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

function firstNonEmptyText(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const normalized = value.trim();
    if (normalized) return normalized;
  }
  return undefined;
}

function normalizeWeeklyReview(review: UniversalWeeklyReview): UniversalWeeklyReview {
  const legacyReview = review as UniversalWeeklyReview & {
    reflection?: string;
    adjustments?: string;
  };
  const insights = firstNonEmptyText(
    legacyReview.insights,
    legacyReview.reflection,
    legacyReview.biggestOutputThisWeek,
  );
  const nextWeekCommitments = normalizeTextArray(legacyReview.nextWeekCommitments);
  const legacyNextWeekCommitment = firstNonEmptyText(legacyReview.adjustments, legacyReview.nextWeekPriority);

  return {
    ...review,
    commitmentsKept: normalizeTextArray(legacyReview.commitmentsKept),
    commitmentsMissed: normalizeTextArray(legacyReview.commitmentsMissed),
    insights,
    nextWeekCommitments:
      nextWeekCommitments.length > 0 ? nextWeekCommitments : legacyNextWeekCommitment ? [legacyNextWeekCommitment] : [],
    executionScore: legacyReview.executionScore ?? review.leadCompletionPercent,
    reflection: legacyReview.reflection ?? insights,
    adjustments: legacyReview.adjustments ?? legacyNextWeekCommitment,
  };
}

function normalizeDailyCheckIn(checkIn: UniversalDailyCheckIn): UniversalDailyCheckIn {
  const updatedCount =
    typeof checkIn.updatedCount === "number" && Number.isFinite(checkIn.updatedCount) && checkIn.updatedCount > 0
      ? Math.round(checkIn.updatedCount)
      : undefined;

  return {
    ...checkIn,
    updatedCount,
  };
}

function migrateGoalWeeklyReviews(goal: Goal): Goal {
  if (!goal.twelveWeekSystem?.weeklyReviews) return goal;

  return {
    ...goal,
    twelveWeekSystem: {
      ...goal.twelveWeekSystem,
      weeklyReviews: goal.twelveWeekSystem.weeklyReviews.map(normalizeWeeklyReview),
    },
  };
}

function getReviewDayIndex(reviewDay: string): number {
  switch (reviewDay) {
    case "Sunday":
      return 0;
    case "Monday":
      return 1;
    case "Tuesday":
      return 2;
    case "Wednesday":
      return 3;
    case "Thursday":
      return 4;
    case "Friday":
      return 5;
    case "Saturday":
      return 6;
    default:
      return 0;
  }
}

export function isReviewDayForDate(reviewDay: string, referenceDate: Date): boolean {
  return getReviewDayIndex(reviewDay) === referenceDate.getDay();
}

export function isTwelveWeekReviewDueToday(system: TwelveWeekSystem, referenceDate = new Date()): boolean {
  const currentWeek = getTwelveWeekCurrentWeek(system, referenceDate);
  const currentReview = system.weeklyReviews.find((review) => review.weekNumber === currentWeek);

  return isReviewDayForDate(system.reviewDay, referenceDate) && !currentReview?.reviewCompleted;
}

function getWeekDateKeys(system: TwelveWeekSystem, weekNumber: number): string[] {
  const range = getTwelveWeekWeekRange(system, weekNumber);
  const startDate = parseCalendarDate(range.start);
  if (!startDate) return [];

  return Array.from({ length: 7 }, (_, index) => formatDateInputValue(addCalendarDays(startDate, index)));
}

export function getWeekTaskBreakdown(system: TwelveWeekSystem, weekNumber: number) {
  const tasks = getTwelveWeekTasksForWeek(system, weekNumber).filter((task) => !task.skipped);
  const coreTasks = tasks.filter((task) => task.isCore);
  const optionalTasks = tasks.filter((task) => !task.isCore);
  const completed = tasks.filter((task) => task.completed).length;
  const coreCompleted = coreTasks.filter((task) => task.completed).length;
  const optionalCompleted = optionalTasks.filter((task) => task.completed).length;
  const isEmpty = tasks.length === 0;

  const getPercent = (completed: number, total: number) =>
    total === 0 ? (isEmpty ? 0 : 100) : Math.round((completed / total) * 100);
  const overallPercent = isEmpty ? 0 : getPercent(completed, tasks.length);

  return {
    tasks,
    coreTotal: coreTasks.length,
    coreCompleted,
    optionalTotal: optionalTasks.length,
    optionalCompleted,
    total: tasks.length,
    completed,
    corePercent: getPercent(coreCompleted, coreTasks.length),
    optionalPercent: getPercent(optionalCompleted, optionalTasks.length),
    overallPercent,
    rate: overallPercent,
    isEmpty,
  };
}

function getWeekActiveDayCount(system: TwelveWeekSystem, weekNumber: number): number {
  const weekKeys = new Set(getWeekDateKeys(system, weekNumber));
  const activeDays = new Set<string>();

  system.taskInstances.forEach((task) => {
    const completedKey = getCalendarDateKey(task.completedAt || "");
    if (task.completed && completedKey && weekKeys.has(completedKey)) {
      activeDays.add(completedKey);
    }
  });

  system.dailyCheckIns.forEach((checkIn) => {
    const checkInKey = getCalendarDateKey(checkIn.date);
    if (checkInKey && weekKeys.has(checkInKey) && checkIn.didWorkToday) {
      activeDays.add(checkInKey);
    }
  });

  return activeDays.size;
}

function getWeekCheckInCount(system: TwelveWeekSystem, weekNumber: number): number {
  const weekKeys = new Set(getWeekDateKeys(system, weekNumber));
  const checkInDays = new Set<string>();

  system.dailyCheckIns.forEach((checkIn) => {
    const checkInKey = getCalendarDateKey(checkIn.date);
    if (checkInKey && weekKeys.has(checkInKey)) {
      checkInDays.add(checkInKey);
    }
  });

  return checkInDays.size;
}

function getWeekOnTimeCompletionPercent(system: TwelveWeekSystem, weekNumber: number): number {
  const tasks = getTwelveWeekTasksForWeek(system, weekNumber);
  if (tasks.length === 0) return 0;

  const onTimeCompleted = tasks.filter((task) => {
    if (!task.completed) return false;
    const completedKey = getCalendarDateKey(task.completedAt || "");
    return Boolean(completedKey && completedKey <= task.scheduledDate);
  }).length;

  return Math.round((onTimeCompleted / tasks.length) * 100);
}

function getBehaviorWeeklyScore(system: TwelveWeekSystem, weekNumber: number, reviewDone: boolean): number {
  const breakdown = getWeekTaskBreakdown(system, weekNumber);
  const activeDayCount = getWeekActiveDayCount(system, weekNumber);
  const consistencyPercent = clampNumber(Math.round((activeDayCount / 5) * 100), 0, 100);
  const checkInPercent = clampNumber(Math.round((getWeekCheckInCount(system, weekNumber) / 5) * 100), 0, 100);
  const onTimePercent = getWeekOnTimeCompletionPercent(system, weekNumber);

  return clampNumber(
    Math.round(
      breakdown.corePercent * 0.55 +
        breakdown.optionalPercent * 0.1 +
        consistencyPercent * 0.15 +
        onTimePercent * 0.1 +
        checkInPercent * 0.05 +
        (reviewDone ? 5 : 0),
    ),
    0,
    100,
  );
}

function syncDerivedScoreboard(
  system: TwelveWeekSystem,
  existingScoreboard: UniversalScoreboardWeek[],
): UniversalScoreboardWeek[] {
  const normalizedScoreboard = syncScoreboard(existingScoreboard, system.totalWeeks);

  return normalizedScoreboard.map((week) => {
    const completion = getWeekTaskBreakdown(system, week.weekNumber);
    const review = system.weeklyReviews.find((item) => item.weekNumber === week.weekNumber);
    const reviewDone = review?.reviewCompleted ?? week.reviewDone;
    const outputDone = review?.biggestOutputThisWeek?.trim() || week.outputDone;
    const mainMetricProgress = review?.lagProgressValue?.trim() || week.mainMetricProgress;
    const weeklyScore = getBehaviorWeeklyScore(system, week.weekNumber, reviewDone);

    return {
      ...week,
      leadCompletionPercent: completion.corePercent,
      mainMetricProgress,
      outputDone,
      reviewDone,
      weeklyScore,
    };
  });
}

export function buildDerivedScoreboard(
  system: TwelveWeekSystem,
  existingScoreboard: UniversalScoreboardWeek[],
): UniversalScoreboardWeek[] {
  return syncDerivedScoreboard(system, existingScoreboard);
}

function buildTaskInstances(
  system: TwelveWeekSystem,
  options: { preserveExistingSchedule?: boolean; reviewAwareSchedule?: boolean } = {},
): TwelveWeekTaskInstance[] {
  const startDate = inferSystemStartDate(system);
  const leadIndicators =
    system.leadIndicators.length > 0
      ? system.leadIndicators.map((indicator, index) => normalizeLeadIndicator(indicator, index))
      : (system.weeklyActions ?? []).filter(Boolean).map((action, index) =>
          normalizeLeadIndicator(
            {
              id: buildLeadIndicatorId(action, index),
              name: action,
              target: "1",
              unit: "lần/tuần",
              type: "core",
            },
            index,
          ),
        );

  const previousInstances = new Map((system.taskInstances ?? []).map((item) => [item.id, item]));
  const nextInstances: TwelveWeekTaskInstance[] = [];

  for (let weekIndex = 0; weekIndex < system.totalWeeks; weekIndex += 1) {
    const weekNumber = weekIndex + 1;
    const weekStart = addCalendarDays(startDate, weekIndex * 7);

    leadIndicators.forEach((indicator, indicatorIndex) => {
      const frequency = getLeadTargetCount(indicator.target);
      const offsets = options.reviewAwareSchedule
        ? getReviewAwareScheduleOffsets(indicator, system)
        : normalizeScheduleOffsets(indicator.schedule, indicator.target, system.preferredDays);

      offsets.forEach((offset, slotIndex) => {
        const tacticId = indicator.id || buildLeadIndicatorId(indicator.name, indicatorIndex);
        const id = buildTaskInstanceId(weekNumber, tacticId, slotIndex);
        const existing = previousInstances.get(id);
        const title = frequency === 1 ? indicator.name : `${indicator.name} ${slotIndex + 1}`;
        const generatedDate = formatDateInputValue(addCalendarDays(weekStart, offset));
        const scheduledDate =
          options.preserveExistingSchedule !== false && existing?.scheduledDate
            ? existing.scheduledDate
            : keepGeneratedTaskOutOfPast(startDate, system.totalWeeks, weekNumber, generatedDate);

        nextInstances.push({
          id,
          weekNumber,
          scheduledDate,
          title,
          leadIndicatorName: indicator.name,
          isCore: indicator.type !== "optional",
          completed: existing?.completed ?? false,
          completedAt: existing?.completedAt,
          lastModifiedAt: Number.isFinite(existing?.lastModifiedAt) ? (existing?.lastModifiedAt ?? 0) : 0,
          tacticId,
          rescheduledFrom: existing?.rescheduledFrom,
          skipped: existing?.skipped,
        });
      });
    });
  }

  return nextInstances;
}

export function regenerateUpcomingTaskInstances(
  system: TwelveWeekSystem,
  options: { currentWeek?: number } = {},
): TwelveWeekSystem {
  const currentWeek = clampNumber(
    options.currentWeek ?? system.currentWeek ?? getTwelveWeekCurrentWeek(system),
    1,
    system.totalWeeks,
  );
  const protectedWeeks = new Set<number>();

  for (let weekNumber = 1; weekNumber < currentWeek; weekNumber += 1) {
    protectedWeeks.add(weekNumber);
  }

  system.weeklyReviews
    .filter((review) => review.reviewCompleted)
    .forEach((review) => {
      protectedWeeks.add(review.weekNumber);
    });
  system.scoreboard
    .filter((week) => week.reviewDone)
    .forEach((week) => {
      protectedWeeks.add(week.weekNumber);
    });

  const regeneratedTasks = buildTaskInstances(system, {
    preserveExistingSchedule: false,
    reviewAwareSchedule: true,
  });
  const protectedTasks = system.taskInstances.filter((task) => protectedWeeks.has(task.weekNumber));
  const upcomingTasks = regeneratedTasks.filter((task) => !protectedWeeks.has(task.weekNumber));
  const taskInstances = [...protectedTasks, ...upcomingTasks].sort(
    (left, right) =>
      left.weekNumber - right.weekNumber ||
      left.scheduledDate.localeCompare(right.scheduledDate) ||
      left.title.localeCompare(right.title),
  );
  const nextSystem = {
    ...system,
    taskInstances,
  };

  return {
    ...nextSystem,
    scoreboard: syncDerivedScoreboard(nextSystem, system.scoreboard),
  };
}

export function getTwelveWeekCurrentWeek(system: TwelveWeekSystem, referenceDate = new Date()): number {
  if (system.status === "completed") {
    return system.totalWeeks;
  }

  return clampNumber(getUnclampedTwelveWeekNumber(system, referenceDate), 1, system.totalWeeks);
}

export function getTwelveWeekWeekRange(system: TwelveWeekSystem, weekNumber: number): { start: string; end: string } {
  const clampedWeek = clampNumber(weekNumber, 1, system.totalWeeks);
  const startDate = inferSystemStartDate(system);
  const weekStart = addCalendarDays(startDate, (clampedWeek - 1) * 7);
  const weekEnd = addCalendarDays(weekStart, 6);

  return {
    start: formatDateInputValue(weekStart),
    end: formatDateInputValue(weekEnd),
  };
}

export function getTwelveWeekTasksForWeek(system: TwelveWeekSystem, weekNumber: number): TwelveWeekTaskInstance[] {
  return system.taskInstances.filter((task) => task.weekNumber === weekNumber);
}

export function getTwelveWeekTodayTasks(
  system: TwelveWeekSystem,
  referenceDate = new Date(),
): TwelveWeekTaskInstance[] {
  if (isTwelveWeekCycleReviewPhase(system, referenceDate)) return [];

  const dateKey = formatDateInputValue(referenceDate);
  const priorityMap = new Map(
    system.leadIndicators.map((indicator, index) => {
      const normalized = normalizeLeadIndicator(indicator, index);
      return [normalized.id, normalized.priority ?? index + 1] as const;
    }),
  );

  return system.taskInstances
    .filter((task) => task.scheduledDate === dateKey && !task.skipped)
    .sort((left, right) => {
      const leftPriority = priorityMap.get(left.tacticId) ?? 99;
      const rightPriority = priorityMap.get(right.tacticId) ?? 99;

      return (
        Number(right.isCore) - Number(left.isCore) ||
        leftPriority - rightPriority ||
        left.title.localeCompare(right.title)
      );
    });
}

export function getTwelveWeekMissedTasks(
  system: TwelveWeekSystem,
  referenceDate = new Date(),
): TwelveWeekTaskInstance[] {
  if (isTwelveWeekCycleReviewPhase(system, referenceDate)) return [];

  const currentWeek = getTwelveWeekCurrentWeek(system, referenceDate);
  const todayKey = formatDateInputValue(referenceDate);
  const priorityMap = new Map(
    system.leadIndicators.map((indicator, index) => {
      const normalized = normalizeLeadIndicator(indicator, index);
      return [normalized.id, normalized.priority ?? index + 1] as const;
    }),
  );

  return getTwelveWeekTasksForWeek(system, currentWeek)
    .filter((task) => !task.completed && !task.skipped && task.scheduledDate < todayKey)
    .sort((left, right) => {
      const leftPriority = priorityMap.get(left.tacticId) ?? 99;
      const rightPriority = priorityMap.get(right.tacticId) ?? 99;

      return (
        Number(right.isCore) - Number(left.isCore) ||
        left.scheduledDate.localeCompare(right.scheduledDate) ||
        leftPriority - rightPriority
      );
    });
}

export function getTwelveWeekWeekCompletion(
  system: TwelveWeekSystem,
  weekNumber: number,
): { completed: number; total: number; percent: number; isEmpty: boolean } {
  const tasks = getTwelveWeekTasksForWeek(system, weekNumber).filter((task) => !task.skipped);
  const completed = tasks.filter((task) => task.completed).length;
  const total = tasks.length;
  const isEmpty = total === 0;

  return {
    completed,
    total,
    percent: isEmpty ? 0 : Math.round((completed / total) * 100),
    isEmpty,
  };
}

export type OverdueTaskActionReason =
  | "task_not_found"
  | "task_already_completed"
  | "task_already_skipped"
  | "no_room_in_current_week"
  | "no_next_week_available"
  | "core_task_cannot_skip"
  | "ok";

export interface OverdueTaskActionResult {
  /** Resulting system. Equals input when `applied === false`. */
  system: TwelveWeekSystem;
  applied: boolean;
  reason: OverdueTaskActionReason;
  /** Updated task (when applied), helpful for logging / UI feedback. */
  updatedTask?: TwelveWeekTaskInstance;
}

function findTaskInstance(system: TwelveWeekSystem, taskId: string): TwelveWeekTaskInstance | undefined {
  return system.taskInstances.find((task) => task.id === taskId);
}

function replaceTaskInstance(system: TwelveWeekSystem, taskId: string, next: TwelveWeekTaskInstance): TwelveWeekSystem {
  return {
    ...system,
    taskInstances: system.taskInstances.map((task) => (task.id === taskId ? next : task)),
  };
}

/**
 * Move an overdue task to a later day **within the same week**. Picks the
 * smallest valid date strictly greater than the current `scheduledDate` and
 * `>= todayKey`, capped to `weekEnd`. Sets `rescheduledFrom` to the original
 * scheduled date. Pure — caller persists.
 */
export function rescheduleTwelveWeekTaskWithinWeek(
  system: TwelveWeekSystem,
  taskId: string,
  referenceDate = new Date(),
): OverdueTaskActionResult {
  const task = findTaskInstance(system, taskId);
  if (!task) return { system, applied: false, reason: "task_not_found" };
  if (task.completed) return { system, applied: false, reason: "task_already_completed" };
  if (task.skipped) return { system, applied: false, reason: "task_already_skipped" };

  const range = getTwelveWeekWeekRange(system, task.weekNumber);
  const todayKey = formatDateInputValue(referenceDate);
  // Earliest valid new date: max(today, scheduledDate+1 day) — avoid picking a
  // past day, but at least move strictly forward from current schedule.
  const startDate = parseCalendarDate(task.scheduledDate);
  const dayAfterScheduled = startDate ? formatDateInputValue(addCalendarDays(startDate, 1)) : todayKey;
  const candidateKey = todayKey > dayAfterScheduled ? todayKey : dayAfterScheduled;

  if (candidateKey > range.end) {
    return { system, applied: false, reason: "no_room_in_current_week" };
  }

  const nextTask: TwelveWeekTaskInstance = {
    ...task,
    scheduledDate: candidateKey,
    rescheduledFrom: task.rescheduledFrom ?? task.scheduledDate,
  };
  return {
    system: replaceTaskInstance(system, taskId, nextTask),
    applied: true,
    reason: "ok",
    updatedTask: nextTask,
  };
}

/**
 * Move an overdue task to the **first day of the next week**. Increments
 * `weekNumber` and resets `scheduledDate` to the next week's start. Refuses
 * when current week is the final week of the cycle.
 */
export function rescheduleTwelveWeekTaskToNextWeek(system: TwelveWeekSystem, taskId: string): OverdueTaskActionResult {
  const task = findTaskInstance(system, taskId);
  if (!task) return { system, applied: false, reason: "task_not_found" };
  if (task.completed) return { system, applied: false, reason: "task_already_completed" };
  if (task.skipped) return { system, applied: false, reason: "task_already_skipped" };
  if (task.weekNumber >= system.totalWeeks) {
    return { system, applied: false, reason: "no_next_week_available" };
  }

  const nextWeekRange = getTwelveWeekWeekRange(system, task.weekNumber + 1);
  const nextTask: TwelveWeekTaskInstance = {
    ...task,
    weekNumber: task.weekNumber + 1,
    scheduledDate: nextWeekRange.start,
    rescheduledFrom: task.rescheduledFrom ?? task.scheduledDate,
  };
  return {
    system: replaceTaskInstance(system, taskId, nextTask),
    applied: true,
    reason: "ok",
    updatedTask: nextTask,
  };
}

/**
 * Skip a **non-core** task. Sets `skipped: true`. Refuses for core tasks —
 * caller is responsible for surfacing a confirmation flow elsewhere if a core
 * task should ever be skipped (out of scope for v1).
 */
export function skipTwelveWeekNonCoreTask(system: TwelveWeekSystem, taskId: string): OverdueTaskActionResult {
  const task = findTaskInstance(system, taskId);
  if (!task) return { system, applied: false, reason: "task_not_found" };
  if (task.completed) return { system, applied: false, reason: "task_already_completed" };
  if (task.skipped) return { system, applied: false, reason: "task_already_skipped" };
  if (task.isCore) return { system, applied: false, reason: "core_task_cannot_skip" };

  const nextTask: TwelveWeekTaskInstance = { ...task, skipped: true };
  return {
    system: replaceTaskInstance(system, taskId, nextTask),
    applied: true,
    reason: "ok",
    updatedTask: nextTask,
  };
}

export function getTwelveWeekTacticCount(system: TwelveWeekSystem): number {
  if (system.leadIndicators.length > 0) {
    return system.leadIndicators.length;
  }

  return (system.weeklyActions ?? []).filter(Boolean).length;
}

export function getGoalExecutionStats(goal: Goal, referenceDate = new Date()) {
  const system = goal.twelveWeekSystem;

  if (system) {
    const currentWeek = getTwelveWeekCurrentWeek(system, referenceDate);
    const weekCompletion = getTwelveWeekWeekCompletion(system, currentWeek);
    const total = system.taskInstances.length;
    const completed = system.taskInstances.filter((task) => task.completed).length;

    return {
      source: "twelve-week" as const,
      total,
      completed,
      open: Math.max(total - completed, 0),
      currentWeek,
      currentWeekRange: getTwelveWeekWeekRange(system, currentWeek),
      todayCount: getTwelveWeekTodayTasks(system, referenceDate).filter((task) => !task.completed).length,
      weekCompletion,
      reviewDueToday: isTwelveWeekReviewDueToday(system, referenceDate),
    };
  }

  const total = goal.tasks.length;
  const completed = goal.tasks.filter((task) => task.completed).length;

  return {
    source: "tasks" as const,
    total,
    completed,
    open: Math.max(total - completed, 0),
    currentWeek: null,
    currentWeekRange: null,
    todayCount: 0,
    weekCompletion: null,
    reviewDueToday: false,
  };
}

export function getActiveTwelveWeekGoal(goals: Goal[], preferredGoalId?: string | null): Goal | null {
  const goalsWithSystem = sortTwelveWeekGoalsForSelection(goals);
  if (goalsWithSystem.length === 0) return null;

  if (preferredGoalId) {
    const preferredGoal = goalsWithSystem.find((goal) => goal.id === preferredGoalId);
    if (preferredGoal) return preferredGoal;
  }

  return goalsWithSystem[0];
}

export function sortTwelveWeekGoalsForSelection(goals: Goal[]): Goal[] {
  const goalsWithSystem = goals.filter((goal) => Boolean(goal.twelveWeekSystem));

  const statusRank = (goal: Goal) => {
    switch (goal.twelveWeekSystem?.status) {
      case "active":
        return 0;
      case "paused":
        return 1;
      case "completed":
        return 2;
      default:
        return 3;
    }
  };

  return [...goalsWithSystem].sort((left, right) => {
    const statusSort = statusRank(left) - statusRank(right);
    if (statusSort !== 0) return statusSort;
    const createdSort = right.createdAt.localeCompare(left.createdAt);
    if (createdSort !== 0) return createdSort;
    return right.id.localeCompare(left.id);
  });
}

export function migrateLegacyPlanToSystem(goal: Goal): Goal {
  if (!goal.twelveWeekPlan || goal.twelveWeekSystem) return goal;

  const legacyPlan = goal.twelveWeekPlan;
  const leadIndicators = legacyPlan.weeklyActions.map((action) => ({
    id: `tactic_legacy_${action.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    name: action,
    target: "",
    unit: "",
    type: "core" as TacticType,
  }));

  const totalWeeks = Math.max(legacyPlan.totalWeeks || 12, 1);
  const weeklyPlans: WeeklyPlanEntry[] = Array.from({ length: totalWeeks }, (_, index) => ({
    weekNumber: index + 1,
    phaseName: getLegacyPhaseName(index + 1),
    focus: legacyPlan.weeklyActions[index] ?? legacyPlan.weeklyActions[0] ?? "Duy trì nhịp hành động tuần này",
    milestone: index === 3 || index === 7 || index === 11 ? legacyPlan.week12Outcome : "",
    completed: false,
  }));

  return {
    ...goal,
    twelveWeekPlan: undefined,
    twelveWeekSystem: {
      goalType: "legacy-plan",
      vision12Week: goal.description || goal.title,
      cycleNumber: 1,
      lagMetric: {
        name: legacyPlan.successMetric || "Chỉ số kết quả chính",
        unit: "",
        target: "",
        currentValue: "",
      },
      leadIndicators,
      milestones: {
        week4: "",
        week8: "",
        week12: legacyPlan.week12Outcome || "",
      },
      successEvidence: legacyPlan.week12Outcome || "",
      reviewDay: legacyPlan.reviewDay,
      week12Outcome: legacyPlan.week12Outcome,
      startDate: "",
      endDate: "",
      timezone: "Asia/Ho_Chi_Minh",
      weekStartsOn: "Monday",
      status: "active",
      dailyReminderTime: "19:00",
      tacticLoadPreference: "balanced",
      reentryCount: 0,
      currentWeek: legacyPlan.currentWeek,
      totalWeeks,
      weeklyPlans,
      taskInstances: [],
      dailyCheckIns: [],
      weeklyReviews: [],
      scoreboard: getDefaultScoreboard(totalWeeks),
    },
  };
}

export function migrateLegacyUserData(data: UserData, currentStorageVersion: number): UserData {
  const migratedGoals = data.goals.map((goal) => migrateGoalWeeklyReviews(migrateLegacyPlanToSystem(goal)));
  const hasChanges =
    migratedGoals.some((goal, index) => goal !== data.goals[index]) ||
    (data.storageVersion || 0) < currentStorageVersion;

  if (!hasChanges) return data;

  return {
    ...data,
    storageVersion: currentStorageVersion,
    goals: migratedGoals,
  };
}

export function normalizeGoal(goal: Goal): Goal {
  if (!goal.twelveWeekSystem) return goal;

  const baseSystem = goal.twelveWeekSystem;
  const totalWeeks = clampNumber(baseSystem.totalWeeks || 12, 1, 12);
  const timezone = baseSystem.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Ho_Chi_Minh";
  const weekStartsOn = baseSystem.weekStartsOn ?? "Monday";
  const normalizedLeadIndicators = Array.isArray(baseSystem.leadIndicators)
    ? baseSystem.leadIndicators.map((indicator, index) => normalizeLeadIndicator(indicator, index))
    : [];
  const systemWithDefaults: TwelveWeekSystem = {
    ...baseSystem,
    goalType: baseSystem.goalType || "custom-goal",
    vision12Week: baseSystem.vision12Week || goal.description || goal.title,
    cycleNumber: Math.max(1, Math.round(baseSystem.cycleNumber ?? 1)),
    lagMetric: baseSystem.lagMetric ?? {
      name: baseSystem.successMetric || "Chỉ số kết quả chính",
      unit: "",
      target: "",
      currentValue: "",
    },
    leadIndicators: normalizedLeadIndicators,
    milestones: baseSystem.milestones ?? {
      week4: "",
      week8: "",
      week12: baseSystem.week12Outcome || "",
    },
    successEvidence: baseSystem.successEvidence || "",
    reviewDay: baseSystem.reviewDay || "Sunday",
    week12Outcome: baseSystem.week12Outcome || goal.title,
    weeklyActions:
      Array.isArray(baseSystem.weeklyActions) && baseSystem.weeklyActions.length > 0
        ? baseSystem.weeklyActions
        : normalizedLeadIndicators.map((indicator) => indicator.name).filter(Boolean),
    successMetric: baseSystem.successMetric || baseSystem.lagMetric?.name || "Chỉ số kết quả chính",
    timezone,
    weekStartsOn,
    totalWeeks,
    startDate: baseSystem.startDate || "",
    endDate: baseSystem.endDate || "",
    status: baseSystem.status ?? "active",
    dailyReminderTime: baseSystem.dailyReminderTime || "19:00",
    tacticLoadPreference: baseSystem.tacticLoadPreference ?? "balanced",
    reentryCount: baseSystem.reentryCount ?? 0,
    taskInstances: Array.isArray(baseSystem.taskInstances) ? baseSystem.taskInstances : [],
    weeklyPlans: Array.isArray(baseSystem.weeklyPlans) ? baseSystem.weeklyPlans : [],
    dailyCheckIns: Array.isArray(baseSystem.dailyCheckIns) ? baseSystem.dailyCheckIns.map(normalizeDailyCheckIn) : [],
    weeklyReviews: Array.isArray(baseSystem.weeklyReviews) ? baseSystem.weeklyReviews.map(normalizeWeeklyReview) : [],
    scoreboard: Array.isArray(baseSystem.scoreboard) ? baseSystem.scoreboard : [],
  };

  const normalizedStartDate = inferSystemStartDate(systemWithDefaults);
  const normalizedEndDate = getCycleEndDate(normalizedStartDate, totalWeeks);
  const generatedTaskInstances = buildTaskInstances({
    ...systemWithDefaults,
    startDate: formatDateInputValue(normalizedStartDate),
    endDate: formatDateInputValue(normalizedEndDate),
  });
  const legacyAdhocTasks = systemWithDefaults.taskInstances.filter(
    (task) => task && task.id && !task.id.startsWith("tw_task_"),
  );
  const taskInstances = [...generatedTaskInstances, ...legacyAdhocTasks];
  const systemForDerivedState = {
    ...systemWithDefaults,
    startDate: formatDateInputValue(normalizedStartDate),
    endDate: formatDateInputValue(normalizedEndDate),
    taskInstances,
  };
  const cycleWeekNumber = getTwelveWeekCycleWeekNumber(systemForDerivedState);
  const isCycleReview = isTwelveWeekCycleReviewPhase(systemForDerivedState);
  const currentWeek = isCycleReview
    ? Math.max(cycleWeekNumber, totalWeeks + 1)
    : getTwelveWeekCurrentWeek(systemForDerivedState);
  const status = isCycleReview ? "completed" : systemWithDefaults.status;

  return {
    ...goal,
    twelveWeekPlan: undefined,
    twelveWeekSystem: {
      ...systemWithDefaults,
      startDate: formatDateInputValue(normalizedStartDate),
      endDate: formatDateInputValue(normalizedEndDate),
      status,
      currentWeek,
      weeklyPlans: syncWeeklyPlans(systemWithDefaults.weeklyPlans, totalWeeks, systemWithDefaults.week12Outcome),
      scoreboard: syncDerivedScoreboard(
        {
          ...systemWithDefaults,
          startDate: formatDateInputValue(normalizedStartDate),
          endDate: formatDateInputValue(normalizedEndDate),
          status,
          currentWeek,
          taskInstances,
        },
        systemWithDefaults.scoreboard,
      ),
      taskInstances,
      weeklyActions: undefined,
      successMetric: undefined,
      dailyUpdates: undefined,
      legacyWeeklyReviews: undefined,
      legacyScoreboard: undefined,
    },
  };
}
