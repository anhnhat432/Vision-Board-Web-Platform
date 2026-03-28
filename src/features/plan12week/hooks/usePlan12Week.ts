import { useCallback, useEffect, useMemo, useState } from "react";

import { toAppError } from "@/lib/api/apiClient";
import { createPlan as createRemotePlan, getPlanById, type CreatePlanPayload } from "@/services/planService";
import { addTask as addRemoteTask, updateTask as updateRemoteTask } from "@/services/taskService";
import { createMetric as createRemoteMetric, getMetrics, logMetric as logRemoteMetric } from "@/services/metricService";
import { submitWeeklyReview as submitRemoteWeeklyReview, updateWeek as updateRemoteWeek } from "@/services/weekService";
import type { AppError } from "@/types/api";
import type {
  Metric as ApiLeadMetric,
  PlanDetails as ApiPlanDetails,
  Task as ApiTask,
  Week as ApiWeek,
  WeekDetails as ApiPlanWeekDetail,
} from "@/types/plan";

import { generateAdaptiveSuggestion } from "../logic/adaptivePlanning";
import { analyzeExecutionPatterns } from "../logic/behaviorInsights";
import {
  generateExecutionSuggestion,
  interpretExecutionScore,
} from "../logic/executionFeedback";
import { calculateExecutionScore } from "../logic/executionScore";
import { calculateGoalProgress } from "../logic/goalProgress";
import { logLeadMetric as appendLeadMetricLog } from "../logic/leadMetrics";
import { calculatePlanInsights } from "../logic/planInsights";
import { calculatePlanProgress } from "../logic/progress";
import { calculateMetricStreak } from "../logic/streak";
import { getWeeklyTaskWarning } from "../logic/taskConstraints";
import { createWeeklyReview } from "../logic/weeklyReview";
import type { BehaviorInsights } from "../logic/behaviorInsights";
import type { Plan12Week, Task, TaskStatus, Week, WeekReview } from "../types/planTypes";
import type { GoalProgress } from "../types/goalProgress";
import type { PlanInsights } from "../types/planInsights";

interface AddTaskInput {
  title: string;
  scheduledDate?: string;
  status?: TaskStatus;
}

interface UpdateWeekInput {
  focus?: string;
  expectedOutput?: string;
  tasks?: Task[];
  leadMetrics?: Week["leadMetrics"];
  review?: Week["review"];
}

function createId(prefix: string): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function isLikelyMongoId(value: string | null | undefined): value is string {
  return typeof value === "string" && /^[0-9a-f]{24}$/i.test(value);
}

function normalizeDateValue(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.valueOf())) return value;
  return parsed.toISOString();
}

function toIsoStringIfValid(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.valueOf())) return undefined;
  return parsed.toISOString();
}

function mapApiTask(task: ApiTask): Task {
  return {
    id: task.id,
    weekId: task.weekId,
    title: task.title,
    status: task.status,
    scheduledDate: normalizeDateValue(task.scheduledDate),
  };
}

function mapApiMetric(metric: ApiLeadMetric): Week["leadMetrics"][number] {
  return {
    id: metric.id,
    weekId: metric.weekId,
    name: metric.name,
    weeklyTarget: metric.weeklyTarget,
    logs: metric.logs.map((log) => ({
      id: log.id,
      date: normalizeDateValue(log.date) ?? log.date,
      value: log.value,
      completed: log.completed,
    })),
  };
}

function mapApiWeek(week: ApiPlanWeekDetail | ApiWeek): Week {
  const detailWeek = week as ApiPlanWeekDetail;

  return {
    id: week.id,
    planId: week.planId,
    weekNumber: week.weekNumber,
    focus: week.focus,
    expectedOutput: week.expectedOutput,
    tasks: Array.isArray(detailWeek.tasks) ? detailWeek.tasks.map(mapApiTask) : [],
    leadMetrics: Array.isArray(detailWeek.metrics) ? detailWeek.metrics.map(mapApiMetric) : [],
    review: week.review
      ? {
          weekNumber: week.review.weekNumber,
          executionScore: week.review.executionScore,
          reflection: week.review.reflection,
          adjustments: week.review.adjustments,
        }
      : undefined,
  };
}

function mapApiPlan(details: ApiPlanDetails): Plan12Week {
  return {
    id: details.plan.id,
    userId: details.plan.userId,
    vision: details.plan.vision,
    smartGoalId: details.plan.smartGoalId ?? "",
    startDate: normalizeDateValue(details.plan.startDate) ?? details.plan.startDate,
    createdAt: normalizeDateValue(details.plan.createdAt),
    updatedAt: normalizeDateValue(details.plan.updatedAt),
    weeks: details.weeks.map((week) => mapApiWeek(week)),
  };
}

function createMetricLookupKey(weekNumber: number, metricName: string): string {
  return `${weekNumber}::${metricName.trim().toLowerCase()}`;
}

function extractInitialWeekIdMap(plan: Plan12Week | null): Record<number, string> {
  if (!plan) return {};

  return plan.weeks.reduce<Record<number, string>>((accumulator, week) => {
    if (typeof week.id === "string" && week.id.length > 0) {
      accumulator[week.weekNumber] = week.id;
    }
    return accumulator;
  }, {});
}

function extractInitialMetricIdMap(plan: Plan12Week | null): Record<string, string> {
  if (!plan) return {};

  return plan.weeks.reduce<Record<string, string>>((accumulator, week) => {
    week.leadMetrics.forEach((metric) => {
      if (typeof metric.id === "string" && metric.id.length > 0) {
        accumulator[createMetricLookupKey(week.weekNumber, metric.name)] = metric.id;
      }
    });

    return accumulator;
  }, {});
}

function updateWeekByNumber(
  currentPlan: Plan12Week,
  weekNumber: number,
  updater: (week: Week) => Week,
): Plan12Week {
  return {
    ...currentPlan,
    weeks: currentPlan.weeks.map((week) => (week.weekNumber === weekNumber ? updater(week) : week)),
  };
}

function cloneTasks(tasks: Task[]): Task[] {
  return tasks.map((task) => ({ ...task }));
}

function cloneLeadMetrics(metrics: Week["leadMetrics"]): Week["leadMetrics"] {
  return metrics.map((metric) => ({
    ...metric,
    logs: metric.logs.map((log) => ({ ...log })),
  }));
}

const DEFAULT_GOAL_PROGRESS: GoalProgress = {
  baseline: 0,
  current: 0,
  target: 100,
};

const DEFAULT_BEHAVIOR_INSIGHTS: BehaviorInsights = {
  bestDayOfWeek: "unknown",
  averageExecutionScore: 0,
  longestMetricStreak: 0,
  weakestWeek: null,
};

const DEFAULT_PLAN_INSIGHTS: PlanInsights = {
  averageScore: 0,
  bestWeek: null,
  worstWeek: null,
  consistencyScore: 0,
};

export function usePlan12Week(initialPlan: Plan12Week | null = null) {
  const [plan, setPlan] = useState<Plan12Week | null>(initialPlan);
  const [goalProgress, setGoalProgress] = useState<GoalProgress>(DEFAULT_GOAL_PROGRESS);
  const [error, setError] = useState<AppError | null>(null);
  const [pendingApiRequests, setPendingApiRequests] = useState(0);
  const [apiPlanId, setApiPlanId] = useState<string | null>(
    isLikelyMongoId(initialPlan?.id) ? initialPlan.id : null,
  );
  const [weekIdByNumber, setWeekIdByNumber] = useState<Record<number, string>>(
    () => extractInitialWeekIdMap(initialPlan),
  );
  const [metricIdByKey, setMetricIdByKey] = useState<Record<string, string>>(
    () => extractInitialMetricIdMap(initialPlan),
  );

  useEffect(() => {
    if (!initialPlan) return;

    setWeekIdByNumber((previousMap) => ({
      ...previousMap,
      ...extractInitialWeekIdMap(initialPlan),
    }));
    setMetricIdByKey((previousMap) => ({
      ...previousMap,
      ...extractInitialMetricIdMap(initialPlan),
    }));

    if (isLikelyMongoId(initialPlan.id)) {
      setApiPlanId(initialPlan.id);
    }
  }, [initialPlan]);

  const loading = pendingApiRequests > 0;

  const runWithApi = useCallback(async <T,>(operation: () => Promise<T>): Promise<T | null> => {
    setError(null);
    setPendingApiRequests((count) => count + 1);

    try {
      return await operation();
    } catch (nextError) {
      setError(toAppError(nextError));
      console.error("Plan API request failed.", nextError);
      return null;
    } finally {
      setPendingApiRequests((count) => Math.max(0, count - 1));
    }
  }, []);

  const applyPlanDetails = useCallback((details: ApiPlanDetails) => {
    const nextPlan = mapApiPlan(details);
    setApiPlanId(details.plan.id);
    setPlan(nextPlan);
    setWeekIdByNumber(
      details.weeks.reduce<Record<number, string>>((accumulator, week) => {
        accumulator[week.weekNumber] = week.id;
        return accumulator;
      }, {}),
    );
    setMetricIdByKey(
      details.weeks.reduce<Record<string, string>>((accumulator, week) => {
        week.metrics.forEach((metric) => {
          accumulator[createMetricLookupKey(week.weekNumber, metric.name)] = metric.id;
        });
        return accumulator;
      }, {}),
    );
  }, []);

  const loadPlan = useCallback(async (planId: string): Promise<Plan12Week | null> => {
    const details = await runWithApi(() => getPlanById(planId));
    if (!details) return null;

    applyPlanDetails(details);
    return mapApiPlan(details);
  }, [applyPlanDetails, runWithApi]);

  const createPlan = useCallback(async (payload: CreatePlanPayload): Promise<Plan12Week | null> => {
    const created = await runWithApi(() => createRemotePlan(payload));
    if (!created) return null;

    const details = await runWithApi(() => getPlanById(created.id));
    if (!details) {
      const nextPlan: Plan12Week = {
        id: created.id,
        userId: created.userId,
        vision: created.vision,
        smartGoalId: created.smartGoalId ?? "",
        startDate: normalizeDateValue(created.startDate) ?? created.startDate,
        createdAt: normalizeDateValue(created.createdAt),
        updatedAt: normalizeDateValue(created.updatedAt),
        weeks: [],
      };
      setApiPlanId(created.id);
      setPlan(nextPlan);
      return nextPlan;
    }

    applyPlanDetails(details);
    return mapApiPlan(details);
  }, [applyPlanDetails, runWithApi]);

  useEffect(() => {
    if (!apiPlanId || !isLikelyMongoId(apiPlanId)) return;
    if (plan?.weeks.length) return;

    void loadPlan(apiPlanId);
  }, [apiPlanId, loadPlan, plan?.weeks.length]);

  const allTasks = useMemo(() => plan?.weeks.flatMap((week) => week.tasks) ?? [], [plan]);
  const executionScore = useMemo(() => calculateExecutionScore(allTasks), [allTasks]);
  const planProgress = useMemo(() => (plan ? calculatePlanProgress(plan) : 0), [plan]);
  const goalProgressPercent = useMemo(() => calculateGoalProgress(goalProgress), [goalProgress]);

  const getWeekId = useCallback((weekNumber: number): string | null => {
    const knownWeekId = weekIdByNumber[weekNumber];
    if (knownWeekId) return knownWeekId;

    const planWeekId = plan?.weeks.find((week) => week.weekNumber === weekNumber)?.id;
    return typeof planWeekId === "string" && planWeekId.length > 0 ? planWeekId : null;
  }, [plan, weekIdByNumber]);

  const updateWeek = (weekNumber: number, updates: UpdateWeekInput) => {
    const previousWeek = plan?.weeks.find((week) => week.weekNumber === weekNumber);

    setPlan((previousPlan) => {
      if (!previousPlan) return previousPlan;

      return updateWeekByNumber(previousPlan, weekNumber, (week) => ({
        ...week,
        ...updates,
        tasks: updates.tasks ?? week.tasks,
        leadMetrics: updates.leadMetrics ?? week.leadMetrics,
        review: updates.review ?? week.review,
      }));
    });

    const hasRemotePatch = updates.focus !== undefined || updates.expectedOutput !== undefined;
    if (!hasRemotePatch) return;

    const weekId = getWeekId(weekNumber);
    if (!weekId) return;

    void (async () => {
      const updatedWeek = await runWithApi(() =>
        updateRemoteWeek(weekId, {
          focus: updates.focus,
          expectedOutput: updates.expectedOutput,
        }),
      );

      if (!updatedWeek) {
        if (!previousWeek) return;

        setPlan((previousPlan) => {
          if (!previousPlan) return previousPlan;

          return updateWeekByNumber(previousPlan, weekNumber, () => ({
            ...previousWeek,
            tasks: cloneTasks(previousWeek.tasks),
            leadMetrics: cloneLeadMetrics(previousWeek.leadMetrics),
            review: previousWeek.review ? { ...previousWeek.review } : undefined,
          }));
        });
        return;
      }

      setPlan((previousPlan) => {
        if (!previousPlan) return previousPlan;

        return updateWeekByNumber(previousPlan, weekNumber, (week) => ({
          ...week,
          id: updatedWeek.id,
          planId: updatedWeek.planId,
          focus: updatedWeek.focus,
          expectedOutput: updatedWeek.expectedOutput,
        }));
      });
    })();
  };

  const addTask = (weekNumber: number, input: AddTaskInput): string | null => {
    let warning: string | null = null;
    const temporaryTaskId = createId("task");
    const previousTasks = cloneTasks(
      plan?.weeks.find((week) => week.weekNumber === weekNumber)?.tasks ?? [],
    );

    setPlan((previousPlan) => {
      if (!previousPlan) return previousPlan;

      return updateWeekByNumber(previousPlan, weekNumber, (week) => {
        const nextTasks: Task[] = [
          ...week.tasks,
          {
            id: temporaryTaskId,
            title: input.title,
            status: input.status ?? "todo",
            scheduledDate: input.scheduledDate,
          },
        ];

        warning = getWeeklyTaskWarning(nextTasks.length);
        return { ...week, tasks: nextTasks };
      });
    });

    const weekId = getWeekId(weekNumber);
    if (!weekId) {
      return warning;
    }

    void (async () => {
      const createdTask = await runWithApi(() =>
        addRemoteTask(weekId, {
          title: input.title,
          status: input.status ?? "todo",
          scheduledDate: toIsoStringIfValid(input.scheduledDate),
        }),
      );

      if (!createdTask) {
        setPlan((previousPlan) => {
          if (!previousPlan) return previousPlan;

          return updateWeekByNumber(previousPlan, weekNumber, (week) => ({
            ...week,
            tasks: cloneTasks(previousTasks),
          }));
        });
        return;
      }

      setPlan((previousPlan) => {
        if (!previousPlan) return previousPlan;

        return updateWeekByNumber(previousPlan, weekNumber, (week) => ({
          ...week,
          tasks: week.tasks.map((task) =>
            task.id === temporaryTaskId ? mapApiTask(createdTask) : task,
          ),
        }));
      });
    })();

    return warning;
  };

  const updateTaskStatus = (
    weekNumber: number,
    taskId: string,
    status: TaskStatus,
  ) => {
    const previousStatus = plan?.weeks
      .find((week) => week.weekNumber === weekNumber)
      ?.tasks.find((task) => task.id === taskId)?.status;

    setPlan((previousPlan) => {
      if (!previousPlan) return previousPlan;

      return updateWeekByNumber(previousPlan, weekNumber, (week) => ({
        ...week,
        tasks: week.tasks.map((task) => (task.id === taskId ? { ...task, status } : task)),
      }));
    });

    if (!isLikelyMongoId(taskId)) {
      return;
    }

    void (async () => {
      const updatedTask = await runWithApi(() => updateRemoteTask(taskId, { status }));

      if (!updatedTask) {
        if (!previousStatus) return;

        setPlan((previousPlan) => {
          if (!previousPlan) return previousPlan;

          return updateWeekByNumber(previousPlan, weekNumber, (week) => ({
            ...week,
            tasks: week.tasks.map((task) =>
              task.id === taskId ? { ...task, status: previousStatus } : task,
            ),
          }));
        });
        return;
      }

      setPlan((previousPlan) => {
        if (!previousPlan) return previousPlan;

        return updateWeekByNumber(previousPlan, weekNumber, (week) => ({
          ...week,
          tasks: week.tasks.map((task) =>
            task.id === updatedTask.id ? mapApiTask(updatedTask) : task,
          ),
        }));
      });
    })();
  };

  const ensureMetricId = useCallback(async (
    weekNumber: number,
    metricName: string,
  ): Promise<string | null> => {
    const weekId = getWeekId(weekNumber);
    if (!weekId) return null;

    const lookupKey = createMetricLookupKey(weekNumber, metricName);
    const knownMetricId = metricIdByKey[lookupKey];
    if (knownMetricId) return knownMetricId;

    const weekMetrics = await runWithApi(() => getMetrics(weekId));
    const existingMetric = weekMetrics?.find(
      (metric) => metric.name.trim().toLowerCase() === metricName.trim().toLowerCase(),
    );

    if (existingMetric) {
      setMetricIdByKey((previousMap) => ({
        ...previousMap,
        [lookupKey]: existingMetric.id,
      }));
      return existingMetric.id;
    }

    const createdMetric = await runWithApi(() =>
      createRemoteMetric(weekId, {
        name: metricName,
        weeklyTarget: 0,
      }),
    );

    if (!createdMetric) return null;

    setMetricIdByKey((previousMap) => ({
      ...previousMap,
      [lookupKey]: createdMetric.id,
    }));

    return createdMetric.id;
  }, [getWeekId, metricIdByKey, runWithApi]);

  const logLeadMetric = (
    weekNumber: number,
    metricName: string,
    value: number,
    date = new Date().toISOString(),
  ) => {
    const normalizedMetricName = metricName.trim();
    if (!normalizedMetricName) return;
    const previousLeadMetrics = cloneLeadMetrics(
      plan?.weeks.find((week) => week.weekNumber === weekNumber)?.leadMetrics ?? [],
    );
    const shouldSyncRemote = Boolean(getWeekId(weekNumber));

    const rollbackMetrics = () => {
      setPlan((previousPlan) => {
        if (!previousPlan) return previousPlan;

        return updateWeekByNumber(previousPlan, weekNumber, (week) => ({
          ...week,
          leadMetrics: cloneLeadMetrics(previousLeadMetrics),
        }));
      });
    };

    setPlan((previousPlan) => {
      if (!previousPlan) return previousPlan;

      return updateWeekByNumber(previousPlan, weekNumber, (week) => {
        const existingMetricIndex = week.leadMetrics.findIndex(
          (metric) => metric.name === normalizedMetricName,
        );

        if (existingMetricIndex < 0) {
          return {
            ...week,
            leadMetrics: [
              ...week.leadMetrics,
              appendLeadMetricLog(
                {
                  name: normalizedMetricName,
                  weeklyTarget: 0,
                  logs: [],
                },
                date,
                value,
              ),
            ],
          };
        }

        return {
          ...week,
          leadMetrics: week.leadMetrics.map((metric, index) =>
            index === existingMetricIndex ? appendLeadMetricLog(metric, date, value) : metric,
          ),
        };
      });
    });

    if (!shouldSyncRemote) {
      return;
    }

    void (async () => {
      const metricId = await ensureMetricId(weekNumber, normalizedMetricName);
      if (!metricId) {
        rollbackMetrics();
        return;
      }

      const updatedMetric = await runWithApi(() =>
        logRemoteMetric(metricId, {
          date: toIsoStringIfValid(date),
          value,
          completed: value > 0,
        }),
      );

      if (!updatedMetric) {
        rollbackMetrics();
        return;
      }

      setMetricIdByKey((previousMap) => ({
        ...previousMap,
        [createMetricLookupKey(weekNumber, normalizedMetricName)]: updatedMetric.id,
      }));

      setPlan((previousPlan) => {
        if (!previousPlan) return previousPlan;

        return updateWeekByNumber(previousPlan, weekNumber, (week) => {
          const metricIndex = week.leadMetrics.findIndex(
            (metric) => metric.name.trim().toLowerCase() === normalizedMetricName.toLowerCase(),
          );

          if (metricIndex < 0) {
            return {
              ...week,
              leadMetrics: [...week.leadMetrics, mapApiMetric(updatedMetric)],
            };
          }

          return {
            ...week,
            leadMetrics: week.leadMetrics.map((metric, index) =>
              index === metricIndex ? mapApiMetric(updatedMetric) : metric,
            ),
          };
        });
      });
    })();
  };

  const submitWeeklyReview = (
    weekNumber: number,
    reflection?: string,
    adjustments?: string,
  ): WeekReview | null => {
    let createdReview: WeekReview | null = null;
    const previousReview = plan?.weeks.find((week) => week.weekNumber === weekNumber)?.review;

    setPlan((previousPlan) => {
      if (!previousPlan) return previousPlan;

      return updateWeekByNumber(previousPlan, weekNumber, (week) => {
        createdReview = createWeeklyReview(week, week.tasks, reflection, adjustments);
        return {
          ...week,
          review: createdReview ?? week.review,
        };
      });
    });

    const weekId = getWeekId(weekNumber);
    if (!weekId) {
      return createdReview;
    }

    void (async () => {
      const fallbackScore = calculateExecutionScore(
        plan?.weeks.find((week) => week.weekNumber === weekNumber)?.tasks ?? [],
      );
      const updatedWeek = await runWithApi(() =>
        submitRemoteWeeklyReview(weekId, {
          weekNumber,
          executionScore: fallbackScore,
          reflection,
          adjustments,
        }),
      );

      if (!updatedWeek) {
        setPlan((previousPlan) => {
          if (!previousPlan) return previousPlan;

          return updateWeekByNumber(previousPlan, weekNumber, (week) => ({
            ...week,
            review: previousReview ? { ...previousReview } : undefined,
          }));
        });
        return;
      }

      setPlan((previousPlan) => {
        if (!previousPlan) return previousPlan;

        return updateWeekByNumber(previousPlan, weekNumber, (week) => ({
          ...week,
          id: updatedWeek.id,
          planId: updatedWeek.planId,
          review: updatedWeek.review
            ? {
                weekNumber: updatedWeek.review.weekNumber,
                executionScore: updatedWeek.review.executionScore,
                reflection: updatedWeek.review.reflection,
                adjustments: updatedWeek.review.adjustments,
              }
            : week.review,
        }));
      });
    })();

    return createdReview;
  };

  const getExecutionFeedback = (weekNumber: number): {
    status: ReturnType<typeof interpretExecutionScore>;
    suggestion: string;
    score: number;
  } => {
    const score = getExecutionScore(weekNumber);
    return {
      status: interpretExecutionScore(score),
      suggestion: generateExecutionSuggestion(score),
      score,
    };
  };

  const updateGoalProgress = (value: number) => {
    setGoalProgress((previousProgress) => ({
      ...previousProgress,
      current: Number.isFinite(value) ? value : previousProgress.current,
    }));
  };

  const getMetricStreak = (metricName: string) => {
    const normalizedMetricName = metricName.trim();
    if (!normalizedMetricName) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    const allLogs =
      plan?.weeks
        .flatMap((week) => week.leadMetrics)
        .filter((metric) => metric.name === normalizedMetricName)
        .flatMap((metric) => metric.logs) ?? [];

    return calculateMetricStreak(allLogs);
  };

  const getAdaptiveSuggestion = (weekNumber: number): string => {
    const week = plan?.weeks.find((item) => item.weekNumber === weekNumber);
    const taskCount = week?.tasks.length ?? 0;
    const score = calculateExecutionScore(week?.tasks ?? []);

    return generateAdaptiveSuggestion(score, taskCount);
  };

  const getBehaviorInsights = (): BehaviorInsights => {
    if (!plan) return DEFAULT_BEHAVIOR_INSIGHTS;
    return analyzeExecutionPatterns(plan);
  };

  const getPlanInsights = (): PlanInsights => {
    if (!plan) return DEFAULT_PLAN_INSIGHTS;
    return calculatePlanInsights(plan);
  };

  const getExecutionScore = (weekNumber: number): number => {
    const week = plan?.weeks.find((item) => item.weekNumber === weekNumber);
    if (!week) return 0;

    return calculateExecutionScore(week.tasks);
  };

  const getWeekExecutionScore = (weekNumber: number): number => getExecutionScore(weekNumber);

  const getTaskWarning = (weekNumber: number): string | null => {
    const week = plan?.weeks.find((item) => item.weekNumber === weekNumber);
    if (!week) return null;

    return getWeeklyTaskWarning(week.tasks.length);
  };

  const actions = {
    setPlan,
    createPlan,
    loadPlan,
    updateWeek,
    addTask,
    updateTaskStatus,
    logLeadMetric,
    submitWeeklyReview,
    updateGoalProgress,
    setGoalProgress,
  } as const;

  const data = {
    plan,
    executionScore,
    planProgress,
    goalProgress,
    goalProgressPercent,
  } as const;

  return {
    plan,
    setPlan,
    error,
    loading,
    apiPlanId,
    createPlan,
    loadPlan,
    updateWeek,
    addTask,
    updateTaskStatus,
    logLeadMetric,
    submitWeeklyReview,
    getExecutionFeedback,
    updateGoalProgress,
    getMetricStreak,
    getAdaptiveSuggestion,
    getBehaviorInsights,
    getPlanInsights,
    executionScore,
    planProgress,
    goalProgress,
    goalProgressPercent,
    setGoalProgress,
    getExecutionScore,
    getWeekExecutionScore,
    getTaskWarning,
    data,
    actions,
  };
}
