import { isRealMode } from "../../utils/app-mode";
import type { AssistantContext } from "./buildAssistantContext";
import type { AssistantAction } from "./parseActions";
import type { ChatHistoryMessage } from "./types";

const isTestEnv = typeof process !== "undefined" && process.env.NODE_ENV === "test";

async function waitDelay(): Promise<void> {
  if (isTestEnv) return;
  const delay = 400 + Math.floor(Math.random() * 400);
  await new Promise((resolve) => setTimeout(resolve, delay));
}

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

  if (
    /(^|\s)(là gì|nghĩa là|giải thích|định nghĩa|smart là|okr là|12-week là|12 tuần là|reflection là)(\s|[!.?,]|$)/.test(
      lower,
    )
  ) {
    return "definition";
  }

  if (/\b(hôm nay|today|task|việc)\b/.test(lower)) return "today";
  if (/\b(tuần|week|progress|tiến độ)\b/.test(lower)) return "week";
  if (/\b(mục tiêu|goal)\b/.test(lower)) return "goals";
  if (/\b(reflection|review|nhìn lại|nhật ký)\b/.test(lower)) return "reflection";

  return "fallback";
}

function formatAssistantResponse(input: { action: string; reason: string; tenMinuteAction: string }): string {
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
      action:
        "Bạn chưa có task nào cho hôm nay. Nếu đã có mục tiêu, hãy vào hệ thống 12 tuần để chọn một việc nhỏ có thể làm ngay.",
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
      reason: "Bạn chưa đặt mục tiêu nào trong dữ liệu hiện tại, hiện chưa có mục tiêu nào.",
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
  const prompts = ["Hôm nay bạn học được gì?", "Việc nào khiến bạn tự hào nhất?", "Ngày mai bạn muốn ưu tiên điều gì?"];

  return formatAssistantResponse({
    action: `Viết reflection ngắn với 3 câu hỏi:\n${prompts.map((prompt, index) => `${index + 1}. ${prompt}`).join("\n")}`,
    reason: stuckReason
      ? `Lần check-in gần nhất có điểm kẹt: ${stuckReason}.`
      : "Reflection giúp bạn chốt lại điều đã học và chọn bước tiếp theo.",
    tenMinuteAction: "Trả lời câu 1 và câu 3, mỗi câu một dòng.",
  });
}

function buildFallbackResponse(): string {
  return formatAssistantResponse({
    action:
      "Mình có thể giúp bạn chọn một hướng: xem việc hôm nay, tóm tắt tuần này, mục tiêu chính, hoặc gợi ý reflection.",
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

type AssistantTaskCandidate = {
  id: string;
  title: string;
  done: boolean;
  scheduledDate?: string;
  isCore?: boolean;
};

type AssistantActionDraft = Omit<AssistantAction, "id">;

const TASK_QUERY_STOPWORDS = new Set([
  "task",
  "viec",
  "nhiem",
  "vu",
  "cong",
  "hom",
  "nay",
  "today",
  "tick",
  "mark",
  "done",
  "complete",
  "completed",
  "hoan",
  "thanh",
  "xong",
  "dong",
  "danh",
  "dau",
  "bo",
  "uncheck",
  "undo",
  "cai",
  "so",
  "thu",
  "dau",
  "tien",
  "het",
  "tat",
  "ca",
]);

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeTaskQuery(text: string): string[] {
  return normalizeText(text)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !TASK_QUERY_STOPWORDS.has(token));
}

function uniqueTaskCandidates(candidates: AssistantTaskCandidate[]): AssistantTaskCandidate[] {
  const seen = new Set<string>();
  const unique: AssistantTaskCandidate[] = [];
  for (const candidate of candidates) {
    if (seen.has(candidate.id)) continue;
    seen.add(candidate.id);
    unique.push(candidate);
  }
  return unique;
}

function getTaskCandidates(ctx: AssistantContext): AssistantTaskCandidate[] {
  return uniqueTaskCandidates([
    ...(ctx.todayTasks || []).map((task) => ({
      id: task.id,
      title: task.title,
      done: task.done,
    })),
    ...(ctx.stuckSignals?.overdueTasks || []).map((task) => ({
      id: task.id,
      title: task.title,
      done: false,
      scheduledDate: task.scheduledDate,
      isCore: task.isCore,
    })),
  ]);
}

function detectOrdinalIndex(text: string, maxLength: number): number | null {
  const normalized = normalizeText(text);
  const numericMatch = normalized.match(/\b(?:so|cai|task|viec|thu)?\s*(\d{1,2})\b/);
  if (numericMatch) {
    const index = Number(numericMatch[1]) - 1;
    if (index >= 0 && index < maxLength) return index;
  }

  const ordinals: Array<[RegExp, number]> = [
    [/\b(dau tien|thu nhat|mot)\b/, 0],
    [/\b(thu hai|hai)\b/, 1],
    [/\b(thu ba|ba)\b/, 2],
    [/\b(thu tu|bon|tu)\b/, 3],
    [/\b(thu nam|nam)\b/, 4],
  ];

  for (const [pattern, index] of ordinals) {
    if (index < maxLength && pattern.test(normalized)) return index;
  }

  return null;
}

function scoreTaskMatch(userText: string, task: AssistantTaskCandidate): number {
  const normalizedQuery = normalizeText(userText);
  const normalizedTitle = normalizeText(task.title);
  if (!normalizedTitle) return 0;
  if (normalizedQuery.includes(normalizeText(task.id))) return 120;
  if (normalizedQuery.includes(normalizedTitle)) return 100;

  const queryTokens = tokenizeTaskQuery(userText);
  if (queryTokens.length === 0) return 0;

  const titleTokens = new Set(tokenizeTaskQuery(task.title));
  const overlap = queryTokens.filter((token) => titleTokens.has(token) || normalizedTitle.includes(token));
  if (overlap.length === 0) return 0;

  const queryCoverage = overlap.length / queryTokens.length;
  const titleCoverage = titleTokens.size > 0 ? overlap.length / titleTokens.size : 0;
  return Math.round(queryCoverage * 70 + titleCoverage * 30);
}

function resolveTaskReference(
  userText: string,
  candidates: AssistantTaskCandidate[],
): AssistantTaskCandidate | null {
  if (candidates.length === 0) return null;

  const ordinalIndex = detectOrdinalIndex(userText, candidates.length);
  if (ordinalIndex !== null) return candidates[ordinalIndex];

  const scored = candidates
    .map((task) => ({ task, score: scoreTaskMatch(userText, task) }))
    .sort((left, right) => right.score - left.score);

  const best = scored[0];
  const second = scored[1];
  if (!best || best.score < 40) return null;
  if (second && best.score - second.score < 10) return null;
  return best.task;
}

function hasBulkTaskIntent(text: string): boolean {
  const normalized = normalizeText(text);
  return /\b(tick het|xong het|hoan thanh het|tat ca|all)\b/.test(normalized);
}

function buildActionBlock(action: AssistantActionDraft): string {
  return `\`\`\`action\n${JSON.stringify(action, null, 2)}\n\`\`\``;
}

function buildMarkDoneActionBlock(task: AssistantTaskCandidate, autoExecute: boolean): string {
  return buildActionBlock({
    type: "mark_task_done",
    payload: {
      taskId: task.id,
      done: true,
    },
    label: `Hoàn thành: ${task.title}`,
    autoExecute,
  });
}

function buildUnmarkDoneActionBlock(task: AssistantTaskCandidate, autoExecute: boolean): string {
  return buildActionBlock({
    type: "update_task_status",
    payload: {
      taskId: task.id,
      completed: false,
    },
    label: `Bỏ hoàn thành: ${task.title}`,
    autoExecute,
  });
}

function formatTaskChoices(tasks: AssistantTaskCandidate[]): string {
  return tasks
    .slice(0, 7)
    .map((task, index) => `${index + 1}. ${task.title}${task.done ? " (đã xong)" : ""}`)
    .join("\n");
}

export const mockProvider: AssistantProvider = {
  async send(userText: string, ctx: AssistantContext, _history?: ChatHistoryMessage[]): Promise<string> {
    const lower = userText.toLowerCase().trim();
    const intent = detectIntent(userText);

    // Xử lý câu hỏi dựa trên retrievedKnowledge
    if (intent !== "today" && ctx.retrievedKnowledge && ctx.retrievedKnowledge.length > 0) {
      if (lower.includes("kẹt") || lower.includes("trở ngại") || lower.includes("obstacle")) {
        const obstacles = ctx.retrievedKnowledge.filter(
          (k) => k.source === "weekly_review" || k.snippet.toLowerCase().includes("trở ngại") || k.snippet.toLowerCase().includes("obstacle")
        );
        if (obstacles.length > 0) {
          await waitDelay();
          return `Dựa trên lịch sử của bạn, trở ngại trước đây là: ${obstacles[0].snippet}`;
        }
      }
      if (lower.includes("toeic")) {
        const toeicGoals = ctx.retrievedKnowledge.filter(
          (k) => k.title.toLowerCase().includes("toeic") || k.snippet.toLowerCase().includes("toeic")
        );
        if (toeicGoals.length > 0) {
          await waitDelay();
          return `Dựa trên dữ liệu tìm được, bạn có mục tiêu TOEIC sau: ${toeicGoals[0].snippet}`;
        }
      }
    }

    // Nếu hỏi về trở ngại cũ hoặc toeic mà retrievedKnowledge trống/không tìm thấy
    if (lower.includes("kẹt") || lower.includes("trở ngại") || lower.includes("obstacle") || lower.includes("toeic")) {
      const hasObs = ctx.retrievedKnowledge?.some(
        (k) => k.source === "weekly_review" || k.snippet.toLowerCase().includes("trở ngại") || k.snippet.toLowerCase().includes("obstacle")
      );
      const hasToeic = ctx.retrievedKnowledge?.some(
        (k) => k.title.toLowerCase().includes("toeic") || k.snippet.toLowerCase().includes("toeic")
      );

      if (intent !== "today" && lower.includes("toeic") && !hasToeic) {
        await waitDelay();
        return "Mình chưa thấy mục tiêu hay thông tin nào liên quan đến TOEIC trong dữ liệu của bạn.";
      }
      if (intent !== "today" && (lower.includes("kẹt") || lower.includes("trở ngại") || lower.includes("obstacle")) && !hasObs) {
        await waitDelay();
        return "Mình không thấy thông tin trở ngại cũ nào trong dữ liệu của bạn.";
      }
    }

    // 1. Kiểm tra cảnh báo từ chối hiểu sai ngữ cảnh của memory (case 8)
    const hasWrongContextPattern = ctx.assistantMemory?.rejectedPatterns?.some((p) => p.toLowerCase().includes("ngữ cảnh"));
    if (hasWrongContextPattern && (lower.includes("mục tiêu") || lower.includes("goal"))) {
      await waitDelay();
      return "Bạn muốn thiết lập mục tiêu thuộc lĩnh vực nào cụ thể? Vui lòng làm rõ giúp mình.";
    }

    // 2. Ý định dời lịch task (reschedule task) - case 6 & case 10
    const isRescheduleIntent = /dời|hoãn|chuyển lịch|reschedule/.test(lower) && /task|việc|nhiệm vụ|công việc/.test(lower);
    if (isRescheduleIntent) {
      const openTasks = getTaskCandidates(ctx).filter((task) => !task.done);
      const matchTask = resolveTaskReference(userText, openTasks);
      if (matchTask) {
        const actionBlock = buildActionBlock({
          type: "reschedule_task",
          payload: {
            taskId: matchTask.id,
            scheduledDate: "tomorrow",
          },
          label: `Dời lịch: ${matchTask.title}`,
        });
        await waitDelay();
        return `Tôi đã tìm thấy công việc: **"${matchTask.title}"**. Bạn có muốn dời lịch công việc này sang ngày mai không?\n\n${actionBlock}`;
      }
      await waitDelay();
      return "Bạn muốn dời lịch của task nào cụ thể? Vui lòng cung cấp tên task nhé.";
    }

    // 3. Ý định bỏ đánh dấu task (update task status to false) - case 11
    const isUncheckIntent =
      /bỏ tick|bỏ đánh dấu|chưa xong|chưa hoàn thành|undo|uncheck/.test(lower) &&
      /task|việc|nhiệm vụ|công việc/.test(lower);
    if (isUncheckIntent) {
      const allTasks = getTaskCandidates(ctx);
      const completedTasks = allTasks.filter((task) => task.done);
      const matchTask = resolveTaskReference(userText, allTasks);
      if (matchTask) {
        if (!matchTask.done) {
          await waitDelay();
          return `Task **"${matchTask.title}"** hiện chưa được đánh dấu hoàn thành, nên mình không cần bỏ tick.`;
        }
        const actionBlock = buildUnmarkDoneActionBlock(matchTask, true);
        await waitDelay();
        return `Mình đã xác định task **"${matchTask.title}"** và sẽ bỏ đánh dấu hoàn thành.\n\n${actionBlock}`;
      }
      if (completedTasks.length === 1) {
        const task = completedTasks[0];
        const actionBlock = buildUnmarkDoneActionBlock(task, true);
        await waitDelay();
        return `Mình thấy chỉ có một task đang hoàn thành: **"${task.title}"**. Mình sẽ bỏ đánh dấu task này.\n\n${actionBlock}`;
      }
      if (completedTasks.length > 1) {
        await waitDelay();
        return `Bạn muốn bỏ đánh dấu task nào?\n${formatTaskChoices(completedTasks)}`;
      }
      await waitDelay();
      return "Mình chưa thấy task nào đang được đánh dấu hoàn thành để bỏ tick.";
    }

    // 4. Ý định tạo task (create task) - case 9
    const isCreateTaskIntent = (lower.includes("tạo") || lower.includes("thêm")) && (lower.includes("task") || lower.includes("việc") || lower.includes("nhiệm vụ")) && !lower.includes("mục tiêu") && !lower.includes("goal");
    if (isCreateTaskIntent) {
      let taskTitle = "Công việc mới";
      const match = userText.match(/(?:task|việc|nhiệm vụ)\s+(.+)/i);
      if (match?.[1]) {
        taskTitle = match[1].trim().replace(/[?.!]/g, "");
      }
      const actionBlock = `\`\`\`action
{
  "type": "create_task",
  "payload": {
    "title": "${taskTitle}",
    "scheduledDate": "today",
    "isCore": false
  },
  "label": "Thêm task: ${taskTitle}"
}
\`\`\``;
      await waitDelay();
      return `Đã đề xuất thêm task mới **"${taskTitle}"** vào ngày hôm nay.\n\n${actionBlock}`;
    }

    // Check if user wants to mark task as done
    const isTickIntent =
      /tick|hoàn thành|xong|đóng|đánh dấu|mark|done|complete/.test(lower) &&
      /task|việc|nhiệm vụ|công việc/.test(lower);

    if (isTickIntent) {
      // 1. Kiểm tra xem người dùng có 12-week plan không
      const hasPlan = ctx.currentWeek !== null;
      if (!hasPlan) {
        const response =
          "Bạn chưa có kế hoạch 12 tuần nào đang hoạt động, do đó không có công việc nào để hoàn thành. Hãy bắt đầu bằng cách tạo mục tiêu và thiết lập kế hoạch 12 tuần trước nhé.";
        await waitDelay();
        return response;
      }

      const allTasks = getTaskCandidates(ctx);
      const uniqueOpen = allTasks.filter((task) => !task.done);

      const resolvedTask = resolveTaskReference(userText, allTasks);
      if (resolvedTask) {
        if (resolvedTask.done) {
          await waitDelay();
          return `Task **"${resolvedTask.title}"** đã hoàn thành từ trước rồi.`;
        }
        const actionBlock = buildMarkDoneActionBlock(resolvedTask, true);
        await waitDelay();
        return `Mình đã xác định task **"${resolvedTask.title}"** và sẽ đánh dấu hoàn thành.\n\n${actionBlock}`;
      }

      if (uniqueOpen.length === 0) {
        const response = "Hiện tại không có công việc nào chưa hoàn thành để đánh dấu hoàn thành.";
        await waitDelay();
        return response;
      }

      if (hasBulkTaskIntent(userText)) {
        await waitDelay();
        return `Mình chưa tick hàng loạt để tránh đánh dấu nhầm. Bạn hãy chọn một task cụ thể:\n${formatTaskChoices(
          uniqueOpen,
        )}`;
      }

      // 3. Nếu chỉ có đúng 1 task chưa hoàn thành
      if (uniqueOpen.length === 1) {
        const task = uniqueOpen[0];
        const actionBlock = buildMarkDoneActionBlock(task, true);
        let response = `Mình thấy chỉ có một công việc chưa hoàn thành: **"${task.title}"**. Mình sẽ đánh dấu hoàn thành task này.\n\n${actionBlock}`;
        if (firstCallInSession && !isRealMode()) {
          firstCallInSession = false;
          response += "\n\n_(Đây là chế độ demo, gợi ý mang tính tham khảo.)_";
        }
        await waitDelay();
        return response;
      }

      // 4. Nếu có nhiều hơn 1 task chưa hoàn thành, liệt kê và đề xuất nút bấm cho từng task (tối đa 3)
      const lines = uniqueOpen.map((task) => `- ${task.title}`);
      const proposed = uniqueOpen.slice(0, 3);
      const actionBlocks = proposed
        .map((task) => buildMarkDoneActionBlock(task, false))
        .join("\n\n");

      let response = `Tôi thấy bạn có nhiều công việc chưa hoàn thành:\n${lines.join(
        "\n",
      )}\n\nBạn muốn đánh dấu hoàn thành công việc nào? Hãy nhấn nút **Đồng ý** tương ứng bên dưới, hoặc nói rõ tên task:\n\n${actionBlocks}`;

      if (firstCallInSession && !isRealMode()) {
        firstCallInSession = false;
        response += "\n\n_(Đây là chế độ demo, gợi ý mang tính tham khảo.)_";
      }

      await waitDelay();
      return response;
    }

    // Check if user wants to create a goal
    if ((lower.includes("tạo") || lower.includes("thêm")) && (lower.includes("mục tiêu") || lower.includes("goal"))) {
      let goalTitle = "Mục tiêu mới";
      const match = userText.match(/(?:mục tiêu|goal)\s+(.+)/i);
      if (match?.[1]) {
        goalTitle = match[1].trim().replace(/[?.!]/g, "");
      }

      const category =
        lower.includes("sức khỏe") || lower.includes("thể thao") || lower.includes("tập")
          ? "health"
          : lower.includes("học") || lower.includes("thi") || lower.includes("sự nghiệp") || lower.includes("làm")
            ? "career"
            : lower.includes("tiền") || lower.includes("tài chính") || lower.includes("mua")
              ? "finance"
              : lower.includes("yêu") || lower.includes("bạn") || lower.includes("gia đình")
                ? "relationships"
                : "personal";

      const actionBlock = `\`\`\`action
{
  "type": "create_goal",
  "payload": {
    "title": "${goalTitle}",
    "category": "${category}",
    "description": "Được tạo nhanh từ hội thoại với Trợ lý AI"
  },
  "label": "Tạo mục tiêu: ${goalTitle}"
}
\`\`\``;

      let response = `Mình hiểu bạn đang muốn tạo mục tiêu mới: **"${goalTitle}"**.\n\nĐể thực hiện điều này, bạn chỉ cần nhấn vào nút **Đồng ý** ở bên dưới. Mình sẽ tạo nhanh mục tiêu này vào hệ thống của bạn.`;
      response += `\n\n${actionBlock}`;

      if (firstCallInSession && !isRealMode()) {
        firstCallInSession = false;
        response += "\n\n_(Đây là chế độ demo, gợi ý mang tính tham khảo.)_";
      }

      await waitDelay();
      return response;
    }

    let response: string;

    switch (intent) {
      case "today": {
        const openTasks = (ctx.todayTasks || []).filter((t) => !t.done);
        if (openTasks.length > 0) {
          const task = openTasks[0];
          const actionBlock = `\`\`\`action
{
  "type": "mark_task_done",
  "payload": {
    "taskId": "${task.id}",
    "done": true
  },
  "label": "Hoàn thành: ${task.title}"
}
\`\`\``;
          response = `${buildTodayResponse(ctx)}\n\n${actionBlock}`;
        } else {
          response = buildTodayResponse(ctx);
        }
        break;
      }
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

    const memory = ctx.assistantMemory;
    if (memory) {
      const responseHasActionBlocks = response.includes("```action");
      if (
        !responseHasActionBlocks &&
        (memory.preferredCoachingStyle === "brief" ||
          memory.preferredCoachingStyle === "direct" ||
          memory.rejectedPatterns?.some((p) => {
            const lp = p.toLowerCase();
            return lp.includes("quá dài") || lp.includes("rườm rà");
          }))
      ) {
        response = response.split("\n\n").slice(0, 2).join("\n\n") + "\n\n_(Phản hồi ngắn gọn theo sở thích của bạn)_";
      }
      if (memory.recurringObstacles?.some((o) => o.toLowerCase().includes("thiếu thời gian"))) {
        response += "\n\n**Mẹo nhỏ**: Nhận thấy bạn hay gặp trở ngại thiếu thời gian, hãy thử chia nhỏ task hôm nay ra thành các việc chỉ 10-15 phút nhé.";
      }
    }

    const isActionIntent = intent !== "definition" && intent !== "greeting";
    if (firstCallInSession && isActionIntent && !isRealMode()) {
      firstCallInSession = false;
      response += "\n\n_(Đây là chế độ demo, gợi ý mang tính tham khảo.)_";
    }

    await waitDelay();

    return response;
  },
};

export function resetAssistantSession(): void {
  firstCallInSession = true;
}
