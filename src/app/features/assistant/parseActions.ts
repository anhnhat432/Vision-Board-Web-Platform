export interface AssistantAction {
  id: string;
  type:
    | "create_task"
    | "mark_task_done"
    | "navigate_to"
    | "create_goal"
    | "create_life_insight_note"
    | "create_smart_goal_from_insight"
    | "suggest_feasibility_inputs"
    | "create_twelve_week_plan_draft"
    | "add_weekly_review"
    | "reschedule_task"
    | "update_task_status";
  payload: Record<string, unknown>;
  label: string;
}

export interface ParsedReply {
  textContent: string;
  actions: AssistantAction[];
}

const VALID_ACTION_TYPES = [
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
];
const VALID_ROUTES = [
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
  "/today-v2",
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
];

function sanitizeCreateTaskPayload(
  payload: Record<string, unknown>,
): { title: string; scheduledDate: string; isCore: boolean } | null {
  if (typeof payload.title !== "string") return null;
  const title = payload.title.slice(0, 200);

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

function sanitizeMarkTaskDonePayload(payload: Record<string, unknown>): { taskId: string; done: boolean } | null {
  if (typeof payload.taskId !== "string") return null;
  const taskId = payload.taskId.slice(0, 100);
  const done = payload.done === true;

  if (!done) return null;

  return { taskId, done };
}

function sanitizeNavigateToPayload(payload: Record<string, unknown>): { route: string } | null {
  if (typeof payload.route !== "string") return null;
  const route = payload.route;

  if (!route.startsWith("/")) return null;
  if (!VALID_ROUTES.includes(route)) return null;

  return { route };
}

function sanitizeCreateGoalPayload(
  payload: Record<string, unknown>,
): { title: string; category: string; description?: string; deadline?: string } | null {
  if (typeof payload.title !== "string" || !payload.title.trim()) return null;
  const title = payload.title.slice(0, 200).trim();

  let category = "other";
  const validCategories = ["health", "career", "relationships", "finance", "personal", "family", "other"];
  if (typeof payload.category === "string" && validCategories.includes(payload.category.toLowerCase())) {
    category = payload.category.toLowerCase();
  }

  const description = typeof payload.description === "string" ? payload.description.slice(0, 500).trim() : undefined;

  let deadline: string | undefined;
  if (typeof payload.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(payload.deadline)) {
    deadline = payload.deadline;
  }

  return { title, category, description, deadline };
}

function sanitizeCreateLifeInsightNotePayload(
  payload: Record<string, unknown>,
): { title: string; content: string; mood?: string; entryType: "freeform" | "weekly-review" | "cycleReview" } | null {
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

function sanitizeCreateSmartGoalFromInsightPayload(
  payload: Record<string, unknown>,
): { title: string; category: string; description?: string; deadline?: string; focusArea?: string } | null {
  if (typeof payload.title !== "string" || !payload.title.trim()) return null;
  const title = payload.title.slice(0, 200).trim();

  let category = "other";
  const validCategories = ["health", "career", "relationships", "finance", "personal", "family", "other"];
  if (typeof payload.category === "string" && validCategories.includes(payload.category.toLowerCase())) {
    category = payload.category.toLowerCase();
  }

  const description = typeof payload.description === "string" ? payload.description.slice(0, 1000).trim() : undefined;
  const deadline =
    typeof payload.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(payload.deadline) ? payload.deadline : undefined;
  const focusArea = typeof payload.focusArea === "string" ? payload.focusArea.slice(0, 100).trim() : undefined;

  return { title, category, description, deadline, focusArea };
}

function sanitizeSuggestFeasibilityInputsPayload(
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

function sanitizeCreateTwelveWeekPlanDraftPayload(payload: Record<string, unknown>): {
  week12Outcome: string;
  lagMetricName: string;
  lagMetricTarget: string;
  lagMetricUnit: string;
  startDate: string;
  reviewDay: string;
  tacticLoadPreference: "balanced" | "lighter" | "push";
  week4Milestone: string;
  week8Milestone: string;
  successEvidence: string;
  dailyTimeBudget: string;
  personalConstraint: "time" | "motivation" | "consistency" | "complexity" | "";
  leadIndicators: Array<{
    id: string;
    name: string;
    target: string;
    unit: string;
    type: "core" | "optional";
    cadence: "spread" | "frontload" | "backload";
  }>;
} | null {
  const week12Outcome = typeof payload.week12Outcome === "string" ? payload.week12Outcome.slice(0, 500).trim() : "";
  const lagMetricName = typeof payload.lagMetricName === "string" ? payload.lagMetricName.slice(0, 100).trim() : "";
  const lagMetricTarget =
    typeof payload.lagMetricTarget === "string" ? payload.lagMetricTarget.slice(0, 50).trim() : "";
  const lagMetricUnit = typeof payload.lagMetricUnit === "string" ? payload.lagMetricUnit.slice(0, 50).trim() : "";
  const startDate =
    typeof payload.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(payload.startDate) ? payload.startDate : "";
  const reviewDay = typeof payload.reviewDay === "string" ? payload.reviewDay.slice(0, 50).trim() : "Sunday";

  let tacticLoadPreference: "balanced" | "lighter" | "push" = "balanced";
  if (payload.tacticLoadPreference === "lighter" || payload.tacticLoadPreference === "push") {
    tacticLoadPreference = payload.tacticLoadPreference;
  }

  const week4Milestone = typeof payload.week4Milestone === "string" ? payload.week4Milestone.slice(0, 500).trim() : "";
  const week8Milestone = typeof payload.week8Milestone === "string" ? payload.week8Milestone.slice(0, 500).trim() : "";
  const successEvidence =
    typeof payload.successEvidence === "string" ? payload.successEvidence.slice(0, 500).trim() : "";
  const dailyTimeBudget =
    typeof payload.dailyTimeBudget === "string" ? payload.dailyTimeBudget.slice(0, 50).trim() : "";

  let personalConstraint: "time" | "motivation" | "consistency" | "complexity" | "" = "";
  const constraints = ["time", "motivation", "consistency", "complexity", ""];
  if (typeof payload.personalConstraint === "string" && constraints.includes(payload.personalConstraint)) {
    personalConstraint = payload.personalConstraint as any;
  }

  const leadIndicators: any[] = [];
  if (Array.isArray(payload.leadIndicators)) {
    for (const item of payload.leadIndicators) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const id = typeof item.id === "string" ? item.id.slice(0, 100) : crypto.randomUUID();
        const name = typeof item.name === "string" ? item.name.slice(0, 200).trim() : "";
        const target = typeof item.target === "string" ? item.target.slice(0, 50).trim() : "";
        const unit = typeof item.unit === "string" ? item.unit.slice(0, 50).trim() : "";
        const type = item.type === "core" || item.type === "optional" ? item.type : "core";
        const cadence =
          item.cadence === "spread" || item.cadence === "frontload" || item.cadence === "backload"
            ? item.cadence
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

function sanitizeAddWeeklyReviewPayload(payload: Record<string, unknown>): {
  goalId: string;
  weekNumber: number;
  mainObstacle: string;
  nextWeekPriority: string;
  workloadDecision: "keep same" | "reduce slightly" | "increase slightly" | "";
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

  let workloadDecision: "keep same" | "reduce slightly" | "increase slightly" | "" = "";
  const decisions = ["keep same", "reduce slightly", "increase slightly", ""];
  if (typeof payload.workloadDecision === "string" && decisions.includes(payload.workloadDecision)) {
    workloadDecision = payload.workloadDecision as any;
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

function sanitizeRescheduleTaskPayload(
  payload: Record<string, unknown>,
): { taskId: string; scheduledDate: string } | null {
  if (typeof payload.taskId !== "string" || !payload.taskId.trim()) return null;
  if (typeof payload.scheduledDate !== "string" || !payload.scheduledDate.trim()) return null;

  const taskId = payload.taskId.slice(0, 100);
  const scheduledDate = payload.scheduledDate.slice(0, 50).trim();
  return { taskId, scheduledDate };
}

function sanitizeUpdateTaskStatusPayload(
  payload: Record<string, unknown>,
): { taskId: string; completed: boolean } | null {
  if (typeof payload.taskId !== "string" || !payload.taskId.trim()) return null;
  const taskId = payload.taskId.slice(0, 100);
  const completed = payload.completed === true;
  return { taskId, completed };
}

function parseActionBlock(content: string): AssistantAction | null {
  try {
    const json = JSON.parse(content);

    if (typeof json.type !== "string") return null;
    if (!VALID_ACTION_TYPES.includes(json.type)) return null;

    if (typeof json.label !== "string" || json.label.length === 0) {
      return null;
    }

    if (!json.payload || typeof json.payload !== "object") return null;

    let sanitizedPayload: Record<string, unknown> | null;

    switch (json.type) {
      case "create_task":
        sanitizedPayload = sanitizeCreateTaskPayload(json.payload);
        break;
      case "mark_task_done":
        sanitizedPayload = sanitizeMarkTaskDonePayload(json.payload);
        break;
      case "navigate_to":
        sanitizedPayload = sanitizeNavigateToPayload(json.payload);
        break;
      case "create_goal":
        sanitizedPayload = sanitizeCreateGoalPayload(json.payload);
        break;
      case "create_life_insight_note":
        sanitizedPayload = sanitizeCreateLifeInsightNotePayload(json.payload);
        break;
      case "create_smart_goal_from_insight":
        sanitizedPayload = sanitizeCreateSmartGoalFromInsightPayload(json.payload);
        break;
      case "suggest_feasibility_inputs":
        sanitizedPayload = sanitizeSuggestFeasibilityInputsPayload(json.payload);
        break;
      case "create_twelve_week_plan_draft":
        sanitizedPayload = sanitizeCreateTwelveWeekPlanDraftPayload(json.payload);
        break;
      case "add_weekly_review":
        sanitizedPayload = sanitizeAddWeeklyReviewPayload(json.payload);
        break;
      case "reschedule_task":
        sanitizedPayload = sanitizeRescheduleTaskPayload(json.payload);
        break;
      case "update_task_status":
        sanitizedPayload = sanitizeUpdateTaskStatusPayload(json.payload);
        break;
      default:
        return null;
    }

    if (!sanitizedPayload) return null;

    return {
      id: crypto.randomUUID(),
      type: json.type as any,
      payload: sanitizedPayload,
      label: json.label.slice(0, 80),
    };
  } catch {
    return null;
  }
}

export function parseAssistantReply(raw: string): ParsedReply {
  const actionBlockRegex = /```action\n([\s\S]*?)\n```/g;

  const actions: AssistantAction[] = [];
  let match: RegExpExecArray | null;

  while (true) {
    match = actionBlockRegex.exec(raw);
    if (match === null) break;
    const content = match[1].trim();
    const action = parseActionBlock(content);
    if (action) {
      actions.push(action);
    }
  }

  const textContent = raw.replace(/```action[\s\S]*?```/g, "").trim();

  return { textContent, actions };
}
