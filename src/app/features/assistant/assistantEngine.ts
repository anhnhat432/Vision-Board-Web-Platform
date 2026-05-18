import type { AssistantContext } from "./buildAssistantContext";

export interface AssistantProvider {
  send(userText: string, ctx: AssistantContext): Promise<string>;
}

type Intent = "today" | "week" | "goals" | "reflection" | "fallback";

let firstCallInSession = true;

function detectIntent(text: string): Intent {
  const lower = text.toLowerCase();

  if (/\b(hôm nay|today|task|việc)\b/.test(lower)) return "today";
  if (/\b(tuần|week|progress|tiến độ)\b/.test(lower)) return "week";
  if (/\b(mục tiêu|goal)\b/.test(lower)) return "goals";
  if (/\b(reflection|review|nhìn lại|nhật ký)\b/.test(lower)) return "reflection";

  return "fallback";
}

function buildTodayResponse(ctx: AssistantContext): string {
  const tasks = ctx.todayTasks || [];

  if (tasks.length === 0) {
    return "Bạn chưa có task nào cho hôm nay. Nếu bạn đã có mục tiêu, hãy vào hệ thống 12 tuần để chọn một việc nhỏ có thể làm ngay.";
  }

  const displayTasks = tasks.slice(0, 5);
  const lines = displayTasks.map((task) => `- ${task.title}${task.done ? " (đã xong)" : ""}`);

  const variants = [
    `Hôm nay bạn có ${tasks.length} việc:\n${lines.join("\n")}`,
    `Danh sách việc hôm nay (${tasks.length} task):\n${lines.join("\n")}`,
  ];

  return variants[Math.floor(Math.random() * variants.length)];
}

function buildWeekResponse(ctx: AssistantContext): string {
  const currentWeek = ctx.currentWeek;
  const weeksTotal = ctx.weeksTotal || 12;
  const topGoal = ctx.goals && ctx.goals.length > 0 ? ctx.goals[0].title : "mục tiêu chính";

  if (currentWeek === null) {
    return `Bạn chưa có 12-week plan active. Đây là lúc tốt để bắt đầu với ${topGoal}.`;
  }

  const variants = [
    `Bạn đang ở tuần ${currentWeek}/${weeksTotal}. Hôm nay là lúc tốt để rà soát ${topGoal}.`,
    `Tuần ${currentWeek} của ${weeksTotal} tuần. Hãy dành chút thời gian check-in với ${topGoal}.`,
  ];

  return variants[Math.floor(Math.random() * variants.length)];
}

function buildGoalsResponse(ctx: AssistantContext): string {
  const goals = ctx.goals || [];

  if (goals.length === 0) {
    return "Bạn chưa đặt mục tiêu nào. Hãy bắt đầu ở bước SMART goal để có một mục tiêu đủ rõ cho 12 tuần.";
  }

  const lines = goals.map((goal) => `- ${goal.title} — ${goal.progress}%`);

  const variants = [
    `Mục tiêu của bạn:\n${lines.join("\n")}`,
    `Danh sách mục tiêu:\n${lines.join("\n")}`,
  ];

  return variants[Math.floor(Math.random() * variants.length)];
}

function buildReflectionResponse(): string {
  const prompts = [
    "Hôm nay bạn học được gì?",
    "Việc nào khiến bạn tự hào nhất?",
    "Ngày mai bạn muốn ưu tiên điều gì?",
  ];

  return `Gợi ý reflection:\n${prompts.map((prompt, index) => `${index + 1}. ${prompt}`).join("\n")}`;
}

function buildFallbackResponse(): string {
  const greetings = [
    "Chào bạn, mình có thể giúp gì?",
    "Bạn cần hỗ trợ gì không?",
    "Mình đây. Bạn muốn xem việc hôm nay, tiến độ tuần này, hay reflection?",
  ];

  const greeting = greetings[Math.floor(Math.random() * greetings.length)];

  return `${greeting}\n\nMình có thể giúp bạn:\n1. Xem việc hôm nay\n2. Tóm tắt tuần này\n3. Liệt kê mục tiêu\n4. Gợi ý reflection`;
}

export const mockProvider: AssistantProvider = {
  async send(userText: string, ctx: AssistantContext): Promise<string> {
    const intent = detectIntent(userText);
    let response: string;

    switch (intent) {
      case "today":
        response = buildTodayResponse(ctx);
        break;
      case "week":
        response = buildWeekResponse(ctx);
        break;
      case "goals":
        response = buildGoalsResponse(ctx);
        break;
      case "reflection":
        response = buildReflectionResponse();
        break;
      default:
        response = buildFallbackResponse();
    }

    if (firstCallInSession) {
      firstCallInSession = false;
      response += "\n\n_(Đây là chế độ demo, gợi ý mang tính tham khảo.)_";
    }

    const delay = 400 + Math.floor(Math.random() * 400);
    await new Promise((resolve) => setTimeout(resolve, delay));

    return response;
  },
};

export function resetAssistantSession(): void {
  firstCallInSession = true;
}
