import { env } from "../config/env";
import { sendToGemini } from "./geminiAssistantProvider";
import { sendToGroq } from "./groqAssistantProvider";
import type { AssistantContext } from "./assistantService";

export interface AssistantAction {
  id: string;
  type: "create_task" | "mark_task_done" | "navigate_to" | "create_goal";
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

const VALID_ACTION_TYPES = ["create_task", "mark_task_done", "navigate_to", "create_goal"];
const VALID_ROUTES = ["/twelve-week", "/today", "/reflection", "/dashboard"];

function sanitizeCreateTaskPayload(payload: any) {
  if (!payload || typeof payload.title !== "string") return null;
  const title = payload.title.slice(0, 200).trim();
  const scheduledDate = typeof payload.scheduledDate === "string" ? payload.scheduledDate : "today";
  const isCore = payload.isCore === true;
  return { title, scheduledDate, isCore };
}

function sanitizeMarkTaskDonePayload(payload: any) {
  if (!payload || typeof payload.taskId !== "string") return null;
  const taskId = payload.taskId.slice(0, 100);
  const done = payload.done === true;
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
  const deadline = typeof payload.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(payload.deadline) ? payload.deadline : undefined;
  return { title, category, description, deadline };
}

export function parseAndValidateAIResponse(rawText: string): AIAssistantResponse {
  const actionBlockRegex = /```action\n([\s\S]*?)\n```/g;
  const proposedActions: AssistantAction[] = [];
  let match: RegExpExecArray | null;

  // Lặp tìm các block action JSON
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
        }

        if (sanitizedPayload) {
          proposedActions.push({
            id: json.id || `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            type: json.type,
            payload: sanitizedPayload,
            label: json.label.slice(0, 80),
          });
        }
      }
    } catch {
      // Ignore invalid JSON action blocks
    }
  }

  // Tách văn bản phản hồi thông thường ra
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
    return {
      message: err.message,
      errorCode: err.errorCode,
    };
  }

  // Phân tích và validate schema proposed actions từ kết quả LLM
  return parseAndValidateAIResponse(result.message);
}
