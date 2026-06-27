export const VALID_ACTION_TYPES = [
  "create_task",
  "mark_task_done",
  "navigate_to",
  "create_goal",
  "create_life_insight_note",
  "create_smart_goal_from_insight",
  "suggest_feasibility_inputs",
  "create_twelve_week_plan_draft",
  "add_weekly_review",
  "reschedule_task",
  "update_task_status",
] as const;

export type AssistantActionType = (typeof VALID_ACTION_TYPES)[number];

export const VALID_ROUTES = [
  "/",
  "/settings",
  "/onboarding",
  "/life-insight",
  "/feasibility",
  "/smart-goal-setup",
  "/vision",
  "/12-week-setup",
  "/12-week-dashboard",
  "/12-week-plan-setup",
  "/12-week-plan-overview",
  "/12-week-system",
  "/billing",
  "/goals",
  "/life-balance",
  "/achievements",
  "/journal",
  "/gallery",
  "/today",
  "/reflection",
  "/dashboard",
  "/twelve-week",
] as const;

export type AssistantValidRoute = (typeof VALID_ROUTES)[number];

export const GOAL_CATEGORIES = [
  "health",
  "career",
  "relationships",
  "finance",
  "personal",
  "family",
  "other",
] as const;

export type PersonalConstraint = "time" | "motivation" | "consistency" | "complexity" | "";
export type WorkloadDecision = "keep same" | "reduce slightly" | "increase slightly" | "";
export type TacticLoadPreference = "balanced" | "lighter" | "push";
export type LeadIndicatorType = "core" | "optional";
export type LeadIndicatorCadence = "spread" | "frontload" | "backload";
export type LifeInsightEntryType = "freeform" | "weekly-review" | "cycleReview";

export interface SanitizedLeadIndicator {
  id: string;
  name: string;
  target: string;
  unit: string;
  type: LeadIndicatorType;
  cadence: LeadIndicatorCadence;
}

const PERSONAL_CONSTRAINTS: PersonalConstraint[] = ["time", "motivation", "consistency", "complexity", ""];
const WORKLOAD_DECISIONS: WorkloadDecision[] = ["keep same", "reduce slightly", "increase slightly", ""];

export function isAssistantActionType(value: string): value is AssistantActionType {
  return (VALID_ACTION_TYPES as readonly string[]).includes(value);
}

// Chuẩn hóa category: chấp nhận enum tiếng Anh, đồng thời map từ khóa tiếng Việt phổ biến → enum.
// Lớp an toàn cho model nhỏ hay trả category theo lời người dùng ("sức khỏe", "tài chính"...).
// Không khớp → "other" (giữ hành vi cũ).
export function normalizeGoalCategory(raw: unknown): string {
  if (typeof raw !== "string") return "other";
  const value = raw.trim().toLowerCase();
  if (!value) return "other";

  if ((GOAL_CATEGORIES as readonly string[]).includes(value)) return value;

  // Bỏ dấu tiếng Việt để so khớp từ khóa.
  const noAccent = value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/Đ/gi, "d");

  const has = (...keywords: string[]) => keywords.some((kw) => noAccent.includes(kw));

  if (has("suc khoe", "the thao", "tap", "gym", "ngu", "an uong", "dinh duong", "the chat", "health")) return "health";
  if (has("su nghiep", "cong viec", "nghe", "hoc", "thi", "ky nang", "career", "job", "study")) return "career";
  if (has("tai chinh", "tien", "tiet kiem", "thu nhap", "dau tu", "mua", "finance", "money")) return "finance";
  if (has("moi quan he", "quan he", "ban be", "yeu", "tinh cam", "nguoi yeu", "relationship")) return "relationships";
  if (has("gia dinh", "bo me", "cha me", "con cai", "vo chong", "family")) return "family";
  if (has("ca nhan", "ban than", "phat trien", "thoi quen", "tinh than", "personal", "self")) return "personal";

  return "other";
}

function isPersonalConstraint(value: string): value is PersonalConstraint {
  return PERSONAL_CONSTRAINTS.includes(value as PersonalConstraint);
}

function isWorkloadDecision(value: string): value is WorkloadDecision {
  return WORKLOAD_DECISIONS.includes(value as WorkloadDecision);
}

function generateLeadIndicatorId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `tactic_${Math.random().toString(36).slice(2, 8)}`;
}

export function sanitizeCreateTaskPayload(
  payload: Record<string, unknown>,
): { title: string; scheduledDate: string; isCore: boolean } | null {
  if (typeof payload.title !== "string") return null;
  const title = payload.title.slice(0, 200).trim();

  const scheduledDateRaw = payload.scheduledDate;
  let scheduledDate: string;
  if (scheduledDateRaw === "today" || scheduledDateRaw === "tomorrow") {
    scheduledDate = scheduledDateRaw;
  } else if (typeof scheduledDateRaw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(scheduledDateRaw)) {
    scheduledDate = scheduledDateRaw;
  } else {
    return null;
  }

  const isCore = payload.isCore === true;
  return { title, scheduledDate, isCore };
}

export function sanitizeMarkTaskDonePayload(
  payload: Record<string, unknown>,
): { taskId: string; done: boolean } | null {
  if (typeof payload.taskId !== "string" || !payload.taskId.trim()) return null;
  if (typeof payload.done !== "boolean") return null;
  const taskId = payload.taskId.slice(0, 100).trim();
  const done = payload.done;
  if (!done) return null;
  return { taskId, done };
}

export function sanitizeNavigateToPayload(payload: Record<string, unknown>): { route: string } | null {
  if (typeof payload.route !== "string") return null;
  const route = payload.route;
  if (!route.startsWith("/")) return null;
  if (!(VALID_ROUTES as readonly string[]).includes(route)) return null;
  return { route };
}

export function sanitizeCreateGoalPayload(
  payload: Record<string, unknown>,
): { title: string; category: string; description?: string; deadline?: string } | null {
  if (typeof payload.title !== "string" || !payload.title.trim()) return null;
  const title = payload.title.slice(0, 200).trim();

  const category = normalizeGoalCategory(payload.category);

  const description = typeof payload.description === "string" ? payload.description.slice(0, 500).trim() : undefined;

  let deadline: string | undefined;
  if (typeof payload.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(payload.deadline)) {
    deadline = payload.deadline;
  }

  return { title, category, description, deadline };
}

export function sanitizeCreateLifeInsightNotePayload(
  payload: Record<string, unknown>,
): { title: string; content: string; mood?: string; entryType: LifeInsightEntryType } | null {
  if (typeof payload.title !== "string" || !payload.title.trim()) return null;
  if (typeof payload.content !== "string" || !payload.content.trim()) return null;
  const title = payload.title.slice(0, 200).trim();
  const content = payload.content.slice(0, 2000).trim();
  const mood = typeof payload.mood === "string" ? payload.mood.slice(0, 50) : undefined;
  const entryType =
    payload.entryType === "freeform" || payload.entryType === "weekly-review" || payload.entryType === "cycleReview"
      ? payload.entryType
      : "freeform";
  return { title, content, mood, entryType };
}

export function sanitizeCreateSmartGoalFromInsightPayload(
  payload: Record<string, unknown>,
): { title: string; category: string; description?: string; deadline?: string; focusArea?: string } | null {
  if (typeof payload.title !== "string" || !payload.title.trim()) return null;
  const title = payload.title.slice(0, 200).trim();

  const category = normalizeGoalCategory(payload.category);

  const description = typeof payload.description === "string" ? payload.description.slice(0, 1000).trim() : undefined;
  const deadline =
    typeof payload.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(payload.deadline) ? payload.deadline : undefined;
  const focusArea = typeof payload.focusArea === "string" ? payload.focusArea.slice(0, 100).trim() : undefined;

  return { title, category, description, deadline, focusArea };
}

export function sanitizeSuggestFeasibilityInputsPayload(
  payload: Record<string, unknown>,
): { answers: Record<number, string> } | null {
  if (!payload.answers || typeof payload.answers !== "object" || Array.isArray(payload.answers)) return null;
  const rawAnswers = payload.answers as Record<string, unknown>;
  const answers: Record<number, string> = {};

  const validQ1 = ["lt1", "1to3", "3to5", "gt5"];
  const validQ2 = ["energy_drained", "energy_low", "energy_stable", "energy_high"];
  const validQ3 = ["resources_missing", "resources_basic", "resources_mostly_ready", "resources_ready"];
  const validQ4 = ["overwhelming", "challenging", "realistic", "very_realistic"];
  const validQ5 = ["motivation", "time", "resources", "complexity", "none"];
  const validQ6 = ["rarely", "sometimes", "mostly", "always"];
  const validQ7 = ["exploring", "interested", "ready", "committed"];

  const valQ1 = String(rawAnswers[1] ?? "");
  const valQ2 = String(rawAnswers[2] ?? "");
  const valQ3 = String(rawAnswers[3] ?? "");
  const valQ4 = String(rawAnswers[4] ?? "");
  const valQ5 = String(rawAnswers[5] ?? "");
  const valQ6 = String(rawAnswers[6] ?? "");
  const valQ7 = String(rawAnswers[7] ?? "");

  if (!validQ1.includes(valQ1)) return null;
  if (!validQ2.includes(valQ2)) return null;
  if (!validQ3.includes(valQ3)) return null;
  if (!validQ4.includes(valQ4)) return null;
  if (!validQ5.includes(valQ5)) return null;
  if (!validQ6.includes(valQ6)) return null;
  if (!validQ7.includes(valQ7)) return null;

  answers[1] = valQ1;
  answers[2] = valQ2;
  answers[3] = valQ3;
  answers[4] = valQ4;
  answers[5] = valQ5;
  answers[6] = valQ6;
  answers[7] = valQ7;

  return { answers };
}

export function sanitizeCreateTwelveWeekPlanDraftPayload(payload: Record<string, unknown>): {
  week12Outcome: string;
  lagMetricName: string;
  lagMetricTarget: string;
  lagMetricUnit: string;
  startDate: string;
  reviewDay: string;
  tacticLoadPreference: TacticLoadPreference;
  week4Milestone: string;
  week8Milestone: string;
  successEvidence: string;
  dailyTimeBudget: string;
  personalConstraint: PersonalConstraint;
  leadIndicators: SanitizedLeadIndicator[];
} | null {
  const week12Outcome = typeof payload.week12Outcome === "string" ? payload.week12Outcome.slice(0, 500).trim() : "";
  const lagMetricName = typeof payload.lagMetricName === "string" ? payload.lagMetricName.slice(0, 100).trim() : "";
  const lagMetricTarget =
    typeof payload.lagMetricTarget === "string" ? payload.lagMetricTarget.slice(0, 50).trim() : "";
  const lagMetricUnit = typeof payload.lagMetricUnit === "string" ? payload.lagMetricUnit.slice(0, 50).trim() : "";
  const startDate =
    typeof payload.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(payload.startDate) ? payload.startDate : "";
  const reviewDay = typeof payload.reviewDay === "string" ? payload.reviewDay.slice(0, 50).trim() : "Sunday";

  let tacticLoadPreference: TacticLoadPreference = "balanced";
  if (payload.tacticLoadPreference === "lighter" || payload.tacticLoadPreference === "push") {
    tacticLoadPreference = payload.tacticLoadPreference;
  }

  const week4Milestone = typeof payload.week4Milestone === "string" ? payload.week4Milestone.slice(0, 500).trim() : "";
  const week8Milestone = typeof payload.week8Milestone === "string" ? payload.week8Milestone.slice(0, 500).trim() : "";
  const successEvidence =
    typeof payload.successEvidence === "string" ? payload.successEvidence.slice(0, 500).trim() : "";
  const dailyTimeBudget =
    typeof payload.dailyTimeBudget === "string" ? payload.dailyTimeBudget.slice(0, 50).trim() : "";

  let personalConstraint: PersonalConstraint = "";
  if (typeof payload.personalConstraint === "string" && isPersonalConstraint(payload.personalConstraint)) {
    personalConstraint = payload.personalConstraint;
  }

  const leadIndicators: SanitizedLeadIndicator[] = [];
  if (Array.isArray(payload.leadIndicators)) {
    for (const item of payload.leadIndicators) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const rawItem = item as Record<string, unknown>;
        const id = typeof rawItem.id === "string" ? rawItem.id.slice(0, 100) : generateLeadIndicatorId();
        const name = typeof rawItem.name === "string" ? rawItem.name.slice(0, 200).trim() : "";
        const target = typeof rawItem.target === "string" ? rawItem.target.slice(0, 50).trim() : "";
        const unit = typeof rawItem.unit === "string" ? rawItem.unit.slice(0, 50).trim() : "";
        const type: LeadIndicatorType = rawItem.type === "core" || rawItem.type === "optional" ? rawItem.type : "core";
        const cadence: LeadIndicatorCadence =
          rawItem.cadence === "spread" || rawItem.cadence === "frontload" || rawItem.cadence === "backload"
            ? rawItem.cadence
            : "spread";

        if (name) {
          leadIndicators.push({ id, name, target, unit, type, cadence });
        }
      }
    }
  }

  return {
    week12Outcome,
    lagMetricName,
    lagMetricTarget,
    lagMetricUnit,
    startDate,
    reviewDay,
    tacticLoadPreference,
    week4Milestone,
    week8Milestone,
    successEvidence,
    dailyTimeBudget,
    personalConstraint,
    leadIndicators,
  };
}

export function sanitizeAddWeeklyReviewPayload(payload: Record<string, unknown>): {
  goalId: string;
  weekNumber: number;
  mainObstacle: string;
  nextWeekPriority: string;
  workloadDecision: WorkloadDecision;
  biggestOutputThisWeek: string;
  reflection: string;
  adjustments: string;
  disciplineScore?: number;
  progressScore?: number;
} | null {
  if (typeof payload.goalId !== "string" || !payload.goalId.trim()) return null;
  if (typeof payload.weekNumber !== "number") return null;

  const goalId = payload.goalId.slice(0, 100);
  const weekNumber = payload.weekNumber;
  const mainObstacle = typeof payload.mainObstacle === "string" ? payload.mainObstacle.slice(0, 1000).trim() : "";
  const nextWeekPriority =
    typeof payload.nextWeekPriority === "string" ? payload.nextWeekPriority.slice(0, 1000).trim() : "";

  let workloadDecision: WorkloadDecision = "";
  if (typeof payload.workloadDecision === "string" && isWorkloadDecision(payload.workloadDecision)) {
    workloadDecision = payload.workloadDecision;
  }

  const biggestOutputThisWeek =
    typeof payload.biggestOutputThisWeek === "string" ? payload.biggestOutputThisWeek.slice(0, 1000).trim() : "";
  const reflection = typeof payload.reflection === "string" ? payload.reflection.slice(0, 2000).trim() : "";
  const adjustments = typeof payload.adjustments === "string" ? payload.adjustments.slice(0, 2000).trim() : "";

  const disciplineScore =
    typeof payload.disciplineScore === "number" ? Math.max(0, Math.min(10, payload.disciplineScore)) : undefined;
  const progressScore =
    typeof payload.progressScore === "number" ? Math.max(0, Math.min(10, payload.progressScore)) : undefined;

  return {
    goalId,
    weekNumber,
    mainObstacle,
    nextWeekPriority,
    workloadDecision,
    biggestOutputThisWeek,
    reflection,
    adjustments,
    disciplineScore,
    progressScore,
  };
}

export function sanitizeRescheduleTaskPayload(
  payload: Record<string, unknown>,
): { taskId: string; scheduledDate: string } | null {
  if (typeof payload.taskId !== "string" || !payload.taskId.trim()) return null;
  if (typeof payload.scheduledDate !== "string" || !payload.scheduledDate.trim()) return null;
  const taskId = payload.taskId.slice(0, 100);
  const scheduledDate = payload.scheduledDate.slice(0, 50).trim();
  return { taskId, scheduledDate };
}

export function sanitizeUpdateTaskStatusPayload(
  payload: Record<string, unknown>,
): { taskId: string; completed: boolean } | null {
  if (typeof payload.taskId !== "string" || !payload.taskId.trim()) return null;
  if (typeof payload.completed !== "boolean") return null;
  const taskId = payload.taskId.slice(0, 100).trim();
  const completed = payload.completed;
  return { taskId, completed };
}

export function sanitizeActionPayload(
  type: AssistantActionType,
  payload: Record<string, unknown>,
): Record<string, unknown> | null {
  switch (type) {
    case "create_task":
      return sanitizeCreateTaskPayload(payload);
    case "mark_task_done":
      return sanitizeMarkTaskDonePayload(payload);
    case "navigate_to":
      return sanitizeNavigateToPayload(payload);
    case "create_goal":
      return sanitizeCreateGoalPayload(payload);
    case "create_life_insight_note":
      return sanitizeCreateLifeInsightNotePayload(payload);
    case "create_smart_goal_from_insight":
      return sanitizeCreateSmartGoalFromInsightPayload(payload);
    case "suggest_feasibility_inputs":
      return sanitizeSuggestFeasibilityInputsPayload(payload);
    case "create_twelve_week_plan_draft":
      return sanitizeCreateTwelveWeekPlanDraftPayload(payload);
    case "add_weekly_review":
      return sanitizeAddWeeklyReviewPayload(payload);
    case "reschedule_task":
      return sanitizeRescheduleTaskPayload(payload);
    case "update_task_status":
      return sanitizeUpdateTaskStatusPayload(payload);
    default:
      return null;
  }
}
