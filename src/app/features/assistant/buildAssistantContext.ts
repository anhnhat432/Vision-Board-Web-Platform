/**
 * Build assistant context from localStorage.
 *
 * Reads user data through public storage APIs and surfaces a minimal
 * snapshot for the AI assistant to work with. Falls back to defaults
 * when storage is empty or malformed; never throws.
 */

import { isDemoMode } from "@/app/utils/app-mode";
import { getUserData } from "@/app/utils/storage";
import { APP_STORAGE_KEYS } from "@/app/utils/storage-constants";
import { formatDateInputValue, getCalendarDateKey, parseCalendarDate } from "@/app/utils/storage-date-utils";
import {
  getActiveTwelveWeekGoal,
  getTwelveWeekCurrentWeek,
  getTwelveWeekTodayTasks,
  getTwelveWeekWeekRange,
} from "@/app/utils/storage-twelve-week";
import type {
  Goal,
  TwelveWeekSystem,
  TwelveWeekTaskInstance,
  UniversalDailyCheckIn,
  UniversalWeeklyReview,
} from "@/app/utils/storage-types";
import { readMutationQueueStore, summarizeMutationQueueStore } from "@/features/plan12week/persistence/mutationQueue";
import { getFirebaseAuth } from "@/lib/auth/firebase";
import { evaluateSmartGoalQuality } from "@/lib/smart-goal/quality";
import type { SmartGoal } from "@/lib/smart-goal/types";
import {
  getPendingAssistantClarification,
  type PendingAssistantClarificationSummary,
} from "./assistantConversationState";
import {
  type AssistantMemorySummary,
  autoCaptureFromAppData,
  getAssistantMemory,
  summarizeAssistantMemoryForContext,
} from "./assistantMemory";
import { type AssistantRetrievedMemory, retrieveAssistantKnowledge } from "./assistantRetrieval";
import { getPendingWorkflow } from "./assistantWorkflow";

export interface AuthSyncMode {
  authState: "signed_in" | "anonymous";
  syncState: "synced" | "syncing" | "error" | "offline" | "disabled";
}

export interface AssistantContext {
  currentWeek: number | null;
  weeksTotal: number;
  goals: Array<{
    id: string;
    title: string;
    progress: number;
  }>;
  todayTasks: Array<{
    id: string;
    title: string;
    done: boolean;
  }>;
  lastReflectionDate: string | null;
  feasibility: {
    readinessScore: number | null;
    bottleneckLabel: string | null;
    bottleneckAction: string | null;
  } | null;
  latestWeeklyReview: {
    weekNumber: number;
    leadCompletionPercent: number | null;
    mainObstacle: string | null;
    nextWeekPriority: string | null;
    workloadDecision: string | null;
    reviewedAt: string | null;
  } | null;
  stuckSignals: {
    latestObstacle: string | null;
    missedCommitments: string[];
    overdueOpenCount: number;
    overdueTasks: Array<{
      id: string;
      title: string;
      scheduledDate: string;
      isCore: boolean;
    }>;
  };
  trend: {
    completionLast4Weeks: number[];
    direction: "up" | "down" | "flat" | "unknown";
  };
  streak: {
    daysWithCompletedTask: number;
  };
  upcomingDeadlines: Array<{
    goalId: string;
    title: string;
    daysUntil: number;
  }>;
  pageContext: AssistantPageContext;
  pageContextHint?: AssistantPageContextHint;
  authSyncMode?: AuthSyncMode;
  assistantMemory?: AssistantMemorySummary;
  retrievedKnowledge?: AssistantRetrievedMemory[];
  pendingClarification?: PendingAssistantClarificationSummary;
  activeTopic?: string | null;
  smartGoalQuality?: {
    overallScore: number;
    level: "weak" | "okay" | "strong";
    warnings: string[];
    suggestions: string[];
    canProceedToFeasibility: boolean;
  } | null;
  pendingWorkflow?: PendingAssistantWorkflowSummary | null;
}

export interface PendingAssistantWorkflowSummary {
  id: string;
  type: string;
  status: string;
  summary: string;
  missingFields: string[];
  proposedActions: Array<{ type: string; label: string }>;
}

export interface AssistantPageContext {
  route: string;
  currentStep: string | null;
  nextSuggestedStep: string | null;
  formDraft: {
    focusArea?: string | null;
    smartGoalTitle?: string | null;
    smartGoalMetric?: string | null;
    missingSmartGoalFields?: string[];
    feasibilityAnsweredCount?: number;
    feasibilityBottleneck?: string | null;
    goalCount?: number;
    goalsWithoutTwelveWeekPlan?: number;
    activeGoalTitle?: string | null;
    twelveWeekDraftSummary?: {
      leadIndicatorCount: number;
      hasReviewDay: boolean;
      hasWeek12Outcome: boolean;
      hasLagMetric: boolean;
      tacticLoadPreference: string | null;
      personalConstraint: string | null;
    };
  };
}

export interface AssistantPageContextHint {
  pageType: string;
  currentStep?: string;
  hint?: string;
}

function getPreferredTwelveWeekGoalId(): string | null {
  if (typeof localStorage === "undefined") return null;

  try {
    return (
      localStorage.getItem(APP_STORAGE_KEYS.latest12WeekSystemGoalId) ||
      localStorage.getItem(APP_STORAGE_KEYS.latest12WeekGoalId)
    );
  } catch {
    return null;
  }
}

export function buildAuthSyncMode(): AuthSyncMode {
  const isDemo = isDemoMode();
  if (isDemo) {
    return {
      authState: "anonymous",
      syncState: "disabled",
    };
  }

  const auth = getFirebaseAuth();
  const currentUser = auth?.currentUser ?? null;
  const authState = currentUser ? "signed_in" : "anonymous";

  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
  if (!isOnline) {
    return {
      authState,
      syncState: "offline",
    };
  }

  if (!currentUser) {
    return {
      authState,
      syncState: "disabled",
    };
  }

  try {
    const queue = readMutationQueueStore(currentUser.uid);
    const summary = summarizeMutationQueueStore(queue);

    const hasError = queue.items.some(
      (item) =>
        item.status === "failed_validation" ||
        item.status === "failed_terminal" ||
        item.status === "blocked_conflict" ||
        item.status === "blocked_auth" ||
        item.status === "blocked_config",
    );

    let syncState: AuthSyncMode["syncState"] = "synced";
    if (hasError) {
      syncState = "error";
    } else if (summary.pendingCount > 0 || summary.inFlightCount > 0) {
      syncState = "syncing";
    }

    return {
      authState,
      syncState,
    };
  } catch {
    return {
      authState,
      syncState: "error",
    };
  }
}

function mapDraftToSmartGoal(draft: any): SmartGoal {
  const raw = draft || {};
  const specific = raw.specific || {};
  const measurable = raw.measurable || {};
  const achievable = raw.achievable || {};
  const relevant = raw.relevant || {};
  const time_bound = raw.time_bound || raw.timeBound || {};

  const goal_statement = typeof specific === "string" ? specific : specific.goal_statement || raw.goal_statement || "";
  const metric_name = typeof measurable === "string" ? measurable : measurable.metric_name || raw.metric_name || "";
  const target_value =
    typeof measurable === "string" ? 0 : Number(measurable.target_value) || Number(raw.target_value) || 0;
  const metric_unit = typeof measurable === "string" ? "" : measurable.metric_unit || raw.metric_unit || "";
  const baseline_value =
    typeof measurable === "string"
      ? undefined
      : measurable.baseline_value !== undefined
        ? Number(measurable.baseline_value)
        : undefined;

  const weekly_time_commitment_hours =
    typeof achievable === "string"
      ? Number(achievable) || 0
      : Number(achievable.weekly_time_commitment_hours) || Number(raw.weekly_time_commitment_hours) || 0;
  const required_skills =
    typeof achievable === "string" ? [] : Array.isArray(achievable.required_skills) ? achievable.required_skills : [];
  const support_resources =
    typeof achievable === "string"
      ? []
      : Array.isArray(achievable.support_resources)
        ? achievable.support_resources
        : [];

  const motivation_reason =
    typeof relevant === "string" ? relevant : relevant.motivation_reason || raw.motivation_reason || "";
  const life_dimension_alignment =
    typeof relevant === "string" ? "" : relevant.life_dimension_alignment || raw.life_dimension_alignment || "";

  const target_date = typeof time_bound === "string" ? time_bound : time_bound.target_date || raw.target_date || "";
  const target_weeks =
    typeof time_bound === "string"
      ? Number(time_bound) || undefined
      : time_bound.target_weeks !== undefined
        ? Number(time_bound.target_weeks)
        : undefined;

  return {
    id: raw.id || "",
    domain: raw.domain || "career",
    specific: { goal_statement },
    measurable: { metric_name, metric_unit, baseline_value, target_value },
    achievable: { weekly_time_commitment_hours, required_skills, support_resources },
    relevant: { motivation_reason, life_dimension_alignment },
    time_bound: { target_date, target_weeks },
    created_at: raw.created_at || "",
  };
}

function buildWorkflowSummary(userId: string | null): PendingAssistantWorkflowSummary | null {
  const workflow = getPendingWorkflow(userId);
  if (!workflow) return null;

  return {
    id: workflow.id,
    type: workflow.type,
    status: workflow.status,
    summary: workflow.summary,
    missingFields: workflow.missingFields,
    proposedActions: workflow.proposedActions.map((action) => ({
      type: action.type,
      label: action.label,
    })),
  };
}

/**
 * Build context from localStorage.
 *
 * Defaults:
 *   - currentWeek: null (no active 12-week goal)
 *   - weeksTotal: 12
 *   - goals: []
 *   - todayTasks: []
 *   - lastReflectionDate: null
 */
export function buildAssistantContext(
  referenceDate = new Date(),
  route = getCurrentRoute(),
  pageContextHint?: AssistantPageContextHint,
  query?: string,
  userId: string | null = null,
  activeTopic?: string | null,
): AssistantContext {
  // Tự động quét và capture dữ liệu mới vào memory
  autoCaptureFromAppData(userId);

  const authSyncMode = buildAuthSyncMode();
  const pendingClarification = getPendingAssistantClarification(userId, referenceDate) ?? undefined;
  try {
    const data = getUserData();
    const pendingSmartGoalDraft = readJsonStorage(APP_STORAGE_KEYS.pendingSmartGoal);
    const smartGoalQuality = pendingSmartGoalDraft
      ? evaluateSmartGoalQuality(mapDraftToSmartGoal(pendingSmartGoalDraft))
      : null;

    if (!data?.goals || data.goals.length === 0) {
      return emptyContext(route, pageContextHint, authSyncMode, undefined, userId, referenceDate);
    }

    const activeGoal = getActiveTwelveWeekGoal(data.goals, getPreferredTwelveWeekGoalId());
    const goals = data.goals.map((goal: Goal) => ({
      id: goal.id,
      title: goal.title,
      progress: calculateGoalProgress(goal),
    }));
    const lastReflectionDate = data.reflections && data.reflections.length > 0 ? data.reflections[0].date : null;
    const memory = getAssistantMemory(userId);
    const assistantMemorySummary = summarizeAssistantMemoryForContext(memory);
    const retrievedKnowledge = query
      ? retrieveAssistantKnowledge(query, { referenceDate, userId, activeGoalId: activeGoal?.id })
      : undefined;

    if (!activeGoal?.twelveWeekSystem) {
      return {
        ...emptyContext(route, pageContextHint, authSyncMode, query, userId, referenceDate, activeTopic),
        goals,
        lastReflectionDate,
        feasibility: buildFeasibilityContext(data.goals[0]),
        pageContext: buildPageContext(route, data.goals),
        pageContextHint,
        authSyncMode,
        assistantMemory: assistantMemorySummary,
        retrievedKnowledge,
        pendingClarification,
        activeTopic,
        smartGoalQuality,
        pendingWorkflow: buildWorkflowSummary(userId),
      };
    }

    const system = activeGoal.twelveWeekSystem;
    const currentWeek = getTwelveWeekCurrentWeek(system, referenceDate);
    const todayTasks = getTwelveWeekTodayTasks(system, referenceDate);
    const latestWeeklyReview = getLatestWeeklyReview(system.weeklyReviews);

    return {
      currentWeek,
      weeksTotal: system.totalWeeks || 12,
      goals,
      todayTasks: todayTasks.map((task: TwelveWeekTaskInstance) => ({
        id: task.id,
        title: task.title,
        done: task.completed,
      })),
      lastReflectionDate,
      feasibility: buildFeasibilityContext(activeGoal),
      latestWeeklyReview,
      stuckSignals: buildStuckSignals(system, latestWeeklyReview, referenceDate),
      trend: buildTrendContext(system, currentWeek),
      streak: buildStreakContext(system, referenceDate),
      upcomingDeadlines: buildUpcomingDeadlines(data.goals, referenceDate),
      pageContext: buildPageContext(route, data.goals),
      pageContextHint,
      authSyncMode,
      assistantMemory: assistantMemorySummary,
      retrievedKnowledge,
      pendingClarification,
      activeTopic,
      smartGoalQuality,
      pendingWorkflow: buildWorkflowSummary(userId),
    };
  } catch {
    // Storage read error -> safe defaults.
    return emptyContext(route, pageContextHint, authSyncMode, undefined, userId, referenceDate, activeTopic);
  }
}

function emptyContext(
  route = getCurrentRoute(),
  pageContextHint?: AssistantPageContextHint,
  authSyncMode = buildAuthSyncMode(),
  query?: string,
  userId: string | null = null,
  referenceDate = new Date(),
  activeTopic?: string | null,
): AssistantContext {
  const memory = getAssistantMemory(userId);
  const assistantMemorySummary = summarizeAssistantMemoryForContext(memory);
  const retrievedKnowledge = query ? retrieveAssistantKnowledge(query, { referenceDate, userId }) : undefined;
  const pendingClarification = getPendingAssistantClarification(userId, referenceDate) ?? undefined;

  const pendingSmartGoalDraft = readJsonStorage(APP_STORAGE_KEYS.pendingSmartGoal);
  const smartGoalQuality = pendingSmartGoalDraft
    ? evaluateSmartGoalQuality(mapDraftToSmartGoal(pendingSmartGoalDraft))
    : null;

  return {
    currentWeek: null,
    weeksTotal: 12,
    goals: [],
    todayTasks: [],
    lastReflectionDate: null,
    feasibility: null,
    latestWeeklyReview: null,
    stuckSignals: {
      latestObstacle: null,
      missedCommitments: [],
      overdueOpenCount: 0,
      overdueTasks: [],
    },
    trend: {
      completionLast4Weeks: [],
      direction: "unknown",
    },
    streak: {
      daysWithCompletedTask: 0,
    },
    upcomingDeadlines: [],
    pageContext: buildPageContext(route, []),
    pageContextHint,
    authSyncMode,
    assistantMemory: assistantMemorySummary,
    retrievedKnowledge,
    pendingClarification,
    activeTopic,
    smartGoalQuality,
    pendingWorkflow: buildWorkflowSummary(userId),
  };
}

/**
 * Calculate goal progress as percentage (0-100).
 *
 * Uses task completion ratio if tasks exist, otherwise 0.
 */
function calculateGoalProgress(goal: Goal): number {
  if (!goal.tasks || goal.tasks.length === 0) return 0;

  const completed = goal.tasks.filter((task) => task.completed).length;
  return Math.round((completed / goal.tasks.length) * 100);
}

function readPendingFeasibility(): {
  readinessScore?: unknown;
  bottleneck?: { label?: unknown; action?: unknown };
} | null {
  const raw = localStorage.getItem(APP_STORAGE_KEYS.pendingFeasibilityResult);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function readJsonStorage<T = Record<string, unknown>>(key: string): T | null {
  if (typeof localStorage === "undefined") return null;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as T) : null;
  } catch {
    return null;
  }
}

function readStorageText(key: string): string | null {
  if (typeof localStorage === "undefined") return null;

  try {
    return boundedText(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function getCurrentRoute(): string {
  return typeof window !== "undefined" ? window.location.pathname : "/";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function boundedText(value: unknown, maxLength = 200): string | null {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, maxLength) : null;
}

function boundedNumber(value: unknown, min: number, max: number): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(min, Math.min(max, numeric));
}

function buildFeasibilityContext(goal: Goal | undefined): AssistantContext["feasibility"] {
  const pending = readPendingFeasibility();
  const readinessScore = boundedNumber(pending?.readinessScore ?? goal?.readinessScore, 0, 20);
  const bottleneckLabel = boundedText(pending?.bottleneck?.label ?? goal?.feasibilityResult);
  const bottleneckAction = boundedText(pending?.bottleneck?.action);

  if (readinessScore === null && !bottleneckLabel && !bottleneckAction) return null;

  return {
    readinessScore,
    bottleneckLabel,
    bottleneckAction,
  };
}

function buildPageContext(route: string, goals: Goal[]): AssistantPageContext {
  const formDraft: AssistantPageContext["formDraft"] = {};
  const normalizedRoute = boundedText(route, 80) ?? "/";
  const currentStep = getCurrentStep(normalizedRoute);

  const twelveWeekRoutes = [
    "/",
    "/dashboard",
    "/goals",
    "/twelve-week",
    "/12-week-dashboard",
    "/12-week-system",
    "/12-week-setup",
    "/12-week-plan-overview",
    "/12-week-plan-setup",
  ];

  if (twelveWeekRoutes.includes(normalizedRoute)) {
    Object.assign(formDraft, buildGoalSummary(goals));
  }

  if (normalizedRoute === "/" || normalizedRoute === "/dashboard") {
    formDraft.focusArea = readStorageText(APP_STORAGE_KEYS.selectedFocusArea);
    Object.assign(formDraft, readSmartGoalDraftSummary(), readFeasibilityDraftSummary(), readTwelveWeekDraftSummary());
  }

  if (normalizedRoute === "/smart-goal-setup") {
    formDraft.focusArea = readStorageText(APP_STORAGE_KEYS.selectedFocusArea);
    Object.assign(formDraft, readSmartGoalDraftSummary());
  }

  if (normalizedRoute === "/feasibility") {
    formDraft.focusArea = readStorageText(APP_STORAGE_KEYS.selectedFocusArea);
    Object.assign(formDraft, readSmartGoalDraftSummary(), readFeasibilityDraftSummary());
  }

  if (normalizedRoute === "/12-week-setup") {
    formDraft.focusArea = readStorageText(APP_STORAGE_KEYS.selectedFocusArea);
    Object.assign(formDraft, readSmartGoalDraftSummary(), readFeasibilityDraftSummary(), readTwelveWeekDraftSummary());
  }

  return {
    route: normalizedRoute,
    currentStep,
    nextSuggestedStep: buildNextSuggestedStep(normalizedRoute, formDraft),
    formDraft,
  };
}

function getCurrentStep(route: string): string | null {
  if (route === "/" || route === "/dashboard") return "dashboard";
  if (route === "/goals") return "goals";
  if (route === "/smart-goal-setup") return "smart_goal_setup";
  if (route === "/feasibility") return "feasibility";
  if (route === "/12-week-setup") return "twelve_week_setup";
  return null;
}

function buildGoalSummary(goals: Goal[]): AssistantPageContext["formDraft"] {
  const activeGoal = getActiveTwelveWeekGoal(goals, getPreferredTwelveWeekGoalId()) ?? goals[0];

  return {
    goalCount: goals.length,
    goalsWithoutTwelveWeekPlan: goals.filter((goal) => !goal.twelveWeekSystem).length,
    activeGoalTitle: boundedText(activeGoal?.title),
  };
}

function readSmartGoalDraftSummary(): AssistantPageContext["formDraft"] {
  const draft = readJsonStorage(APP_STORAGE_KEYS.pendingSmartGoal);
  if (!draft) return {};

  return {
    smartGoalTitle: getSmartGoalTitle(draft),
    smartGoalMetric: getSmartGoalMetric(draft),
    missingSmartGoalFields: getMissingSmartGoalFields(draft),
  };
}

function getSmartGoalTitle(draft: unknown): string | null {
  const raw = asRecord(draft);
  const specific = asRecord(raw.specific);

  return boundedText(raw.title ?? raw.goal_statement ?? specific.goal_statement ?? raw.specific);
}

function getSmartGoalMetric(draft: unknown): string | null {
  const raw = asRecord(draft);
  const measurable = asRecord(raw.measurable);
  const metricName = boundedText(raw.metric_name ?? measurable.metric_name);
  const targetValue = raw.target_value ?? measurable.target_value;

  if (metricName && targetValue !== undefined && targetValue !== null && String(targetValue).trim()) {
    return boundedText(`${metricName}: ${String(targetValue).trim()}`);
  }

  return boundedText(raw.measurable);
}

function getMissingSmartGoalFields(draft: unknown): string[] {
  const raw = asRecord(draft);
  const specific = asRecord(raw.specific);
  const measurable = asRecord(raw.measurable);
  const achievable = asRecord(raw.achievable);
  const relevant = asRecord(raw.relevant);
  const timeBound = asRecord(raw.time_bound ?? raw.timeBound);

  const missing: string[] = [];
  if (!boundedText(raw.goal_statement ?? specific.goal_statement ?? raw.specific)) missing.push("specific");
  if (!boundedText(raw.metric_name ?? measurable.metric_name ?? raw.measurable)) missing.push("measurable");
  if (!boundedText(raw.weekly_time_commitment_hours ?? achievable.weekly_time_commitment_hours ?? raw.achievable)) {
    missing.push("achievable");
  }
  if (!boundedText(raw.motivation_reason ?? relevant.motivation_reason ?? raw.relevant)) missing.push("relevant");
  if (
    !boundedText(
      raw.target_date ?? raw.target_weeks ?? timeBound.target_date ?? timeBound.target_weeks ?? raw.timeBound,
    )
  ) {
    missing.push("time_bound");
  }

  return missing;
}

function readFeasibilityDraftSummary(): AssistantPageContext["formDraft"] {
  const answers = readJsonStorage(APP_STORAGE_KEYS.pendingFeasibilityAnswers);
  const result = readJsonStorage(APP_STORAGE_KEYS.pendingFeasibilityResult);
  const bottleneck = asRecord(result?.bottleneck);

  return {
    feasibilityAnsweredCount: answers ? Object.keys(answers).length : 0,
    feasibilityBottleneck: boundedText(bottleneck.label ?? result?.feasibilityResult),
  };
}

function readTwelveWeekDraftSummary(): AssistantPageContext["formDraft"] {
  const draft = readJsonStorage(APP_STORAGE_KEYS.pending12WeekSetupDraft);
  if (!draft) return {};

  const leadIndicators = Array.isArray(draft.leadIndicators) ? draft.leadIndicators : [];
  const namedLeadIndicators = leadIndicators.filter((indicator) => boundedText(asRecord(indicator).name));

  return {
    twelveWeekDraftSummary: {
      leadIndicatorCount: namedLeadIndicators.length,
      hasReviewDay: !!boundedText(draft.reviewDay),
      hasWeek12Outcome: !!boundedText(draft.week12Outcome),
      hasLagMetric: !!boundedText(draft.lagMetricName),
      tacticLoadPreference: boundedText(draft.tacticLoadPreference),
      personalConstraint: boundedText(draft.personalConstraint),
    },
  };
}

function buildNextSuggestedStep(route: string, formDraft: AssistantPageContext["formDraft"]): string | null {
  if (route === "/" || route === "/dashboard") {
    const missingSmart = formDraft.missingSmartGoalFields ?? [];
    if (missingSmart.length > 0) return `Điền phần SMART còn thiếu: ${missingSmart.join(", ")}`;
    if (formDraft.smartGoalTitle && !formDraft.feasibilityBottleneck)
      return "Tiếp tục feasibility cho SMART goal hiện tại";
    if (formDraft.feasibilityBottleneck && !formDraft.twelveWeekDraftSummary)
      return "Lập kế hoạch 12 tuần từ feasibility hiện tại";
    if (!formDraft.goalCount) return "Bắt đầu bằng Life Insight hoặc SMART Goal";
    if ((formDraft.goalsWithoutTwelveWeekPlan ?? 0) > 0) return "Chọn một goal để lập kế hoạch 12 tuần";
    return "Mở hệ 12 tuần và chọn việc hôm nay";
  }

  if (route === "/goals") {
    if (!formDraft.goalCount) return "Tạo SMART goal đầu tiên";
    if ((formDraft.goalsWithoutTwelveWeekPlan ?? 0) > 0) return "Chọn một goal để lập kế hoạch 12 tuần";
    return "Mở goal đang chạy để xem tiến độ";
  }

  if (route === "/smart-goal-setup") {
    const missing = formDraft.missingSmartGoalFields ?? [];
    return missing.length > 0
      ? `Điền phần SMART còn thiếu: ${missing.join(", ")}`
      : "Chuyển sang feasibility để kiểm tra độ khả thi";
  }

  if (route === "/feasibility") {
    if (!formDraft.smartGoalTitle) return "Hoàn thiện SMART goal trước khi chấm feasibility";
    if (!formDraft.feasibilityAnsweredCount) return "Trả lời các câu hỏi feasibility đầu tiên";
    if (!formDraft.feasibilityBottleneck) return "Hoàn tất feasibility để tìm bottleneck";
    return "Dùng bottleneck để chỉnh kế hoạch khả thi hơn";
  }

  if (route === "/12-week-setup") {
    const summary = formDraft.twelveWeekDraftSummary;
    if (!summary) return "Bắt đầu điền outcome 12 tuần";

    const missing = [
      summary.hasWeek12Outcome ? null : "week12Outcome",
      summary.hasLagMetric ? null : "lagMetric",
      summary.leadIndicatorCount > 0 ? null : "leadIndicators",
      summary.hasReviewDay ? null : "reviewDay",
    ].filter((item): item is string => item !== null);

    return missing.length > 0
      ? `Điền phần 12-week setup còn thiếu: ${missing.join(", ")}`
      : "Tạo hệ 12 tuần từ bản nháp hiện tại";
  }

  return null;
}

function getLatestWeeklyReview(reviews: UniversalWeeklyReview[]): AssistantContext["latestWeeklyReview"] {
  const latest = reviews
    .filter((review) => review.reviewCompleted)
    .sort((left, right) => {
      const leftReviewedAt = left.lastReviewAt ?? "";
      const rightReviewedAt = right.lastReviewAt ?? "";
      if (leftReviewedAt !== rightReviewedAt) return rightReviewedAt.localeCompare(leftReviewedAt);
      return right.weekNumber - left.weekNumber;
    })[0];

  if (!latest) return null;

  return {
    weekNumber: latest.weekNumber,
    leadCompletionPercent: boundedNumber(latest.leadCompletionPercent, 0, 100),
    mainObstacle: boundedText(latest.mainObstacle),
    nextWeekPriority: boundedText(latest.nextWeekPriority),
    workloadDecision: boundedText(latest.workloadDecision),
    reviewedAt: boundedText(latest.lastReviewAt, 40),
  };
}

function getLatestObstacle(checkIns: UniversalDailyCheckIn[]): string | null {
  return (
    checkIns
      .filter((checkIn) => boundedText(checkIn.obstacleOrIssue))
      .sort((left, right) => right.date.localeCompare(left.date))[0]
      ?.obstacleOrIssue?.trim()
      .slice(0, 200) ?? null
  );
}

function buildStuckSignals(
  system: TwelveWeekSystem,
  latestWeeklyReview: AssistantContext["latestWeeklyReview"],
  referenceDate: Date,
): AssistantContext["stuckSignals"] {
  const todayKey = formatDateInputValue(referenceDate);
  const overdueTasks = system.taskInstances
    .filter((task) => {
      const scheduledDate = getCalendarDateKey(task.scheduledDate);
      return scheduledDate !== null && scheduledDate < todayKey && !task.completed && !task.skipped;
    })
    .sort((left, right) => left.scheduledDate.localeCompare(right.scheduledDate));

  const missedCommitments =
    system.weeklyReviews
      .filter((review) => review.reviewCompleted)
      .sort((left, right) => right.weekNumber - left.weekNumber)[0]
      ?.commitmentsMissed?.map((commitment) => commitment.trim().slice(0, 200))
      .filter(Boolean)
      .slice(0, 3) ?? [];

  return {
    latestObstacle: getLatestObstacle(system.dailyCheckIns) ?? latestWeeklyReview?.mainObstacle ?? null,
    missedCommitments,
    overdueOpenCount: overdueTasks.length,
    overdueTasks: overdueTasks.slice(0, 5).map((task) => ({
      id: task.id,
      title: task.title,
      scheduledDate: getCalendarDateKey(task.scheduledDate) ?? task.scheduledDate,
      isCore: task.isCore,
    })),
  };
}

/**
 * Build trend context: completion rate for last 4 weeks and direction.
 */
function buildTrendContext(system: TwelveWeekSystem, currentWeek: number | null): AssistantContext["trend"] {
  if (currentWeek === null) {
    return { completionLast4Weeks: [], direction: "unknown" };
  }

  const weeksToCheck = [currentWeek - 3, currentWeek - 2, currentWeek - 1, currentWeek];
  const completions: number[] = [];

  for (const weekNum of weeksToCheck) {
    if (weekNum < 1) {
      completions.push(NaN); // Mark as missing
      continue;
    }

    const range = getTwelveWeekWeekRange(system, weekNum);
    const startDate = parseCalendarDate(range.start);
    if (!startDate) {
      completions.push(NaN);
      continue;
    }

    const weekTasks = system.taskInstances.filter((task) => task.weekNumber === weekNum && !task.skipped);
    const completedTasks = weekTasks.filter((task) => task.completed).length;
    const totalTasks = weekTasks.length;

    if (totalTasks === 0) {
      completions.push(0);
    } else {
      completions.push(Math.round((completedTasks / totalTasks) * 100));
    }
  }

  // Filter out NaN values for direction calculation
  const validCompletions = completions.filter((val) => !Number.isNaN(val));

  const direction = calculateDirection(validCompletions);

  return {
    completionLast4Weeks: completions.filter((val) => !Number.isNaN(val)),
    direction,
  };
}

/**
 * Calculate trend direction from completion rates.
 */
function calculateDirection(completions: number[]): "up" | "down" | "flat" | "unknown" {
  if (completions.length < 2) return "unknown";

  // Simple linear regression slope
  const count = completions.length;
  const first = completions[0];
  const last = completions[count - 1];
  const slope = (last - first) / count;

  if (slope > 5) return "up";
  if (slope < -5) return "down";
  return "flat";
}

/**
 * Build streak context: consecutive days with at least one completed task.
 */
function buildStreakContext(system: TwelveWeekSystem, referenceDate: Date): AssistantContext["streak"] {
  let streak = 0;

  // Check from today backwards
  for (let daysBack = 0; daysBack < 365; daysBack++) {
    const checkDate = new Date(referenceDate);
    checkDate.setDate(checkDate.getDate() - daysBack);
    const checkDateKey = formatDateInputValue(checkDate);

    // Check if any task was completed on this date
    const hasCompletedTask = system.taskInstances.some(
      (task) => task.completed && getCalendarDateKey(task.completedAt || "") === checkDateKey,
    );

    // Also check daily check-ins
    const hasCheckIn = system.dailyCheckIns.some((checkIn) => checkIn.didWorkToday && checkIn.date === checkDateKey);

    if (hasCompletedTask || hasCheckIn) {
      streak++;
    } else {
      // Streak broken
      break;
    }
  }

  return { daysWithCompletedTask: streak };
}

/**
 * Build upcoming deadlines from goals with deadlines.
 */
function buildUpcomingDeadlines(goals: Goal[], referenceDate: Date): AssistantContext["upcomingDeadlines"] {
  const _todayKey = formatDateInputValue(referenceDate);
  const deadlines: Array<{ goalId: string; title: string; daysUntil: number }> = [];

  for (const goal of goals) {
    if (!goal.deadline) continue;

    const deadlineDate = parseCalendarDate(goal.deadline);
    if (!deadlineDate) continue;

    const _deadlineKey = formatDateInputValue(deadlineDate);
    const today = new Date(referenceDate);
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(deadlineDate);
    deadline.setHours(0, 0, 0, 0);

    const daysUntil = Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Skip if already passed by more than a year
    if (daysUntil < -365) continue;

    deadlines.push({
      goalId: goal.id,
      title: goal.title,
      daysUntil,
    });
  }

  // Sort by daysUntil ascending and take top 3
  return deadlines.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 3);
}
