import {
  formatDateInputValue,
  getCalendarDateKey,
  getCalendarDayIndex,
  parseCalendarDate,
} from "./storage-date-utils";
import type {
  Goal,
  LeadIndicator,
  TacticType,
  TwelveWeekSystem,
  TwelveWeekTaskInstance,
  UniversalScoreboardWeek,
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
  if (weekNumber <= 4) return "Foundation";
  if (weekNumber <= 8) return "Build / Acceleration";
  return "Finish / Execution";
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
  const normalizedName = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return `tactic_${normalizedName || "item"}_${index + 1}`;
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

function normalizeScheduleOffsets(
  schedule: number[] | undefined,
  target: string,
  preferredDays?: number[],
): number[] {
  if (Array.isArray(schedule) && schedule.length > 0) {
    return Array.from(new Set(schedule.map((offset) => clampNumber(offset, 0, 6)))).sort(
      (left, right) => left - right,
    );
  }

  const frequency = getLeadTargetCount(target);

  if (Array.isArray(preferredDays) && preferredDays.length > 0) {
    const sorted = Array.from(new Set(preferredDays.map((d) => clampNumber(d, 0, 6)))).sort(
      (a, b) => a - b,
    );
    if (frequency <= sorted.length) {
      return sorted.slice(0, frequency);
    }
    const remaining = [0, 1, 2, 3, 4, 5, 6].filter((d) => !sorted.includes(d));
    return [...sorted, ...remaining].slice(0, frequency).sort((a, b) => a - b);
  }

  return getTaskOffsetsForFrequency(frequency);
}

function normalizeLeadIndicator(indicator: LeadIndicator, index: number): LeadIndicator {
  return {
    ...indicator,
    id: indicator.id || buildLeadIndicatorId(indicator.name || "", index),
    name: indicator.name || `Tactic ${index + 1}`,
    target: indicator.target || "1",
    unit: indicator.unit || "lần/tuần",
    type: indicator.type === "optional" ? "optional" : "core",
    priority: clampNumber(indicator.priority ?? index + 1, 1, 7),
    schedule: normalizeScheduleOffsets(indicator.schedule, indicator.target || "1"),
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
      milestone:
        existingPlan.milestone ||
        (fallbackPlan.weekNumber === 12 ? week12Outcome : fallbackPlan.milestone),
    };
  });
}

function syncScoreboard(
  existingScoreboard: UniversalScoreboardWeek[],
  totalWeeks: number,
): UniversalScoreboardWeek[] {
  const fallbackScoreboard = getDefaultScoreboard(totalWeeks);

  return fallbackScoreboard.map((fallbackWeek) => {
    const existingWeek = existingScoreboard.find((week) => week.weekNumber === fallbackWeek.weekNumber);
    return existingWeek ? { ...fallbackWeek, ...existingWeek } : fallbackWeek;
  });
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

export function isTwelveWeekReviewDueToday(
  system: TwelveWeekSystem,
  referenceDate = new Date(),
): boolean {
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

function getWeekTaskBreakdown(system: TwelveWeekSystem, weekNumber: number) {
  const tasks = getTwelveWeekTasksForWeek(system, weekNumber);
  const coreTasks = tasks.filter((task) => task.isCore);
  const optionalTasks = tasks.filter((task) => !task.isCore);

  const getPercent = (completed: number, total: number) =>
    total === 0 ? 100 : Math.round((completed / total) * 100);

  return {
    tasks,
    coreTotal: coreTasks.length,
    coreCompleted: coreTasks.filter((task) => task.completed).length,
    optionalTotal: optionalTasks.length,
    optionalCompleted: optionalTasks.filter((task) => task.completed).length,
    total: tasks.length,
    completed: tasks.filter((task) => task.completed).length,
    corePercent: getPercent(coreTasks.filter((task) => task.completed).length, coreTasks.length),
    optionalPercent: getPercent(
      optionalTasks.filter((task) => task.completed).length,
      optionalTasks.length,
    ),
    overallPercent: getPercent(tasks.filter((task) => task.completed).length, tasks.length),
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

function getBehaviorWeeklyScore(
  system: TwelveWeekSystem,
  weekNumber: number,
  reviewDone: boolean,
): number {
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

function buildTaskInstances(system: TwelveWeekSystem): TwelveWeekTaskInstance[] {
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
      const offsets = normalizeScheduleOffsets(
        indicator.schedule,
        indicator.target,
        system.preferredDays,
      );

      offsets.forEach((offset, slotIndex) => {
        const tacticId = indicator.id || buildLeadIndicatorId(indicator.name, indicatorIndex);
        const id = buildTaskInstanceId(weekNumber, tacticId, slotIndex);
        const existing = previousInstances.get(id);
        const title = frequency === 1 ? indicator.name : `${indicator.name} ${slotIndex + 1}`;
        const generatedDate = formatDateInputValue(addCalendarDays(weekStart, offset));

        nextInstances.push({
          id,
          weekNumber,
          scheduledDate: existing?.scheduledDate || generatedDate,
          title,
          leadIndicatorName: indicator.name,
          isCore: indicator.type !== "optional",
          completed: existing?.completed ?? false,
          completedAt: existing?.completedAt,
          tacticId,
          rescheduledFrom: existing?.rescheduledFrom,
        });
      });
    });
  }

  return nextInstances;
}

export function getTwelveWeekCurrentWeek(system: TwelveWeekSystem, referenceDate = new Date()): number {
  if (system.status === "completed") {
    return system.totalWeeks;
  }

  const startDate = inferSystemStartDate(system);
  const calculatedWeek =
    Math.floor((getCalendarDayIndex(referenceDate) - getCalendarDayIndex(startDate)) / 7) + 1;

  return clampNumber(Math.max(system.currentWeek || 1, calculatedWeek), 1, system.totalWeeks);
}

export function getTwelveWeekWeekRange(
  system: TwelveWeekSystem,
  weekNumber: number,
): { start: string; end: string } {
  const clampedWeek = clampNumber(weekNumber, 1, system.totalWeeks);
  const startDate = inferSystemStartDate(system);
  const weekStart = addCalendarDays(startDate, (clampedWeek - 1) * 7);
  const weekEnd = addCalendarDays(weekStart, 6);

  return {
    start: formatDateInputValue(weekStart),
    end: formatDateInputValue(weekEnd),
  };
}

export function getTwelveWeekTasksForWeek(
  system: TwelveWeekSystem,
  weekNumber: number,
): TwelveWeekTaskInstance[] {
  return system.taskInstances.filter((task) => task.weekNumber === weekNumber);
}

export function getTwelveWeekTodayTasks(
  system: TwelveWeekSystem,
  referenceDate = new Date(),
): TwelveWeekTaskInstance[] {
  const dateKey = formatDateInputValue(referenceDate);
  const priorityMap = new Map(
    system.leadIndicators.map((indicator, index) => {
      const normalized = normalizeLeadIndicator(indicator, index);
      return [normalized.id, normalized.priority ?? index + 1] as const;
    }),
  );

  return system.taskInstances
    .filter((task) => task.scheduledDate === dateKey)
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
  const currentWeek = getTwelveWeekCurrentWeek(system, referenceDate);
  const todayKey = formatDateInputValue(referenceDate);
  const priorityMap = new Map(
    system.leadIndicators.map((indicator, index) => {
      const normalized = normalizeLeadIndicator(indicator, index);
      return [normalized.id, normalized.priority ?? index + 1] as const;
    }),
  );

  return getTwelveWeekTasksForWeek(system, currentWeek)
    .filter((task) => !task.completed && task.scheduledDate < todayKey)
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
): { completed: number; total: number; percent: number } {
  const tasks = getTwelveWeekTasksForWeek(system, weekNumber);
  const completed = tasks.filter((task) => task.completed).length;
  const total = tasks.length;

  return {
    completed,
    total,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
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

export function getActiveTwelveWeekGoal(
  goals: Goal[],
  preferredGoalId?: string | null,
): Goal | null {
  const goalsWithSystem = goals.filter((goal) => Boolean(goal.twelveWeekSystem));
  if (goalsWithSystem.length === 0) return null;

  if (preferredGoalId) {
    const preferredGoal = goalsWithSystem.find((goal) => goal.id === preferredGoalId);
    if (preferredGoal) return preferredGoal;
  }

  return [...goalsWithSystem].sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
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
    focus:
      legacyPlan.weeklyActions[index] ??
      legacyPlan.weeklyActions[0] ??
      "Duy trì nhịp hành động tuần này",
    milestone: index === 3 || index === 7 || index === 11 ? legacyPlan.week12Outcome : "",
    completed: false,
  }));

  return {
    ...goal,
    twelveWeekPlan: undefined,
    twelveWeekSystem: {
      goalType: "legacy-plan",
      vision12Week: goal.description || goal.title,
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

export function migrateLegacyUserData(
  data: UserData,
  currentStorageVersion: number,
): UserData {
  const migratedGoals = data.goals.map(migrateLegacyPlanToSystem);
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
  const timezone =
    baseSystem.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Ho_Chi_Minh";
  const weekStartsOn = baseSystem.weekStartsOn ?? "Monday";
  const normalizedLeadIndicators = Array.isArray(baseSystem.leadIndicators)
    ? baseSystem.leadIndicators.map((indicator, index) => normalizeLeadIndicator(indicator, index))
    : [];
  const systemWithDefaults: TwelveWeekSystem = {
    ...baseSystem,
    goalType: baseSystem.goalType || "custom-goal",
    vision12Week: baseSystem.vision12Week || goal.description || goal.title,
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
    dailyCheckIns: Array.isArray(baseSystem.dailyCheckIns) ? baseSystem.dailyCheckIns : [],
    weeklyReviews: Array.isArray(baseSystem.weeklyReviews) ? baseSystem.weeklyReviews : [],
    scoreboard: Array.isArray(baseSystem.scoreboard) ? baseSystem.scoreboard : [],
  };

  const normalizedStartDate = inferSystemStartDate(systemWithDefaults);
  const normalizedEndDate = getCycleEndDate(normalizedStartDate, totalWeeks);
  const taskInstances = buildTaskInstances({
    ...systemWithDefaults,
    startDate: formatDateInputValue(normalizedStartDate),
    endDate: formatDateInputValue(normalizedEndDate),
  });
  const currentWeek = getTwelveWeekCurrentWeek({
    ...systemWithDefaults,
    startDate: formatDateInputValue(normalizedStartDate),
    endDate: formatDateInputValue(normalizedEndDate),
    taskInstances,
  });

  return {
    ...goal,
    twelveWeekPlan: undefined,
    twelveWeekSystem: {
      ...systemWithDefaults,
      startDate: formatDateInputValue(normalizedStartDate),
      endDate: formatDateInputValue(normalizedEndDate),
      currentWeek,
      weeklyPlans: syncWeeklyPlans(systemWithDefaults.weeklyPlans, totalWeeks, systemWithDefaults.week12Outcome),
      scoreboard: syncDerivedScoreboard(
        {
          ...systemWithDefaults,
          startDate: formatDateInputValue(normalizedStartDate),
          endDate: formatDateInputValue(normalizedEndDate),
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
