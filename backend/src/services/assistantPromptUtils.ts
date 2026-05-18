import type { AssistantContext } from "./assistantService";

export function buildSystemPrompt(): string {
  return `Bạn là trợ lý AI trong ứng dụng Vision Board Web Platform.

Nhiệm vụ:
- Trả lời bằng tiếng Việt.
- Trả lời ngắn gọn, rõ ràng, thực tế, tối đa khoảng 150 từ.
- Chỉ dựa vào context được cung cấp. Nếu thiếu dữ liệu, nói rõ là chưa có đủ dữ liệu.
- Ưu tiên giúp người dùng đi tiếp trong core flow: onboarding, life balance, life insight, SMART goal, feasibility, 12-week plan, weekly execution, reflection.
- Không bịa mục tiêu, task, tiến độ, trạng thái đồng bộ, thanh toán, hoặc tài khoản.
- Không dùng copy demo trong real mode.
- Không đưa lời khuyên y tế, pháp lý, tài chính như chuyên gia.
- Không yêu cầu người dùng chia sẻ thông tin nhạy cảm.

Quyết định format dựa trên ý định người dùng:
- Khi user xin gợi ý hành động ("hôm nay làm gì", "nên làm gì tiếp", "đang kẹt", "review tuần"): dùng format 3 phần
  1. Việc nên làm ngay: chọn 1-3 việc cụ thể nhất.
  2. Lý do: giải thích ngắn dựa trên context.
  3. Nếu chỉ có 10 phút: đưa một bước rất nhỏ để bắt đầu.
- Khi user hỏi định nghĩa/khái niệm/kiến thức ("X là gì", "giải thích Y"): trả lời tự nhiên, ngắn gọn 2-4 câu, KHÔNG dùng format 3 phần.
- Khi user chào hỏi/nói chuyện ngắn: trả lời tự nhiên 1-2 câu.

Phong cách:
- Ấm áp, bình tĩnh, cụ thể.
- Nếu có task hôm nay, task quá hạn, điểm kẹt, hoặc review gần nhất, hãy dùng các tín hiệu đó để ưu tiên.`;
}

export function summarizeContext(context: AssistantContext): string {
  const goals = context.goals
    .slice(0, 3)
    .map((goal) => `${goal.title || "Mục tiêu chưa đặt tên"} (${goal.progress}%)`)
    .join(", ");
  const tasks = context.todayTasks
    .slice(0, 5)
    .map((task) => `${task.title || "Việc chưa đặt tên"}${task.done ? " (đã xong)" : ""}`)
    .join(", ");
  const overdueTasks = context.stuckSignals.overdueTasks
    .slice(0, 5)
    .map((task) => `${task.title || "Việc quá hạn chưa đặt tên"} (${task.scheduledDate}${task.isCore ? ", cốt lõi" : ""})`)
    .join(", ");
  const missedCommitments = context.stuckSignals.missedCommitments.slice(0, 3).join(", ");
  const feasibilityParts = [
    context.feasibility?.readinessScore !== null && context.feasibility?.readinessScore !== undefined
      ? `readiness ${context.feasibility.readinessScore}/20`
      : null,
    context.feasibility?.bottleneckLabel ? `bottleneck: ${context.feasibility.bottleneckLabel}` : null,
    context.feasibility?.bottleneckAction ? `action: ${context.feasibility.bottleneckAction}` : null,
  ].filter(Boolean);
  const review = context.latestWeeklyReview;
  const reviewParts = review
    ? [
      `tuần ${review.weekNumber}`,
      review.leadCompletionPercent !== null ? `lead completion ${review.leadCompletionPercent}%` : null,
      review.mainObstacle ? `obstacle: ${review.mainObstacle}` : null,
      review.nextWeekPriority ? `next priority: ${review.nextWeekPriority}` : null,
      review.workloadDecision ? `workload: ${review.workloadDecision}` : null,
    ].filter(Boolean)
    : [];

  return [
    "Context người dùng:",
    `- Route: ${context.route}`,
    `- Tuần hiện tại: ${context.currentWeek ?? "Chưa có 12-week plan"} / ${context.weeksTotal}`,
    `- Mục tiêu: ${goals || "Chưa có"}`,
    `- Việc hôm nay: ${tasks || "Chưa có"}`,
    `- Feasibility: ${feasibilityParts.join("; ") || "Chưa có"}`,
    `- Weekly review gần nhất: ${reviewParts.join("; ") || "Chưa có"}`,
    `- Điểm kẹt gần nhất: ${context.stuckSignals.latestObstacle ?? "Chưa có"}`,
    `- Cam kết bị lỡ: ${missedCommitments || "Chưa có"}`,
    `- Task quá hạn: ${context.stuckSignals.overdueOpenCount} task mở${overdueTasks ? `; ${overdueTasks}` : ""}`,
    `- Reflection gần nhất: ${context.lastReflectionDate ?? "Chưa có"}`,
  ].join("\n");
}