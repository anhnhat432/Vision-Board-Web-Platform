import type { AssistantContext } from "./buildAssistantContext";
import type { ChatHistoryMessage } from "./types";

export interface AssistantProvider {
  send(userText: string, ctx: AssistantContext, history?: ChatHistoryMessage[]): Promise<string>;
}

type Intent = "today" | "week" | "goals" | "reflection" | "definition" | "greeting" | "fallback";

let firstCallInSession = true;

function detectIntent(text: string): Intent {
  const lower = text.toLowerCase().trim();

  if (/^(hi|hello|hey|chào|xin chào|chào cú|cảm ơn|thanks|thank you)(\s|[!.?,]|$)/.test(lower)) {
    return "greeting";
  }

  if (/(^|\s)(là gì|nghĩa là|giải thích|định nghĩa|smart là|okr là|12-week là|12 tuần là|reflection là)(\s|[!.?,]|$)/.test(lower)) {
    return "definition";
  }

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

function buildDefinitionResponse(userText: string): string {
  const lower = userText.toLowerCase();

  if (/smart/.test(lower)) {
    return "SMART là khung đặt mục tiêu: Specific (cụ thể), Measurable (đo được), Achievable (khả thi), Relevant (liên quan), Time-bound (có hạn). Trong Vision Board, bạn dùng nó ở bước SMART Goal để biến ý tưởng thành mục tiêu rõ ràng cho 12 tuần.";
  }

  if (/12.?week|12 tuần/.test(lower)) {
    return "12-week execution là hệ thống chia mục tiêu lớn thành chu kỳ 12 tuần, mỗi tuần có vài hành động dẫn dắt (lead indicator). Ý tưởng là 12 tuần đủ ngắn để giữ động lực, đủ dài để tạo thay đổi thực sự.";
  }

  if (/okr/.test(lower)) {
    return "OKR (Objectives and Key Results) là khung đặt mục tiêu định tính (Objective) đi kèm 2-5 kết quả định lượng (Key Results) để đo tiến độ. Khác SMART ở chỗ OKR cho phép mục tiêu tham vọng và đo bằng nhiều chỉ số.";
  }

  if (/reflection|nhật ký/.test(lower)) {
    return "Reflection là việc dừng lại nhìn lại đã làm gì, học được gì, điều chỉnh ra sao. Trong Vision Board, bạn viết reflection cuối tuần để chốt bài học và chọn ưu tiên cho tuần tới.";
  }

  return "Mình hiểu bạn đang muốn hỏi định nghĩa nhưng cần thêm chi tiết. Bạn muốn biết về khái niệm gì cụ thể — SMART, OKR, 12-week, hay reflection?";
}

function buildGreetingResponse(): string {
  const variations = [
    "Chào bạn. Tuần này tiến độ thế nào, mình rà lại 1 việc cụ thể nhé?",
    "Chào bạn. Bạn muốn xem việc hôm nay, tóm tắt tuần, hay gì khác?",
    "Chào nhé. Mình ở đây để giúp bạn đi tiếp trong chu kỳ 12 tuần.",
  ];
  return variations[Math.floor(Math.random() * variations.length)];
}

export const mockProvider: AssistantProvider = {
  async send(userText: string, ctx: AssistantContext, _history?: ChatHistoryMessage[]): Promise<string> {
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
      case "definition":
        response = buildDefinitionResponse(userText);
        break;
      case "greeting":
        response = buildGreetingResponse();
        break;
      default:
        response = buildFallbackResponse();
    }

    const isActionIntent = intent !== "definition" && intent !== "greeting";
    if (firstCallInSession && isActionIntent) {
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
