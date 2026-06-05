import { env } from "../config/env";
import { sendToGemini } from "./geminiAssistantProvider";
import { sendToGroq } from "./groqAssistantProvider";
import type { AssistantContext } from "./assistantService";

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

export interface AIAssistantRequest {
  message: string;
  context: AssistantContext;
  mode: "demo" | "real";
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface AIAssistantResponse {
  assistantText: string;
  proposedActions: AssistantAction[];
}

export interface AIAssistantError {
  message: string;
  errorCode: string;
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

const PROVIDER_FALLBACK_ERROR_CODES = new Set([
  "ASSISTANT_PROVIDER_RATE_LIMIT",
  "ASSISTANT_PROVIDER_TIMEOUT",
  "ASSISTANT_PROVIDER_SERVER_ERROR",
]);

function normalizeShortUserText(userText: string): string {
  return userText
    .trim()
    .toLowerCase()
    .normalize("NFC")
    .replace(/[!?.。！？,，;:]+$/g, "")
    .replace(/\s+/g, " ");
}

export function shouldUseLocalAssistantShortcut(userText: string): boolean {
  const normalized = normalizeShortUserText(userText);
  if (!normalized || normalized.length > 48) return false;

  const greetings = new Set([
    "hi",
    "hello",
    "hey",
    "hola",
    "alo",
    "chao",
    "xin chao",
    "chào",
    "xin chào",
    "cu oi",
    "cú ơi",
    "ai oi",
    "ai ơi",
    "bot oi",
    "bot ơi",
    "tro ly oi",
    "trợ lý ơi",
  ]);

  if (greetings.has(normalized)) return true;

  return /^(hi|hello|hey|hola|alo|chao|xin chao|chào|xin chào)(\s+(ban|bạn|cu|cú|bot|ai|oi|ơi))?$/.test(
    normalized,
  );
}

function shouldUseProviderFallback(errorCode: string): boolean {
  return PROVIDER_FALLBACK_ERROR_CODES.has(errorCode);
}

function buildProviderFallbackResponse(
  userText: string,
  ctx: AssistantContext,
  errorCode: string,
): AIAssistantResponse {
  const fallback = getDeterministicFallback(userText, ctx);
  const notice =
    errorCode === "ASSISTANT_PROVIDER_RATE_LIMIT"
      ? "AI nâng cao đang quá tải tạm thời, nên mình dùng chế độ nhanh để hỗ trợ trước."
      : "AI nâng cao đang gặp sự cố tạm thời, nên mình dùng chế độ nhanh để hỗ trợ trước.";

  return {
    ...fallback,
    assistantText: `${notice}\n\n${fallback.assistantText}`.trim(),
  };
}

function sanitizeCreateTaskPayload(payload: any) {
  if (!payload || typeof payload.title !== "string") return null;
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

function sanitizeMarkTaskDonePayload(payload: any) {
  if (!payload || typeof payload.taskId !== "string" || !payload.taskId.trim()) return null;
  if (typeof payload.done !== "boolean") return null;
  const taskId = payload.taskId.slice(0, 100).trim();
  const done = payload.done;
  if (!done) return null;
  return { taskId, done };
}

function sanitizeNavigateToPayload(payload: any) {
  if (!payload || typeof payload.route !== "string") return null;
  const route = payload.route;
  if (!route.startsWith("/") || !VALID_ROUTES.includes(route)) return null;
  return { route };
}

function sanitizeCreateGoalPayload(payload: any) {
  if (!payload || typeof payload.title !== "string" || !payload.title.trim()) return null;
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

function sanitizeCreateLifeInsightNotePayload(payload: any) {
  if (!payload || typeof payload.title !== "string" || !payload.title.trim()) return null;
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

function sanitizeCreateSmartGoalFromInsightPayload(payload: any) {
  if (!payload || typeof payload.title !== "string" || !payload.title.trim()) return null;
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

function sanitizeSuggestFeasibilityInputsPayload(payload: any) {
  if (!payload || !payload.answers || typeof payload.answers !== "object" || Array.isArray(payload.answers)) return null;
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

function sanitizeCreateTwelveWeekPlanDraftPayload(payload: any) {
  if (!payload) return null;
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
        const id = typeof item.id === "string" ? item.id.slice(0, 100) : "tactic_" + Math.random().toString(36).slice(2, 8);
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

function sanitizeAddWeeklyReviewPayload(payload: any) {
  if (!payload || typeof payload.goalId !== "string" || !payload.goalId.trim()) return null;
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

function sanitizeRescheduleTaskPayload(payload: any) {
  if (!payload || typeof payload.taskId !== "string" || !payload.taskId.trim()) return null;
  if (typeof payload.scheduledDate !== "string" || !payload.scheduledDate.trim()) return null;

  const taskId = payload.taskId.slice(0, 100);
  const scheduledDate = payload.scheduledDate.slice(0, 50).trim();
  return { taskId, scheduledDate };
}

function sanitizeUpdateTaskStatusPayload(payload: any) {
  if (!payload || typeof payload.taskId !== "string" || !payload.taskId.trim()) return null;
  if (typeof payload.completed !== "boolean") return null;
  const taskId = payload.taskId.slice(0, 100).trim();
  const completed = payload.completed;
  return { taskId, completed };
}

export function parseAndValidateAIResponse(rawText: string): AIAssistantResponse {
  const actionBlockRegex = /```action\n([\s\S]*?)\n```/g;
  const proposedActions: AssistantAction[] = [];
  let match: RegExpExecArray | null;

  while (true) {
    match = actionBlockRegex.exec(rawText);
    if (match === null) break;
    try {
      const json = JSON.parse(match[1].trim());
      if (typeof json.type === "string" && VALID_ACTION_TYPES.includes(json.type) && typeof json.label === "string") {
        let sanitizedPayload: any = null;
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
        }

        if (sanitizedPayload) {
          proposedActions.push({
            id: json.id || `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            type: json.type as any,
            payload: sanitizedPayload,
            label: json.label.slice(0, 80),
          });
        }
      }
    } catch {
      // Ignore invalid JSON action blocks
    }
  }

  const assistantText = rawText.replace(/```action[\s\S]*?```/g, "").trim();

  return { assistantText, proposedActions };
}

export function getDeterministicFallback(
  userText: string,
  ctx: AssistantContext,
): AIAssistantResponse {
  const lower = userText.toLowerCase().trim();

  // 1. Ý định đánh dấu hoàn thành công việc (tick task)
  const isTickIntent =
    (/tick|hoàn thành|xong|đóng|đánh dấu/).test(lower) &&
    (/task|việc|nhiệm vụ|công việc/).test(lower);

  if (isTickIntent) {
    if (ctx.currentWeek === null) {
      return {
        assistantText: "Bạn chưa có kế hoạch 12 tuần nào đang hoạt động, do đó không có công việc nào để hoàn thành. Hãy bắt đầu bằng cách tạo mục tiêu và thiết lập kế hoạch 12 tuần trước nhé.",
        proposedActions: [],
      };
    }

    const openTasks = (ctx.todayTasks || []).filter((t) => !t.done);
    if (openTasks.length === 0) {
      const overdueOpenTasks = (ctx.stuckSignals?.overdueTasks || []);
      if (overdueOpenTasks.length > 0) {
        const taskToDone = overdueOpenTasks[0];
        return {
          assistantText: `Tôi tìm thấy một công việc quá hạn chưa hoàn thành: **"${taskToDone.title}"**. Bạn có muốn đánh dấu hoàn thành công việc này không?\n\nNhấn vào nút **Đồng ý** ở bên dưới để thực hiện.`,
          proposedActions: [{
            id: `act_${Date.now()}_1`,
            type: "mark_task_done",
            payload: { taskId: taskToDone.id, done: true },
            label: `Hoàn thành: ${taskToDone.title}`,
          }],
        };
      }
      return {
        assistantText: "Hiện tại không có công việc nào chưa hoàn thành cho ngày hôm nay để đánh dấu hoàn thành.",
        proposedActions: [],
      };
    }

    const taskToDone = openTasks[0];
    return {
      assistantText: `Tôi thấy công việc chưa hoàn thành hôm nay: **"${taskToDone.title}"**. Bạn có muốn đánh dấu hoàn thành công việc này không?\n\nNhấn vào nút **Đồng ý** ở bên dưới để thực hiện.`,
      proposedActions: [{
        id: `act_${Date.now()}_2`,
        type: "mark_task_done",
        payload: { taskId: taskToDone.id, done: true },
        label: `Hoàn thành: ${taskToDone.title}`,
      }],
    };
  }

  // 2. Ý định tạo mục tiêu mới
  if ((lower.includes("tạo") || lower.includes("thêm")) && (lower.includes("mục tiêu") || lower.includes("goal"))) {
    let goalTitle = "Mục tiêu mới";
    const match = userText.match(/(?:mục tiêu|goal)\s+(.+)/i);
    if (match?.[1]) {
      goalTitle = match[1].trim().replace(/[?.!]/g, "");
    }

    const category = lower.includes("sức khỏe") || lower.includes("thể thao") || lower.includes("tập") ? "health"
                   : lower.includes("học") || lower.includes("thi") || lower.includes("sự nghiệp") || lower.includes("làm") ? "career"
                   : lower.includes("tiền") || lower.includes("tài chính") || lower.includes("mua") ? "finance"
                   : lower.includes("yêu") || lower.includes("bạn") || lower.includes("gia đình") ? "relationships"
                   : "personal";

    return {
      assistantText: `Mình hiểu bạn đang muốn tạo mục tiêu mới: **"${goalTitle}"**.\n\nĐể thực hiện điều này, bạn chỉ cần nhấn vào nút **Đồng ý** ở bên dưới. Mình sẽ tạo nhanh mục tiêu này vào hệ thống của bạn.`,
      proposedActions: [{
        id: `act_${Date.now()}_3`,
        type: "create_goal",
        payload: {
          title: goalTitle,
          category: category,
          description: "Được tạo nhanh từ hội thoại với Trợ lý AI",
        },
        label: `Tạo mục tiêu: ${goalTitle}`,
      }],
    };
  }

  // 3. Fallbacks cho các câu hỏi thông thường
  let text = "";
  if (/\b(hôm nay|today|task|việc)\b/.test(lower)) {
    const tasks = ctx.todayTasks || [];
    if (tasks.length === 0) {
      text = "Bạn chưa có task nào cho hôm nay. Nếu đã có mục tiêu, hãy vào hệ thống 12 tuần để chọn một việc nhỏ có thể làm ngay.";
    } else {
      const lines = tasks.slice(0, 5).map((t) => `- ${t.title}${t.done ? " (đã xong)" : ""}`);
      text = `Ưu tiên danh sách việc hôm nay (${tasks.length} task):\n${lines.join("\n")}`;
    }
  } else if (/\b(tuần|week|progress|tiến độ)\b/.test(lower)) {
    if (ctx.currentWeek === null) {
      text = "Bạn chưa bắt đầu kế hoạch 12 tuần nên chưa có thông tin tiến độ tuần hiện tại.";
    } else {
      text = `Bạn đang ở tuần ${ctx.currentWeek}/${ctx.weeksTotal}. Hãy tập trung hoàn thành các cam kết trong tuần này nhé.`;
    }
  } else if (/\b(mục tiêu|goal)\b/.test(lower)) {
    const goals = ctx.goals || [];
    if (goals.length === 0) {
      text = "Bạn chưa đặt mục tiêu nào. Hãy thiết lập một SMART goal cho chu kỳ 12 tuần tới.";
    } else {
      const lines = goals.map((g) => `- ${g.title} (${g.progress}%)`);
      text = `Mục tiêu hiện tại của bạn:\n${lines.join("\n")}`;
    }
  } else {
    text = "Chào bạn! Mình có thể hỗ trợ bạn xem việc hôm nay, tóm tắt tuần này, quản lý mục tiêu hoặc gợi ý reflection.";
  }

  return {
    assistantText: text,
    proposedActions: [],
  };
}

export async function processAIAssistantRequest(
  request: AIAssistantRequest,
): Promise<AIAssistantResponse | AIAssistantError> {
  const provider = env.AI_PROVIDER;
  const apiKey = env.AI_API_KEY;

  if (shouldUseLocalAssistantShortcut(request.message)) {
    return getDeterministicFallback(request.message, request.context);
  }

  // Nếu AI API key bị thiếu
  if (!apiKey) {
    if (request.mode === "demo") {
      // Chạy mock deterministic
      return getDeterministicFallback(request.message, request.context);
    }
    // Trả lỗi trong real mode
    return {
      message: "Dịch vụ AI chưa được cấu hình. Vui lòng cấu hình API Key để sử dụng trợ lý ở real-mode.",
      errorCode: "AI_PROVIDER_NOT_CONFIGURED",
    };
  }

  // Gửi request thực tế tới AI provider
  const history = request.history || [];
  const result = provider === "gemini"
    ? await sendToGemini(request.message.trim(), request.context, history)
    : await sendToGroq(request.message.trim(), request.context, history);

  if ("errorCode" in result) {
    // Trả lỗi từ provider
    const err = result as { message: string; errorCode: string };
    if (shouldUseProviderFallback(err.errorCode)) {
      console.warn("[ai-assistant] Provider unavailable, using deterministic fallback:", err.errorCode);
      return buildProviderFallbackResponse(request.message, request.context, err.errorCode);
    }

    return {
      message: err.message,
      errorCode: err.errorCode,
    };
  }

  // Phân tích và validate schema proposed actions từ kết quả LLM
  return parseAndValidateAIResponse(result.message);
}
