import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuthContext } from "@/lib/auth/AuthContext";
import { getPlanLink, savePlanDetailsLink } from "@/features/plan12week/persistence/planLinkStore";
import { getPlan } from "@/services/planService";
import type { PlanDetails, WeekDetails as ApiWeekDetails } from "@/types/plan";
import { isDailyCheckInMetric } from "@/features/plan12week/constants/progressMetrics";
import { getCalendarDateKey } from "../utils/storage-date-utils";
import {
  buildDerivedScoreboard,
  getDefaultScoreboard,
  getTwelveWeekCurrentWeek,
  getTwelveWeekWeekCompletion,
} from "../utils/storage-twelve-week";
import type { Goal, TwelveWeekSystem, UniversalDailyCheckIn, UniversalWeeklyReview } from "../utils/storage-types";
import { applyTaskOverlay, type TaskOverlayMap } from "./useBackendTaskOverlay";

const EMPTY_OVERLAY_MAP = new Map<string, TwelveWeekSystem>();

function buildTaskOverlayFromPlanDetails(
  details: PlanDetails,
  localTasks: TwelveWeekSystem["taskInstances"],
  taskIdByLocalTaskId: Record<string, string>,
): TaskOverlayMap {
  const remoteTaskMap = new Map<string, boolean>();

  details.weeks.forEach((week) => {
    week.tasks.forEach((task) => {
      remoteTaskMap.set(task.id, task.status === "done");
    });
  });

  const completedMetricDatesByName = buildCompletedMetricDatesByName(details);
  const overlay = new Map<string, boolean>();

  Object.entries(taskIdByLocalTaskId).forEach(([localTaskId, remoteTaskId]) => {
    const completed = remoteTaskMap.get(remoteTaskId);
    if (completed === undefined) return;
    overlay.set(localTaskId, completed);
  });

  localTasks.forEach((task) => {
    if (overlay.has(task.id)) return;
    const metricName = normalizeComparableText(task.leadIndicatorName || task.title);
    const taskDateKey = getCalendarDateKey(task.scheduledDate);
    if (!metricName || !taskDateKey) return;
    if (completedMetricDatesByName.get(metricName)?.has(taskDateKey)) {
      overlay.set(task.id, true);
    }
  });

  return overlay;
}

function normalizeComparableText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function buildCompletedMetricDatesByName(details: PlanDetails): Map<string, Set<string>> {
  const completedMetricDatesByName = new Map<string, Set<string>>();

  details.weeks.forEach((week) => {
    week.metrics
      .filter((metric) => !isDailyCheckInMetric(metric.name))
      .forEach((metric) => {
        const metricName = normalizeComparableText(metric.name);
        if (!metricName) return;

        metric.logs.forEach((log) => {
          if (!log.completed && log.value <= 0) return;
          const dateKey = getCalendarDateKey(log.date);
          if (!dateKey) return;

          const completedDates = completedMetricDatesByName.get(metricName) ?? new Set<string>();
          completedDates.add(dateKey);
          completedMetricDatesByName.set(metricName, completedDates);
        });
      });
  });

  return completedMetricDatesByName;
}

function getMetricProgressSummary(week: ApiWeekDetails | undefined): string {
  if (!week) return "";

  const candidates = week.metrics
    .filter((metric) => !isDailyCheckInMetric(metric.name))
    .map((metric) => {
      const total = metric.logs.reduce(
        (sum, log) => sum + (Number.isFinite(log.value) ? log.value : 0),
        0,
      );

      return {
        name: metric.name.trim(),
        total,
        hasLogs: metric.logs.length > 0,
      };
    })
    .filter((metric) => metric.name.length > 0 && (metric.hasLogs || metric.total > 0))
    .sort((left, right) => right.total - left.total || left.name.localeCompare(right.name, "vi"));

  if (candidates.length === 0) return "";

  const primaryMetric = candidates[0];
  return `${primaryMetric.name}: ${primaryMetric.total}`;
}

function mergeWeeklyReviews(
  system: TwelveWeekSystem,
  backendWeekByNumber: ReadonlyMap<number, ApiWeekDetails>,
): UniversalWeeklyReview[] {
  const existingReviewByWeek = new Map(system.weeklyReviews.map((review) => [review.weekNumber, review]));
  const weekNumbers = new Set<number>([
    ...system.weeklyReviews.map((review) => review.weekNumber),
    ...backendWeekByNumber.keys(),
  ]);

  const mergedReviews: Array<UniversalWeeklyReview | null> = Array.from(weekNumbers)
    .sort((left, right) => left - right)
    .map((weekNumber) => {
      const existingReview = existingReviewByWeek.get(weekNumber);
      const backendWeek = backendWeekByNumber.get(weekNumber);
      const backendReview = backendWeek?.review;
      const metricSummary = getMetricProgressSummary(backendWeek);
      const backendReviewScore = backendReview
        ? Math.max(0, Math.min(10, Math.round(backendReview.executionScore / 10)))
        : 0;

      if (!existingReview && !backendReview && !metricSummary) {
        return null;
      }

      const completion = getTwelveWeekWeekCompletion(system, weekNumber);

      return {
        weekNumber,
        leadCompletionPercent: completion.percent,
        lagProgressValue: existingReview?.lagProgressValue?.trim() || metricSummary,
        biggestOutputThisWeek:
          backendReview?.reflection?.trim() || existingReview?.biggestOutputThisWeek || "",
        mainObstacle: existingReview?.mainObstacle || "",
        nextWeekPriority:
          backendReview?.adjustments?.trim() || existingReview?.nextWeekPriority || "",
        workloadDecision: (existingReview?.workloadDecision || "") as UniversalWeeklyReview["workloadDecision"],
        reviewCompleted: backendReview ? true : existingReview?.reviewCompleted ?? false,
        progressScore: existingReview?.progressScore || backendReviewScore,
        disciplineScore: existingReview?.disciplineScore || backendReviewScore,
        focusScore: existingReview?.focusScore || backendReviewScore,
        improvementScore: existingReview?.improvementScore || backendReviewScore,
        outputQualityScore: existingReview?.outputQualityScore || backendReviewScore,
        completedLeadIndicators: completion.completed,
      };
    });

  return mergedReviews.filter((review): review is UniversalWeeklyReview => review !== null);
}

function buildSyntheticDailyCheckIns(
  backendWeekByNumber: ReadonlyMap<number, ApiWeekDetails>,
): UniversalDailyCheckIn[] {
  const syntheticByDate = new Map<string, UniversalDailyCheckIn>();

  backendWeekByNumber.forEach((week) => {
    week.metrics
      .filter((metric) => isDailyCheckInMetric(metric.name))
      .forEach((metric) => {
        metric.logs.forEach((log) => {
          const dateKey = getCalendarDateKey(log.date);
          if (!dateKey || syntheticByDate.has(dateKey)) return;

          syntheticByDate.set(dateKey, {
            date: dateKey,
            didWorkToday: Boolean(log.completed || log.value > 0),
            whichLeadIndicatorWorkedOn: "",
            amountDone: "Check-in từ máy chủ",
            outputCreated: "",
            obstacleOrIssue: "",
            dailySelfRating: 3,
            optionalNote: "",
            mood: "steady",
          });
        });
      });
  });

  return Array.from(syntheticByDate.values());
}

function mergeDailyCheckIns(
  system: TwelveWeekSystem,
  backendWeekByNumber: ReadonlyMap<number, ApiWeekDetails>,
): UniversalDailyCheckIn[] {
  const mergedByDate = new Map<string, UniversalDailyCheckIn>();

  system.dailyCheckIns.forEach((checkIn) => {
    const dateKey = getCalendarDateKey(checkIn.date) ?? checkIn.date;
    mergedByDate.set(dateKey, checkIn);
  });

  buildSyntheticDailyCheckIns(backendWeekByNumber).forEach((checkIn) => {
    const dateKey = getCalendarDateKey(checkIn.date) ?? checkIn.date;
    if (!mergedByDate.has(dateKey)) {
      mergedByDate.set(dateKey, checkIn);
    }
  });

  return Array.from(mergedByDate.values())
    .sort((left, right) => {
      const leftKey = getCalendarDateKey(left.date) ?? left.date;
      const rightKey = getCalendarDateKey(right.date) ?? right.date;
      return rightKey.localeCompare(leftKey);
    })
    .slice(0, 120);
}

export function applyBackendProgressOverlay(
  system: TwelveWeekSystem,
  details: PlanDetails,
  taskIdByLocalTaskId: Record<string, string>,
): TwelveWeekSystem {
  const taskOverlay = buildTaskOverlayFromPlanDetails(details, system.taskInstances, taskIdByLocalTaskId);
  const overlaidTaskInstances = applyTaskOverlay(system.taskInstances, taskOverlay);
  const taskOverlaidSystem =
    overlaidTaskInstances === system.taskInstances
      ? system
      : { ...system, taskInstances: overlaidTaskInstances };

  const backendWeekByNumber = new Map(details.weeks.map((week) => [week.weekNumber, week] as const));
  const dailyCheckIns = mergeDailyCheckIns(taskOverlaidSystem, backendWeekByNumber);
  const checkInOverlaidSystem =
    dailyCheckIns === taskOverlaidSystem.dailyCheckIns
      ? taskOverlaidSystem
      : { ...taskOverlaidSystem, dailyCheckIns };
  const weeklyReviews = mergeWeeklyReviews(checkInOverlaidSystem, backendWeekByNumber);
  const currentWeek = getTwelveWeekCurrentWeek(checkInOverlaidSystem);
  const currentWeekMetricSummary = getMetricProgressSummary(backendWeekByNumber.get(currentWeek));
  const currentWeekReview = weeklyReviews.find((review) => review.weekNumber === currentWeek);
  const lagMetricCurrentValue =
    currentWeekReview?.lagProgressValue?.trim() ||
    currentWeekMetricSummary ||
    checkInOverlaidSystem.lagMetric.currentValue.trim();

  const systemWithReviewOverlay: TwelveWeekSystem = {
    ...checkInOverlaidSystem,
    lagMetric:
      lagMetricCurrentValue === checkInOverlaidSystem.lagMetric.currentValue
        ? checkInOverlaidSystem.lagMetric
        : {
            ...checkInOverlaidSystem.lagMetric,
            currentValue: lagMetricCurrentValue,
          },
    weeklyReviews,
  };

  const scoreboard = buildDerivedScoreboard(
    systemWithReviewOverlay,
    getDefaultScoreboard(systemWithReviewOverlay.totalWeeks),
  ).map((week) => {
    const backendWeek = backendWeekByNumber.get(week.weekNumber);
    const backendReview = backendWeek?.review;
    const metricSummary = getMetricProgressSummary(backendWeek);
    const localReviewDone =
      checkInOverlaidSystem.weeklyReviews.find((review) => review.weekNumber === week.weekNumber)?.reviewCompleted ??
      checkInOverlaidSystem.scoreboard.find((item) => item.weekNumber === week.weekNumber)?.reviewDone ??
      week.reviewDone;

    return {
      ...week,
      mainMetricProgress: week.mainMetricProgress || metricSummary,
      outputDone: backendReview?.reflection?.trim() || week.outputDone,
      reviewDone: backendReview ? true : localReviewDone,
      weeklyScore: backendReview?.executionScore ?? week.weeklyScore,
    };
  });

  return {
    ...systemWithReviewOverlay,
    scoreboard,
  };
}

interface BackendProgressOverlayResult {
  effectiveSystem: TwelveWeekSystem | null;
  loading: boolean;
  hasBackendData: boolean;
  refresh: () => void;
  invalidateOverlay: () => void;
}

export function useBackendProgressOverlay(
  goalId: string | null,
  system: TwelveWeekSystem | null,
): BackendProgressOverlayResult {
  const { user } = useAuthContext();
  const [details, setDetails] = useState<PlanDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasBackendData, setHasBackendData] = useState(false);
  const [overlayInvalidated, setOverlayInvalidated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastFetchedPlanId = useRef<string | null>(null);
  const fetchDetailsRef = useRef<() => Promise<void>>(async () => {});

  const fetchDetails = useCallback(async () => {
    if (!user || !goalId || !system) {
      setLoading(false);
      setDetails(null);
      setHasBackendData(false);
      return;
    }

    const link = getPlanLink(goalId);
    if (!link?.planId) {
      setLoading(false);
      setDetails(null);
      setHasBackendData(false);
      return;
    }

    if (lastFetchedPlanId.current === link.planId && hasBackendData) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    try {
      const nextDetails = await getPlan(link.planId);
      if (controller.signal.aborted) return;

      savePlanDetailsLink(goalId, nextDetails);
      setDetails(nextDetails);
      setHasBackendData(true);
      lastFetchedPlanId.current = link.planId;
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error("Backend progress overlay fetch failed, using local progress data.", error);
        setDetails(null);
        setHasBackendData(false);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [goalId, hasBackendData, system, user]);

  useEffect(() => {
    fetchDetailsRef.current = fetchDetails;
  }, [fetchDetails]);

  useEffect(() => {
    void fetchDetails();

    return () => {
      abortRef.current?.abort();
    };
  }, [fetchDetails]);

  useEffect(() => {
    if (overlayInvalidated) {
      setOverlayInvalidated(false);
    }
  }, [overlayInvalidated]);

  const effectiveSystem = useMemo(() => {
    if (!system || !goalId || !details || overlayInvalidated) return system;

    const link = getPlanLink(goalId);
    return applyBackendProgressOverlay(system, details, link?.taskIdByLocalTaskId ?? {});
  }, [details, goalId, overlayInvalidated, system]);

  const refresh = useCallback(() => {
    lastFetchedPlanId.current = null;
    void fetchDetailsRef.current();
  }, []);

  const invalidateOverlay = useCallback(() => {
    setOverlayInvalidated(true);
  }, []);

  return {
    effectiveSystem,
    loading,
    hasBackendData,
    refresh,
    invalidateOverlay,
  };
}

interface GoalProgressOverlayEntry {
  goalId: string;
  system: Goal["twelveWeekSystem"] | null | undefined;
}

export function useBackendProgressOverlayMap(
  entries: GoalProgressOverlayEntry[],
): ReadonlyMap<string, TwelveWeekSystem> {
  const { user } = useAuthContext();
  const [detailsByGoalId, setDetailsByGoalId] = useState<Record<string, PlanDetails>>({});

  const normalizedEntries = useMemo(
    () => entries.filter((entry) => entry.goalId && entry.system),
    [entries],
  );

  useEffect(() => {
    if (!user || normalizedEntries.length === 0) {
      setDetailsByGoalId({});
      return;
    }

    let cancelled = false;

    const fetchAll = async () => {
      const nextEntries = await Promise.all(
        normalizedEntries.map(async (entry) => {
          const link = getPlanLink(entry.goalId);
          if (!link?.planId || !entry.system) {
            return [entry.goalId, null] as const;
          }

          try {
            const details = await getPlan(link.planId);
            return [entry.goalId, details] as const;
          } catch (error) {
            console.error(`Backend progress overlay fetch failed for goal ${entry.goalId}, using local data.`, error);
            return [entry.goalId, null] as const;
          }
        }),
      );

      if (cancelled) return;

      const nextDetailsByGoalId: Record<string, PlanDetails> = {};
      nextEntries.forEach(([goalId, details]) => {
        if (details) {
          savePlanDetailsLink(goalId, details);
          nextDetailsByGoalId[goalId] = details;
        }
      });

      setDetailsByGoalId(nextDetailsByGoalId);
    };

    void fetchAll();

    return () => {
      cancelled = true;
    };
  }, [normalizedEntries, user]);

  return useMemo(() => {
    if (normalizedEntries.length === 0) return EMPTY_OVERLAY_MAP;

    const overlayMap = new Map<string, TwelveWeekSystem>();

    normalizedEntries.forEach((entry) => {
      if (!entry.system) return;

      const details = detailsByGoalId[entry.goalId];
      if (!details) return;

      const link = getPlanLink(entry.goalId);
      overlayMap.set(
        entry.goalId,
        applyBackendProgressOverlay(entry.system, details, link?.taskIdByLocalTaskId ?? {}),
      );
    });

    return overlayMap;
  }, [detailsByGoalId, normalizedEntries]);
}
