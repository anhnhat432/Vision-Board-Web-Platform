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

function formatAssistantResponse(input: {
  action: string;
  reason: string;
  tenMinuteAction: string;
}): string {
  return [
    `Việc nên làm ngay: ${input.action}`,
    `Lý do: ${input.reason}`,
    `Nếu chỉ có 10 phút: ${input.tenMinuteAction}`,
  ].join("\n\n");
}

function buildTodayResponse(ctx: AssistantContext): string {
  const tasks = ctx.todayTasks || [];

  if (tasks.length === 0) {
    return formatAssistantResponse({
      action: "Bạn chưa có task nào cho hôm nay. Nếu đã có mục tiêu, hãy vào hệ thống 12 tuần để chọn một việc nhỏ có thể làm ngay.",
      reason: "Assistant chưa thấy dữ liệu task hôm nay trong máy của bạn.",
      tenMinuteAction: "Mở kế hoạch 12 tuần và viết ra 1 việc nhỏ nhất cho hôm nay.",
    });
  }

  const displayTasks = tasks.slice(0, 5);
  const lines = displayTasks.map((task) => `- ${task.title}${task.done ? " (đã xong)" : ""}`);
  const firstOpenTask = displayTasks.find((task) => !task.done) ?? displayTasks[0];

  return formatAssistantResponse({
    action: `Ưu tiên danh sách việc hôm nay (${tasks.length} task):\n${lines.join("\n")}`,
    reason: "Đây là các việc đang gắn với ngày hôm nay trong kế hoạch hiện tại của bạn.",
    tenMinuteAction: `Mở việc "${firstOpenTask.title}" và làm bước nhỏ đầu tiên.`,
  });
}

function buildWeekResponse(ctx: AssistantContext): string {
  const currentWeek = ctx.currentWeek;
  const weeksTotal = ctx.weeksTotal || 12;
  const topGoal = ctx.goals && ctx.goals.length > 0 ? ctx.goals[0].title : "mục tiêu chính";

  if (currentWeek === null) {
    return formatAssistantResponse({
      action: `Bắt đầu tạo 12-week plan cho ${topGoal}.`,
      reason: "Bạn chưa có 12-week plan active nên assistant chưa có tuần hiện tại để tóm tắt.",
      tenMinuteAction: "Viết outcome 12 tuần và chọn 1 lead indicator dễ đo.",
    });
  }

  const review = ctx.latestWeeklyReview;
  const reviewReason = review?.mainObstacle
    ? `Review gần nhất ghi nhận điểm kẹt là: ${review.mainObstacle}.`
    : `Bạn đang ở tuần ${currentWeek}/${weeksTotal}.`;

  return formatAssistantResponse({
    action: `Rà soát tuần ${currentWeek}/${weeksTotal} và chọn 1 việc quan trọng nhất cho ${topGoal}.`,
    reason: reviewReason,
    tenMinuteAction: "Tick lại việc đã xong, rồi chọn 1 task còn mở để làm ngay.",
  });
}

function buildGoalsResponse(ctx: AssistantContext): string {
  const goals = ctx.goals || [];

  if (goals.length === 0) {
    return formatAssistantResponse({
      action: "Bắt đầu ở bước SMART goal để tạo một mục tiêu đủ rõ cho 12 tuần.",
      reason: "Bạn chưa đặt mục tiêu nào trong dữ liệu hiện tại.",
      tenMinuteAction: "Viết một câu: Tôi muốn đạt điều gì trong 12 tuần tới?",
    });
  }

  const lines = goals.map((goal) => `- ${goal.title} — ${goal.progress}%`);

  return formatAssistantResponse({
    action: `Mục tiêu của bạn:\n${lines.join("\n")}`,
    reason: "Đây là các mục tiêu đang có trong dữ liệu local của app.",
    tenMinuteAction: `Mở mục tiêu "${goals[0].title}" và chọn một hành động tiếp theo.`,
  });
}

function buildReflectionResponse(ctx: AssistantContext): string {
  const stuckReason = ctx.stuckSignals?.latestObstacle;
  const prompts = [
    "Hôm nay bạn học được gì?",
    "Việc nào khiến bạn tự hào nhất?",
    "Ngày mai bạn muốn ưu tiên điều gì?",
  ];

  return formatAssistantResponse({
    action: `Viết reflection ngắn với 3 câu hỏi:\n${prompts.map((prompt, index) => `${index + 1}. ${prompt}`).join("\n")}`,
    reason: stuckReason ? `Lần check-in gần nhất có điểm kẹt: ${stuckReason}.` : "Reflection giúp bạn chốt lại điều đã học và chọn bước tiếp theo.",
    tenMinuteAction: "Trả lời câu 1 và câu 3, mỗi câu một dòng.",
  });
}

function buildFallbackResponse(): string {
  return formatAssistantResponse({
    action: "Mình có thể giúp bạn chọn một hướng: xem việc hôm nay, tóm tắt tuần này, mục tiêu chính, hoặc gợi ý reflection.",
    reason: "Assistant cần một câu hỏi cụ thể hơn để bám vào core flow của app.",
    tenMinuteAction: "Gõ: Hôm nay tôi nên làm gì?",
  });
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
        response = buildReflectionResponse(ctx);
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
