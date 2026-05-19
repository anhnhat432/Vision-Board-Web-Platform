import { describe, expect, it } from "vitest";

import type { Goal, TwelveWeekSystem, UserData } from "@/app/utils/storage-types";
import type {
  TwelveWeekPulledDailyCheckIn,
  TwelveWeekPulledGoal,
  TwelveWeekPulledLeadMetric,
  TwelveWeekPulledPlan,
  TwelveWeekPulledTask,
  TwelveWeekPulledWeek,
  TwelveWeekPulledWeeklyReview,
  TwelveWeekPulledWorkspace,
} from "@/services/syncService";
import type { TwelveWeekImportPayload } from "./twelveWeekImportPayload";
import { createTwelveWeekImportPayload } from "./twelveWeekImportPayload";
import { applyPulledWorkspaceToUserData } from "./pulledWorkspaceApply";
import { createPulledWorkspaceMergeReport } from "./pulledWorkspaceMergeReport";

// ── Constants ─────────────────────────────────────────────────────
const NOW = "2026-04-30T12:00:00.000Z";
const BACKEND_ID_PREFIX = "backend_";

// ── Rich local fixture ────────────────────────────────────────────
// Reuses the same detailed fixture shape from twelveWeekImportPayload.test.ts
// to exercise maximum field coverage.

function buildSystem(): TwelveWeekSystem {
  return {
    goalType: "Project",
    vision12Week: "Ship MVP 2 sync foundation",
    templateId: "template_focus",
    templateName: "Focus sprint",
    lagMetric: {
      name: "Launch readiness",
      unit: "%",
      target: "100",
      currentValue: "25",
    },
    leadIndicators: [
      {
        id: "tactic_launch_brief",
        name: "Write launch brief",
        target: "2",
        unit: "sessions/week",
        type: "core",
        priority: 1,
        schedule: [1, 3],
      },
      {
        id: "tactic_user_calls",
        name: "User calls",
        target: "1",
        unit: "call/week",
        type: "optional",
        priority: 2,
        schedule: [5],
      },
    ],
    milestones: {
      week4: "Prototype stable",
      week8: "Beta testers active",
      week12: "Public beta ready",
    },
    successEvidence: "A tester can restore the workspace safely.",
    reviewDay: "Sunday",
    week12Outcome: "Public beta ready",
    weeklyActions: ["Write", "Test", "Review"],
    successMetric: "Five testers complete one week.",
    startDate: "2026-04-06",
    endDate: "2026-04-19",
    timezone: "Asia/Ho_Chi_Minh",
    weekStartsOn: "Monday",
    status: "active",
    dailyReminderTime: "19:00",
    tacticLoadPreference: "balanced",
    preferredDays: [1, 3, 5],
    personalConstraint: "time",
    reentryCount: 1,
    currentWeek: 2,
    totalWeeks: 2,
    weeklyPlans: [
      {
        weekNumber: 1,
        phaseName: "Foundation",
        focus: "Build import payload",
        milestone: "Serializer tested",
        completed: true,
      },
      {
        weekNumber: 2,
        phaseName: "Validation",
        focus: "Use payload in import design",
        milestone: "Backend-ready contract",
        completed: false,
      },
    ],
    taskInstances: [
      {
        id: "task_launch_brief_1",
        weekNumber: 1,
        scheduledDate: "2026-04-07",
        title: "Write launch brief",
        leadIndicatorName: "Write launch brief",
        isCore: true,
        completed: true,
        completedAt: "2026-04-07T10:00:00.000Z",
        tacticId: "tactic_launch_brief",
      },
      {
        id: "task_user_call_1",
        weekNumber: 2,
        scheduledDate: "2026-04-15",
        title: "Run user call",
        leadIndicatorName: "User calls",
        isCore: false,
        completed: false,
        tacticId: "tactic_user_calls",
        rescheduledFrom: "2026-04-14",
      },
    ],
    dailyCheckIns: [
      {
        date: "2026-04-07",
        didWorkToday: true,
        whichLeadIndicatorWorkedOn: "Write launch brief",
        amountDone: "90 minutes",
        outputCreated: "Payload outline",
        obstacleOrIssue: "None",
        dailySelfRating: 4,
        optionalNote: "Preserve this local note.",
        mood: "high",
      },
    ],
    weeklyReviews: [
      {
        weekNumber: 1,
        leadCompletionPercent: 100,
        lagProgressValue: "50%",
        biggestOutputThisWeek: "Serializer draft",
        mainObstacle: "Backend spec is still moving",
        nextWeekPriority: "Wire import endpoint later",
        workloadDecision: "keep same",
        reviewCompleted: true,
        progressScore: 8,
        disciplineScore: 8,
        focusScore: 8,
        improvementScore: 7,
        outputQualityScore: 8,
        completedLeadIndicators: 2,
      },
    ],
    scoreboard: [
      {
        weekNumber: 1,
        leadCompletionPercent: 100,
        mainMetricProgress: "50%",
        outputDone: "Serializer draft",
        reviewDone: true,
        weeklyScore: 92,
      },
    ],
  };
}

function buildGoal(): Goal {
  return {
    id: "goal_mvp2_sync",
    category: "Product",
    title: "MVP 2 cloud sync",
    description: "Prepare reliable local-first sync.",
    deadline: "2026-04-30",
    tasks: [{ id: "onboarding_task_1", title: "Define sync contract", completed: true }],
    focusArea: "Product",
    readinessScore: 18,
    twelveWeekSystem: buildSystem(),
    createdAt: "2026-04-01T00:00:00.000Z",
  };
}

function emptyUserData(): UserData {
  return {
    storageVersion: 1,
    userId: "browser_b",
    wheelOfLifeHistory: [],
    currentWheelOfLife: [],
    goals: [],
    visionBoards: [],
    achievements: [],
    reflections: [],
    eventLog: [],
    syncOutbox: [],
    appPreferences: {
      allowLocalAnalytics: false,
      enableInAppReminders: false,
      enableBrowserNotifications: false,
      keepLocalOutbox: false,
      preferredReminderHour: 19,
    },
    subscription: null,
    entitlements: [],
    onboardingCompleted: false,
  };
}

// ── Backend echo simulator ────────────────────────────────────────
// Converts import payload → pulled workspace shape, simulating what
// the backend would store and then return on pull.
// This is the critical "wire format" bridge that makes round-trip
// testing possible without a real backend.

function simulateBackendEcho(importPayload: TwelveWeekImportPayload): TwelveWeekPulledWorkspace {
  const plan = importPayload.plan;

  const pulledGoal: TwelveWeekPulledGoal = {
    id: `${BACKEND_ID_PREFIX}goal_1`,
    clientGoalId: importPayload.clientGoalId,
    title: importPayload.title,
    category: importPayload.category,
    description: importPayload.description,
    deadline: importPayload.deadline,
    status: importPayload.status,
    focusArea: importPayload.focusArea,
    readinessScore: importPayload.readinessScore,
    tasks: importPayload.tasks,
    createdAt: NOW,
  };

  const pulledPlan: TwelveWeekPulledPlan = {
    id: `${BACKEND_ID_PREFIX}plan_1`,
    clientGoalId: plan.clientGoalId,
    clientPlanId: plan.clientPlanId,
    vision: plan.vision,
    startDate: plan.startDate,
    createdAt: NOW,
  };

  const pulledWeeks: TwelveWeekPulledWeek[] = plan.weeks.map((week, i) => ({
    id: `${BACKEND_ID_PREFIX}week_${i + 1}`,
    planId: `${BACKEND_ID_PREFIX}plan_1`,
    clientWeekId: week.clientWeekId,
    clientPlanId: week.clientPlanId,
    weekNumber: week.weekNumber,
    focus: week.focus,
    expectedOutput: week.expectedOutput,
    review: week.completed
      ? { weekNumber: week.weekNumber, executionScore: 0, reflection: "", adjustments: "" }
      : undefined,
  }));

  const pulledTasks: TwelveWeekPulledTask[] = plan.tasks.map((task, i) => ({
    id: `${BACKEND_ID_PREFIX}task_${i + 1}`,
    weekId: `${BACKEND_ID_PREFIX}week_${task.weekNumber}`,
    clientTaskId: task.clientTaskId,
    clientWeekId: task.clientWeekId,
    clientPlanId: task.clientPlanId,
    weekNumber: task.weekNumber,
    title: task.title,
    status: task.status,
    scheduledDate: task.scheduledDate,
    leadIndicatorName: task.leadIndicatorName,
    isCore: task.isCore,
    completedAt: task.completedAt,
    tacticId: task.tacticId,
    rescheduledFrom: task.rescheduledFrom,
  }));

  const pulledLeadMetrics: TwelveWeekPulledLeadMetric[] = plan.leadMetrics.map((metric, i) => ({
    id: `${BACKEND_ID_PREFIX}metric_${i + 1}`,
    weekId: `${BACKEND_ID_PREFIX}week_${metric.weekNumber}`,
    clientMetricId: metric.clientMetricId,
    clientWeekId: metric.clientWeekId,
    clientPlanId: metric.clientPlanId,
    leadIndicatorId: metric.leadIndicatorId,
    weekNumber: metric.weekNumber,
    name: metric.name,
    weeklyTarget: metric.weeklyTarget,
    unit: metric.unit,
    type: metric.type,
    priority: metric.priority,
    schedule: metric.schedule,
    logs: [],
  }));

  const pulledDailyCheckIns: TwelveWeekPulledDailyCheckIn[] = plan.dailyCheckIns.map((ci, i) => ({
    id: `${BACKEND_ID_PREFIX}checkin_${i + 1}`,
    planId: `${BACKEND_ID_PREFIX}plan_1`,
    weekId: `${BACKEND_ID_PREFIX}week_${ci.weekNumber}`,
    clientGoalId: ci.clientGoalId,
    clientPlanId: ci.clientPlanId,
    clientWeekId: ci.clientWeekId,
    clientCheckInId: ci.clientCheckInId,
    weekNumber: ci.weekNumber,
    localDate: ci.localDate,
    didWorkToday: ci.didWorkToday,
    whichLeadIndicatorWorkedOn: ci.whichLeadIndicatorWorkedOn,
    amountDone: ci.amountDone,
    outputCreated: ci.outputCreated,
    obstacleOrIssue: ci.obstacleOrIssue,
    dailySelfRating: ci.dailySelfRating,
    optionalNote: ci.optionalNote,
    mood: ci.mood,
  }));

  const pulledWeeklyReviews: TwelveWeekPulledWeeklyReview[] = plan.weeklyReviews.map((review, i) => ({
    id: `${BACKEND_ID_PREFIX}review_${i + 1}`,
    planId: `${BACKEND_ID_PREFIX}plan_1`,
    weekId: `${BACKEND_ID_PREFIX}week_${review.weekNumber}`,
    clientPlanId: review.clientPlanId,
    clientWeekId: review.clientWeekId,
    clientReviewId: review.clientReviewId,
    weekNumber: review.weekNumber,
    executionScore: review.executionScore,
    leadCompletionPercent: review.leadCompletionPercent,
    lagProgressValue: review.lagProgressValue,
    biggestOutputThisWeek: review.biggestOutputThisWeek,
    mainObstacle: review.mainObstacle,
    nextWeekPriority: review.nextWeekPriority,
    workloadDecision: review.workloadDecision,
    reviewCompleted: review.reviewCompleted,
    progressScore: review.progressScore,
    disciplineScore: review.disciplineScore,
    focusScore: review.focusScore,
    improvementScore: review.improvementScore,
    outputQualityScore: review.outputQualityScore,
    completedLeadIndicators: review.completedLeadIndicators,
  }));

  return {
    goals: [pulledGoal],
    plans: [pulledPlan],
    weeks: pulledWeeks,
    tasks: pulledTasks,
    leadMetrics: pulledLeadMetrics,
    dailyCheckIns: pulledDailyCheckIns,
    weeklyReviews: pulledWeeklyReviews,
  };
}

// ── Round-trip helper ─────────────────────────────────────────────
// Browser A → serialize → backend echo → Browser B apply

interface RoundTripResult {
  original: Goal;
  importPayload: TwelveWeekImportPayload;
  pulledWorkspace: TwelveWeekPulledWorkspace;
  reconstructed: Goal;
  reconstructedSystem: TwelveWeekSystem;
  originalSystem: TwelveWeekSystem;
}

function performRoundTrip(): RoundTripResult {
  const original = buildGoal();
  const importPayload = createTwelveWeekImportPayload(original);
  if (!importPayload) throw new Error("createTwelveWeekImportPayload returned null");

  const pulledWorkspace = simulateBackendEcho(importPayload);
  const browserBData = applyPulledWorkspaceToUserData(emptyUserData(), pulledWorkspace, { now: NOW });

  const reconstructed = browserBData.goals[0];
  if (!reconstructed) throw new Error("No goal reconstructed on Browser B");
  if (!reconstructed.twelveWeekSystem) throw new Error("No twelveWeekSystem reconstructed");

  return {
    original,
    importPayload,
    pulledWorkspace,
    reconstructed,
    reconstructedSystem: reconstructed.twelveWeekSystem,
    originalSystem: original.twelveWeekSystem!,
  };
}

// ── Known field gap tracker ───────────────────────────────────────
// Fields that are known to NOT round-trip by design in the current
// pull v1 implementation. These are documented as warnings.

interface FieldGap {
  field: string;
  category: "plan_metadata" | "task_metadata" | "daily_check_in" | "weekly_review" | "setup" | "derived";
  severity: "high" | "medium" | "low";
  reason: string;
}

const KNOWN_FIELD_GAPS: FieldGap[] = [
  // Plan-level metadata: pull v1 does not return these from the plan model
  {
    field: "templateId",
    category: "plan_metadata",
    severity: "low",
    reason: "Pull v1 does not return template identity.",
  },
  {
    field: "templateName",
    category: "plan_metadata",
    severity: "low",
    reason: "Pull v1 does not return template identity.",
  },
  {
    field: "lagMetric",
    category: "plan_metadata",
    severity: "medium",
    reason: "Pull v1 does not return plan-level lag metric metadata. Defaults to lead indicator name.",
  },
  {
    field: "leadIndicators",
    category: "plan_metadata",
    severity: "medium",
    reason:
      "Pull v1 returns week-level metrics, not the original lead indicator setup. Reconstructed from metrics or tasks.",
  },
  {
    field: "milestones",
    category: "plan_metadata",
    severity: "medium",
    reason: "Pull v1 returns weekly expectedOutput, not the original milestones object.",
  },
  {
    field: "successEvidence",
    category: "setup",
    severity: "low",
    reason: "Pull v1 does not return setup evidence text.",
  },
  {
    field: "reviewDay",
    category: "setup",
    severity: "low",
    reason: "Pull v1 does not return review day preference. Defaults to Sunday.",
  },
  {
    field: "week12Outcome",
    category: "setup",
    severity: "low",
    reason: "Pull v1 derives from last week milestone or goal title.",
  },
  {
    field: "weeklyActions",
    category: "setup",
    severity: "low",
    reason: "Pull v1 does not return legacy setup action list.",
  },
  {
    field: "successMetric",
    category: "setup",
    severity: "low",
    reason: "Pull v1 does not return setup success metric.",
  },
  {
    field: "endDate",
    category: "plan_metadata",
    severity: "medium",
    reason: "Pull v1 does not return endDate. Defaults to empty.",
  },
  {
    field: "timezone",
    category: "setup",
    severity: "low",
    reason: "Pull v1 does not return timezone. Defaults to Asia/Ho_Chi_Minh.",
  },
  {
    field: "weekStartsOn",
    category: "setup",
    severity: "low",
    reason: "Pull v1 does not return weekStartsOn. Defaults to Monday.",
  },
  {
    field: "dailyReminderTime",
    category: "setup",
    severity: "low",
    reason: "Pull v1 does not return local reminder preference.",
  },
  {
    field: "tacticLoadPreference",
    category: "setup",
    severity: "low",
    reason: "Pull v1 does not return tactic load preference.",
  },
  {
    field: "preferredDays",
    category: "setup",
    severity: "low",
    reason: "Pull v1 does not return preferred execution days.",
  },
  {
    field: "personalConstraint",
    category: "setup",
    severity: "low",
    reason: "Pull v1 does not return personal constraint.",
  },
  {
    field: "reentryCount",
    category: "setup",
    severity: "low",
    reason: "Pull v1 does not return reentry metadata. Defaults to 0.",
  },
  {
    field: "scoreboard",
    category: "derived",
    severity: "low",
    reason: "Scoreboard is derived from tasks/reviews, not stored directly.",
  },
  {
    field: "weeklyPlans[].phaseName",
    category: "plan_metadata",
    severity: "low",
    reason: "Pull v1 re-derives phase names from week number.",
  },
  {
    field: "goalType",
    category: "plan_metadata",
    severity: "low",
    reason: "Pull v1 infers from goal focusArea/category, not original setup.",
  },
];

// ── Tests ─────────────────────────────────────────────────────────

describe("round-trip sync: import → backend echo → pull → apply", () => {
  describe("core task state", () => {
    it("preserves original tasks (normalizeGoal may add generated tasks for remaining weeks)", () => {
      const { originalSystem, reconstructedSystem } = performRoundTrip();
      // normalizeGoal generates task instances from lead indicators for all 12 weeks.
      // The reconstructed system will have more tasks than the original 2.
      // What matters: original tasks are present with correct state.
      expect(reconstructedSystem.taskInstances.length).toBeGreaterThanOrEqual(originalSystem.taskInstances.length);
      for (const original of originalSystem.taskInstances) {
        const found = reconstructedSystem.taskInstances.find((t) => t.id === original.id);
        expect(found, `original task ${original.id} must be present`).toBeDefined();
      }
    });

    it("preserves original task client IDs (generated tasks get new IDs)", () => {
      const { originalSystem, reconstructedSystem } = performRoundTrip();
      const originalIds = originalSystem.taskInstances.map((t) => t.id);
      const reconstructedIds = new Set(reconstructedSystem.taskInstances.map((t) => t.id));
      for (const id of originalIds) {
        expect(reconstructedIds.has(id), `original task ID ${id} must survive round-trip`).toBe(true);
      }
    });

    it("preserves task completion status", () => {
      const { originalSystem, reconstructedSystem } = performRoundTrip();
      for (const originalTask of originalSystem.taskInstances) {
        const reconstructed = reconstructedSystem.taskInstances.find((t) => t.id === originalTask.id);
        expect(reconstructed, `task ${originalTask.id} missing`).toBeDefined();
        expect(reconstructed!.completed).toBe(originalTask.completed);
      }
    });

    it("preserves task completedAt timestamp", () => {
      const { originalSystem, reconstructedSystem } = performRoundTrip();
      const completed = originalSystem.taskInstances.filter((t) => t.completed);
      expect(completed.length).toBeGreaterThan(0);
      for (const task of completed) {
        const reconstructed = reconstructedSystem.taskInstances.find((t) => t.id === task.id);
        expect(reconstructed!.completedAt).toBe(task.completedAt);
      }
    });

    it("preserves task title, scheduledDate, weekNumber", () => {
      const { originalSystem, reconstructedSystem } = performRoundTrip();
      for (const originalTask of originalSystem.taskInstances) {
        const reconstructed = reconstructedSystem.taskInstances.find((t) => t.id === originalTask.id)!;
        expect(reconstructed.title).toBe(originalTask.title);
        expect(reconstructed.scheduledDate).toBe(originalTask.scheduledDate);
        expect(reconstructed.weekNumber).toBe(originalTask.weekNumber);
      }
    });

    it("preserves task leadIndicatorName and isCore", () => {
      const { originalSystem, reconstructedSystem } = performRoundTrip();
      for (const originalTask of originalSystem.taskInstances) {
        const reconstructed = reconstructedSystem.taskInstances.find((t) => t.id === originalTask.id)!;
        expect(reconstructed.leadIndicatorName).toBe(originalTask.leadIndicatorName);
        expect(reconstructed.isCore).toBe(originalTask.isCore);
      }
    });

    it("preserves task tacticId and rescheduledFrom", () => {
      const { originalSystem, reconstructedSystem } = performRoundTrip();
      const rescheduled = originalSystem.taskInstances.find((t) => t.rescheduledFrom);
      expect(rescheduled, "fixture should include a rescheduled task").toBeDefined();
      const reconstructed = reconstructedSystem.taskInstances.find((t) => t.id === rescheduled!.id)!;
      expect(reconstructed.tacticId).toBe(rescheduled!.tacticId);
      expect(reconstructed.rescheduledFrom).toBe(rescheduled!.rescheduledFrom);
    });
  });

  describe("daily check-in", () => {
    it("preserves daily check-in count", () => {
      const { originalSystem, reconstructedSystem } = performRoundTrip();
      expect(reconstructedSystem.dailyCheckIns).toHaveLength(originalSystem.dailyCheckIns.length);
    });

    it("preserves daily check-in date and didWorkToday", () => {
      const { originalSystem, reconstructedSystem } = performRoundTrip();
      for (const original of originalSystem.dailyCheckIns) {
        const reconstructed = reconstructedSystem.dailyCheckIns.find((ci) => ci.date === original.date);
        expect(reconstructed, `check-in ${original.date} missing`).toBeDefined();
        expect(reconstructed!.didWorkToday).toBe(original.didWorkToday);
      }
    });

    it("preserves daily check-in detail fields", () => {
      const { originalSystem, reconstructedSystem } = performRoundTrip();
      const original = originalSystem.dailyCheckIns[0];
      const reconstructed = reconstructedSystem.dailyCheckIns.find((ci) => ci.date === original.date)!;
      expect(reconstructed.whichLeadIndicatorWorkedOn).toBe(original.whichLeadIndicatorWorkedOn);
      expect(reconstructed.amountDone).toBe(original.amountDone);
      expect(reconstructed.outputCreated).toBe(original.outputCreated);
      expect(reconstructed.obstacleOrIssue).toBe(original.obstacleOrIssue);
      expect(reconstructed.dailySelfRating).toBe(original.dailySelfRating);
      expect(reconstructed.optionalNote).toBe(original.optionalNote);
    });

    it("preserves daily check-in mood", () => {
      const { originalSystem, reconstructedSystem } = performRoundTrip();
      const original = originalSystem.dailyCheckIns[0];
      const reconstructed = reconstructedSystem.dailyCheckIns.find((ci) => ci.date === original.date)!;
      expect(reconstructed.mood).toBe(original.mood);
    });
  });

  describe("weekly review", () => {
    it("preserves weekly review count", () => {
      const { originalSystem, reconstructedSystem } = performRoundTrip();
      expect(reconstructedSystem.weeklyReviews).toHaveLength(originalSystem.weeklyReviews.length);
    });

    it("preserves weekly review core output fields", () => {
      const { originalSystem, reconstructedSystem } = performRoundTrip();
      const original = originalSystem.weeklyReviews[0];
      const reconstructed = reconstructedSystem.weeklyReviews.find((r) => r.weekNumber === original.weekNumber)!;
      expect(reconstructed.biggestOutputThisWeek).toBe(original.biggestOutputThisWeek);
      expect(reconstructed.mainObstacle).toBe(original.mainObstacle);
      expect(reconstructed.nextWeekPriority).toBe(original.nextWeekPriority);
      expect(reconstructed.workloadDecision).toBe(original.workloadDecision);
      expect(reconstructed.reviewCompleted).toBe(original.reviewCompleted);
    });

    it("preserves weekly review score dimensions", () => {
      const { originalSystem, reconstructedSystem } = performRoundTrip();
      const original = originalSystem.weeklyReviews[0];
      const reconstructed = reconstructedSystem.weeklyReviews.find((r) => r.weekNumber === original.weekNumber)!;
      expect(reconstructed.progressScore).toBe(original.progressScore);
      expect(reconstructed.disciplineScore).toBe(original.disciplineScore);
      expect(reconstructed.focusScore).toBe(original.focusScore);
      expect(reconstructed.improvementScore).toBe(original.improvementScore);
      expect(reconstructed.outputQualityScore).toBe(original.outputQualityScore);
    });

    it("preserves weekly review completion metrics", () => {
      const { originalSystem, reconstructedSystem } = performRoundTrip();
      const original = originalSystem.weeklyReviews[0];
      const reconstructed = reconstructedSystem.weeklyReviews.find((r) => r.weekNumber === original.weekNumber)!;
      expect(reconstructed.leadCompletionPercent).toBe(original.leadCompletionPercent);
      expect(reconstructed.lagProgressValue).toBe(original.lagProgressValue);
      expect(reconstructed.completedLeadIndicators).toBe(original.completedLeadIndicators);
    });
  });

  describe("goal identity and plan metadata", () => {
    it("preserves goal client ID", () => {
      const { original, reconstructed } = performRoundTrip();
      expect(reconstructed.id).toBe(original.id);
    });

    it("preserves goal title, category, description, deadline", () => {
      const { original, reconstructed } = performRoundTrip();
      expect(reconstructed.title).toBe(original.title);
      expect(reconstructed.category).toBe(original.category);
      expect(reconstructed.description).toBe(original.description);
      expect(reconstructed.deadline).toBe(original.deadline);
    });

    it("preserves plan vision and startDate", () => {
      const { originalSystem, reconstructedSystem } = performRoundTrip();
      expect(reconstructedSystem.vision12Week).toBe(originalSystem.vision12Week);
      expect(reconstructedSystem.startDate).toBe(originalSystem.startDate);
    });

    it("preserves week focus (getTotalWeeks clamps to min 12)", () => {
      const { originalSystem, reconstructedSystem } = performRoundTrip();
      // getTotalWeeks in pulledWorkspaceApply.ts clamps to Math.min(Math.max(maxWeek, 12), 12) = 12.
      // So even a 2-week original system reconstructs to 12 weeks.
      expect(reconstructedSystem.weeklyPlans.length).toBe(12);
      expect(reconstructedSystem.totalWeeks).toBe(12);
      // Original weeks should have their focus preserved
      for (const originalWeek of originalSystem.weeklyPlans) {
        const reconstructed = reconstructedSystem.weeklyPlans.find((w) => w.weekNumber === originalWeek.weekNumber);
        expect(reconstructed, `week ${originalWeek.weekNumber} missing`).toBeDefined();
        expect(reconstructed!.focus).toBe(originalWeek.focus);
      }
    });

    it("preserves week milestone via expectedOutput", () => {
      const { originalSystem, reconstructedSystem } = performRoundTrip();
      for (const originalWeek of originalSystem.weeklyPlans) {
        const reconstructed = reconstructedSystem.weeklyPlans.find((w) => w.weekNumber === originalWeek.weekNumber)!;
        expect(reconstructed.milestone).toBe(originalWeek.milestone);
      }
    });
  });

  describe("lead indicator round-trip via lead metrics", () => {
    it("reconstructs lead indicators from echoed lead metrics", () => {
      const { originalSystem, reconstructedSystem } = performRoundTrip();
      // The pull apply builds lead indicators from lead metrics.
      // We should get at least the same number of unique indicators.
      const originalNames = new Set(originalSystem.leadIndicators.map((li) => li.name));
      const reconstructedNames = new Set(reconstructedSystem.leadIndicators.map((li) => li.name));
      for (const name of originalNames) {
        expect(reconstructedNames.has(name), `lead indicator "${name}" not reconstructed`).toBe(true);
      }
    });

    it("preserves lead metric unit and type when echoed", () => {
      const { originalSystem, reconstructedSystem } = performRoundTrip();
      for (const original of originalSystem.leadIndicators) {
        const reconstructed = reconstructedSystem.leadIndicators.find((li) => li.name === original.name);
        expect(reconstructed, `indicator "${original.name}" missing`).toBeDefined();
        expect(reconstructed!.unit).toBe(original.unit);
        expect(reconstructed!.type).toBe(original.type);
      }
    });

    it("preserves lead metric priority and schedule when echoed", () => {
      const { originalSystem, reconstructedSystem } = performRoundTrip();
      for (const original of originalSystem.leadIndicators) {
        const reconstructed = reconstructedSystem.leadIndicators.find((li) => li.name === original.name)!;
        expect(reconstructed.priority).toBe(original.priority);
        expect(reconstructed.schedule).toEqual(original.schedule);
      }
    });
  });

  describe("known field gaps generate warnings, not silent pass", () => {
    it("merge report detects unsupported fields on full pull", () => {
      const { original, pulledWorkspace } = performRoundTrip();
      const report = createPulledWorkspaceMergeReport(original, pulledWorkspace);
      // unsupportedFields should include plan metadata that can't round-trip
      expect(report.unsupportedFields.length).toBeGreaterThan(0);
      const unsupportedFieldNames = report.unsupportedFields.map((f) => f.field);
      // These are the highest-risk gaps from the hydration audit
      expect(unsupportedFieldNames).toContain("templateId");
      expect(unsupportedFieldNames).toContain("lagMetric");
      expect(unsupportedFieldNames).toContain("leadIndicators");
      expect(unsupportedFieldNames).toContain("milestones");
      expect(unsupportedFieldNames).toContain("successEvidence");
    });

    it("known gap list covers all unsupported fields from the merge report", () => {
      const { original, pulledWorkspace } = performRoundTrip();
      const report = createPulledWorkspaceMergeReport(original, pulledWorkspace);
      const knownFieldNames = new Set(KNOWN_FIELD_GAPS.map((g) => g.field));
      for (const field of report.unsupportedFields) {
        expect(
          knownFieldNames.has(field.field),
          `Unsupported field "${field.field}" is not documented in KNOWN_FIELD_GAPS. Add it to prevent silent data loss.`,
        ).toBe(true);
      }
    });

    it("documents the full known gap list with severity", () => {
      // This test exists purely to make the gap inventory visible in test output.
      // It will fail if someone removes a gap entry without resolving it.
      expect(KNOWN_FIELD_GAPS.length).toBeGreaterThanOrEqual(20);
      const highSeverity = KNOWN_FIELD_GAPS.filter((g) => g.severity === "high");
      const mediumSeverity = KNOWN_FIELD_GAPS.filter((g) => g.severity === "medium");
      // Current state: no high-severity gaps (task metadata is now round-tripped).
      // If a high-severity gap appears, it means a regression.
      expect(highSeverity).toHaveLength(0);
      expect(mediumSeverity.length).toBeGreaterThan(0);
    });
  });

  describe("user isolation", () => {
    it("pulled workspace does not bleed into unrelated local goals", () => {
      const existingGoal: Goal = {
        id: "goal_other_user",
        category: "Health",
        title: "Other user goal",
        description: "Should not be touched.",
        deadline: "2026-12-31",
        tasks: [],
        createdAt: "2026-01-01T00:00:00.000Z",
        twelveWeekSystem: {
          ...buildSystem(),
          vision12Week: "Stay healthy",
          taskInstances: [
            {
              id: "other_task_1",
              weekNumber: 1,
              scheduledDate: "2026-04-07",
              title: "Run",
              leadIndicatorName: "Run",
              isCore: true,
              completed: false,
            },
          ],
          dailyCheckIns: [],
          weeklyReviews: [],
        },
      };

      const userData = { ...emptyUserData(), goals: [existingGoal] };
      const { importPayload } = performRoundTrip();
      const pulledWorkspace = simulateBackendEcho(importPayload);

      const result = applyPulledWorkspaceToUserData(userData, pulledWorkspace, { now: NOW });

      // Existing goal should remain intact
      const otherGoal = result.goals.find((g) => g.id === "goal_other_user");
      expect(otherGoal).toBeDefined();
      expect(otherGoal!.twelveWeekSystem?.taskInstances[0].id).toBe("other_task_1");
      expect(otherGoal!.twelveWeekSystem?.taskInstances[0].completed).toBe(false);
      expect(otherGoal!.twelveWeekSystem?.vision12Week).toBe("Stay healthy");

      // Round-tripped goal should also exist
      const syncedGoal = result.goals.find((g) => g.id === "goal_mvp2_sync");
      expect(syncedGoal).toBeDefined();
    });
  });

  describe("non-sync fields are not leaked", () => {
    it("billing, analytics, and browser-local state are not in the round-trip", () => {
      const userData: UserData = {
        ...emptyUserData(),
        subscription: {
          planCode: "PLUS" as const,
          status: "active",
          billingCycle: "season-pass" as const,
          startedAt: NOW,
          providerMode: "mock_provider" as const,
          isLocalTestMode: true,
        },
        entitlements: [{ key: "premium_templates", sourcePlan: "PLUS", grantedAt: NOW }],
        eventLog: [{ id: "e1", type: "do_not_sync", createdAt: NOW }],
      };

      const { importPayload } = performRoundTrip();
      const pulledWorkspace = simulateBackendEcho(importPayload);
      const result = applyPulledWorkspaceToUserData(userData, pulledWorkspace, { now: NOW });

      // These should be preserved from local, never overwritten by pull
      expect(result.subscription).toBe(userData.subscription);
      expect(result.entitlements).toBe(userData.entitlements);
      expect(result.eventLog).toBe(userData.eventLog);
    });
  });
});
