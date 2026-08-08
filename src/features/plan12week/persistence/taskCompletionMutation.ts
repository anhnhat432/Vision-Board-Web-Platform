import { checkAchievementsInData } from "@/app/utils/storage-achievement-ops";
import { getUserData, replaceUserData, saveUserData } from "@/app/utils/storage";
import { buildDerivedScoreboard, getDefaultScoreboard } from "@/app/utils/storage-twelve-week";
import type { TwelveWeekSystem, TwelveWeekTaskInstance, UserData } from "@/app/utils/storage-types";
import { enqueueLeadMetricUpsertedMutations } from "./leadMetricMutation";
import { enqueueStoredMutation } from "./mutationQueue";
import { getPlanLink, getRemoteTaskIdForGoal } from "./planLinkStore";
import { getTwelveWeekClientPlanId, getTwelveWeekClientWeekId } from "./twelveWeekImportPayload";

export interface CommitTwelveWeekTaskCompletionInput {
  goalId: string;
  taskId: string;
  completed: boolean;
  now?: number | Date;
}

export interface RollbackTwelveWeekTaskCompletionInput {
  goalId: string;
  taskId: string;
  previousTask: TwelveWeekTaskInstance;
  attemptedTask: TwelveWeekTaskInstance;
  now?: number | Date;
}

interface AppliedTwelveWeekTaskCompletionResult {
  status: "applied";
  previousTask: TwelveWeekTaskInstance;
  updatedTask: TwelveWeekTaskInstance;
  updatedSystem: TwelveWeekSystem;
  taskMutationEnqueued: boolean;
  leadMetricMutationCount: number;
}

interface NoopTwelveWeekTaskCompletionResult {
  status: "noop";
  reason: "already_matches" | "state_changed";
  currentTask: TwelveWeekTaskInstance;
  currentSystem: TwelveWeekSystem;
}

interface NotFoundTwelveWeekTaskCompletionResult {
  status: "not_found";
  target: "goal" | "system" | "task";
}

interface LocalSaveFailedTwelveWeekTaskCompletionResult {
  status: "local_save_failed";
  previousTask: TwelveWeekTaskInstance;
  attemptedTask: TwelveWeekTaskInstance;
}

export type TwelveWeekTaskCompletionResult =
  | AppliedTwelveWeekTaskCompletionResult
  | NoopTwelveWeekTaskCompletionResult
  | NotFoundTwelveWeekTaskCompletionResult
  | LocalSaveFailedTwelveWeekTaskCompletionResult;

function resolveNow(value?: number | Date): { milliseconds: number; iso: string } {
  const milliseconds = value instanceof Date ? value.getTime() : (value ?? Date.now());
  return { milliseconds, iso: new Date(milliseconds).toISOString() };
}

function findTask(data: UserData, goalId: string, taskId: string) {
  const goal = data.goals.find((item) => item.id === goalId);
  if (!goal) return { status: "not_found", target: "goal" } as const;
  if (!goal.twelveWeekSystem) return { status: "not_found", target: "system" } as const;
  const task = goal.twelveWeekSystem.taskInstances.find((item) => item.id === taskId);
  if (!task) return { status: "not_found", target: "task" } as const;

  return { status: "found", goal, system: goal.twelveWeekSystem, task } as const;
}

function taskSnapshotsMatch(left: TwelveWeekTaskInstance, right: TwelveWeekTaskInstance): boolean {
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  if (leftKeys.length !== rightKeys.length) return false;
  if (!leftKeys.every((key, index) => key === rightKeys[index])) return false;

  return leftKeys.every(
    (key) => left[key as keyof TwelveWeekTaskInstance] === right[key as keyof TwelveWeekTaskInstance],
  );
}

function buildUpdatedSystem(
  system: TwelveWeekSystem,
  taskId: string,
  updatedTask: TwelveWeekTaskInstance,
): TwelveWeekSystem {
  const nextSystem = {
    ...system,
    taskInstances: system.taskInstances.map((task) => (task.id === taskId ? updatedTask : task)),
  };

  return {
    ...nextSystem,
    scoreboard: buildDerivedScoreboard(nextSystem, getDefaultScoreboard(nextSystem.totalWeeks)),
  };
}

function persistTaskSnapshot(
  data: UserData,
  goalId: string,
  taskId: string,
  previousTask: TwelveWeekTaskInstance,
  updatedTask: TwelveWeekTaskInstance,
  options: { replaceLatestSnapshot?: boolean; queueNow?: Date } = {},
): AppliedTwelveWeekTaskCompletionResult | LocalSaveFailedTwelveWeekTaskCompletionResult {
  const found = findTask(data, goalId, taskId);
  if (found.status !== "found") {
    return {
      status: "local_save_failed",
      previousTask,
      attemptedTask: updatedTask,
    };
  }

  const updatedSystem = buildUpdatedSystem(found.system, taskId, updatedTask);
  const nextData: UserData = {
    ...data,
    goals: data.goals.map((goal) =>
      goal.id === goalId
        ? {
            ...goal,
            twelveWeekSystem: updatedSystem,
          }
        : goal,
    ),
    achievements: [...data.achievements],
  };

  checkAchievementsInData(nextData);
  const didSave = options.replaceLatestSnapshot ? replaceUserData(nextData) : saveUserData(nextData);
  if (!didSave) {
    return {
      status: "local_save_failed",
      previousTask,
      attemptedTask: updatedTask,
    };
  }

  const queueNow = options.queueNow ?? new Date();
  const taskMutationEnqueued = enqueueTaskCompletionChangedMutation(goalId, updatedTask, queueNow);
  const leadMetricMutationCount = enqueueLeadMetricUpsertedMutations(goalId, updatedSystem, "task_progress", {
    weekNumbers: [updatedTask.weekNumber],
    indicatorIds: updatedTask.tacticId ? [updatedTask.tacticId] : undefined,
    indicatorNames: updatedTask.leadIndicatorName ? [updatedTask.leadIndicatorName] : undefined,
    now: queueNow,
  });

  return {
    status: "applied",
    previousTask,
    updatedTask,
    updatedSystem,
    taskMutationEnqueued,
    leadMetricMutationCount,
  };
}

function enqueueTaskCompletionChangedMutation(goalId: string, task: TwelveWeekTaskInstance, now: Date): boolean {
  try {
    const planLink = getPlanLink(goalId);
    const backendPlanId = planLink?.planId ?? null;
    const backendWeekId = planLink?.weekIdByNumber[task.weekNumber] ?? null;
    const result = enqueueStoredMutation(
      {
        kind: "task_completed_changed",
        goalId,
        planId: backendPlanId,
        payload: {
          taskId: task.id,
          backendTaskId: getRemoteTaskIdForGoal(goalId, task.id),
          backendPlanId,
          backendWeekId,
          clientTaskId: task.id,
          clientPlanId: getTwelveWeekClientPlanId(goalId),
          clientWeekId: getTwelveWeekClientWeekId(goalId, task.weekNumber),
          weekNumber: task.weekNumber,
          completed: task.completed,
          completedAt: task.completedAt,
          scheduledDate: task.scheduledDate,
          title: task.title,
          leadIndicatorName: task.leadIndicatorName,
          isCore: task.isCore,
        },
      },
      { now },
    );

    return result.ok;
  } catch {
    return false;
  }
}

export function commitTwelveWeekTaskCompletion(
  input: CommitTwelveWeekTaskCompletionInput,
): TwelveWeekTaskCompletionResult {
  const data = getUserData();
  const found = findTask(data, input.goalId, input.taskId);
  if (found.status !== "found") return found;
  if (found.task.completed === input.completed) {
    return {
      status: "noop",
      reason: "already_matches",
      currentTask: found.task,
      currentSystem: found.system,
    };
  }

  const now = resolveNow(input.now);
  const updatedTask: TwelveWeekTaskInstance = {
    ...found.task,
    completed: input.completed,
    completedAt: input.completed ? now.iso : undefined,
    lastModifiedAt: now.milliseconds,
  };

  return persistTaskSnapshot(data, input.goalId, input.taskId, found.task, updatedTask, {
    queueNow: new Date(now.milliseconds),
  });
}

export function rollbackTwelveWeekTaskCompletion(
  input: RollbackTwelveWeekTaskCompletionInput,
): TwelveWeekTaskCompletionResult {
  const data = getUserData();
  const found = findTask(data, input.goalId, input.taskId);
  if (found.status !== "found") return found;
  if (!taskSnapshotsMatch(found.task, input.attemptedTask)) {
    return {
      status: "noop",
      reason: "state_changed",
      currentTask: found.task,
      currentSystem: found.system,
    };
  }

  const rollbackNow = resolveNow(input.now);
  return persistTaskSnapshot(
    data,
    input.goalId,
    input.taskId,
    found.task,
    { ...input.previousTask },
    {
      replaceLatestSnapshot: true,
      queueNow: new Date(rollbackNow.milliseconds),
    },
  );
}
