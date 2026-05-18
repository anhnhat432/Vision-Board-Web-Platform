import type { AssistantContext } from "./assistantService";

export function buildSystemPrompt(): string {
  return `Bạn là Cú — coach 12-week của người dùng trong ứng dụng Vision Board.

Phong cách:
- Bình tĩnh, khích lệ, nói thẳng vào ý.
- Tiếng Việt tự nhiên, không công thức cứng.
- Mỗi câu trả lời tối đa khoảng 150 từ.

Phân biệt 3 loại câu hỏi và format phù hợp:

CÂU HỎI ĐỊNH NGHĨA / KIẾN THỨC ("X là gì", "giải thích Y"):
→ Trả lời tự nhiên 2-4 câu. KHÔNG dùng format đánh số. KHÔNG nói "Việc nên làm ngay".

CÂU HỎI XIN GỢI Ý HÀNH ĐỘNG ("hôm nay làm gì", "tôi nên gì tiếp", "đang kẹt", "review tuần"):
→ Dùng format 3 phần:
Việc nên làm ngay: 1-3 việc cụ thể.
Lý do: dựa trên context cụ thể của user.
Nếu chỉ có 10 phút: 1 bước nhỏ để bắt đầu.

CHÀO HỎI / NÓI CHUYỆN NGẮN ("hi", "cảm ơn", "chào Cú"):
→ 1-2 câu thân mật. Có thể gợi mở 1 câu hỏi tiếp theo nếu hợp lý.

Khi user đang ở trang setup/form:
- Dùng Page context để hiểu họ đang điền phần nào và bước kế tiếp là gì.
- Nếu có phần còn thiếu, ưu tiên giúp họ điền phần đó bằng gợi ý có thể chỉnh sửa.
- Không biến gợi ý thành sự thật về user; nói rõ đó là đề xuất nếu dữ liệu chưa có.

Ràng buộc:
- Chỉ dùng context được cung cấp. Nếu thiếu data, nói THẲNG "Mình chưa thấy [X] trong dữ liệu của bạn" — KHÔNG bịa mục tiêu, task, tiến độ, billing, hay tài khoản.
- Không khuyên y tế, pháp lý, tài chính như chuyên gia.
- Không yêu cầu user chia sẻ thông tin nhạy cảm.
- Không dùng từ ngữ demo trong real mode.

Ví dụ:

User: "SMART là gì?"
Cú: "SMART là khung đặt mục tiêu: Specific, Measurable, Achievable, Relevant, Time-bound. Trong Vision Board, bạn dùng nó ở bước SMART Goal để biến ý tưởng thành mục tiêu rõ ràng cho 12 tuần."

User: "Hôm nay tôi nên làm gì?"
Cú:
Việc nên làm ngay: Hoàn thành "[task title từ context]".
Lý do: Đây là task cốt lõi đang mở trong tuần [N] của bạn.
Nếu chỉ có 10 phút: Đọc lại 1 paragraph và viết 2 câu tóm tắt.

User: "Chào Cú"
Cú: "Chào bạn. Tuần này tiến độ thế nào, mình rà lại 1 việc cụ thể nhé?"`;
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

  const trendParts: string[] = [];
  if (context.trend?.completionLast4Weeks && context.trend.completionLast4Weeks.length > 0) {
    const completionStr = context.trend.completionLast4Weeks.join("%, ");
    trendParts.push(`Trend 4 tuần: ${completionStr}% (${context.trend.direction === "up" ? "đang tăng" : context.trend.direction === "down" ? "đang giảm" : "ổn định"})`);
  }

  const streakParts: string[] = [];
  if (context.streak?.daysWithCompletedTask && context.streak.daysWithCompletedTask > 0) {
    streakParts.push(`Streak: ${context.streak.daysWithCompletedTask} ngày liên tiếp có task xong`);
  }

  const deadlineParts: string[] = [];
  if (context.upcomingDeadlines && context.upcomingDeadlines.length > 0) {
    const deadlineStr = context.upcomingDeadlines
      .slice(0, 3)
      .map((d) => `${d.title} (${d.daysUntil} ngày)`)
      .join(", ");
    deadlineParts.push(`Deadlines sắp tới: ${deadlineStr}`);
  }

  const page = context.pageContext;
  const draft = page?.formDraft ?? {};
  const pageParts = page
    ? [
      `Page step: ${page.currentStep ?? "Chưa xác định"}`,
      page.nextSuggestedStep ? `next: ${page.nextSuggestedStep}` : null,
      draft.focusArea ? `focus area: ${draft.focusArea}` : null,
      draft.smartGoalTitle ? `SMART title: ${draft.smartGoalTitle}` : null,
      draft.smartGoalMetric ? `SMART metric: ${draft.smartGoalMetric}` : null,
      draft.missingSmartGoalFields?.length
        ? `missing SMART: ${draft.missingSmartGoalFields.join(", ")}`
        : null,
      typeof draft.feasibilityAnsweredCount === "number"
        ? `feasibility answers: ${draft.feasibilityAnsweredCount}`
        : null,
      draft.feasibilityBottleneck ? `page bottleneck: ${draft.feasibilityBottleneck}` : null,
      typeof draft.goalCount === "number" ? `goals count: ${draft.goalCount}` : null,
      typeof draft.goalsWithoutTwelveWeekPlan === "number"
        ? `goals without 12-week plan: ${draft.goalsWithoutTwelveWeekPlan}`
        : null,
      draft.activeGoalTitle ? `active goal: ${draft.activeGoalTitle}` : null,
    ].filter(Boolean)
    : [];

  const setupSummary = draft.twelveWeekDraftSummary
    ? [
      `lead indicators: ${draft.twelveWeekDraftSummary.leadIndicatorCount}`,
      `has review day: ${draft.twelveWeekDraftSummary.hasReviewDay ? "yes" : "no"}`,
      `has week 12 outcome: ${draft.twelveWeekDraftSummary.hasWeek12Outcome ? "yes" : "no"}`,
      `has lag metric: ${draft.twelveWeekDraftSummary.hasLagMetric ? "yes" : "no"}`,
      draft.twelveWeekDraftSummary.tacticLoadPreference
        ? `load: ${draft.twelveWeekDraftSummary.tacticLoadPreference}`
        : null,
      draft.twelveWeekDraftSummary.personalConstraint
        ? `constraint: ${draft.twelveWeekDraftSummary.personalConstraint}`
        : null,
    ].filter(Boolean)
    : [];

  return [
    "Context người dùng:",
    `- Route: ${context.route}`,
    `- Page context: ${pageParts.join("; ") || "Chưa có"}`,
    `- 12-week setup draft: ${setupSummary.join("; ") || "Chưa có"}`,
    `- Tuần hiện tại: ${context.currentWeek ?? "Chưa có 12-week plan"} / ${context.weeksTotal}`,
    `- Mục tiêu: ${goals || "Chưa có"}`,
    `- Việc hôm nay: ${tasks || "Chưa có"}`,
    `- Feasibility: ${feasibilityParts.join("; ") || "Chưa có"}`,
    `- Weekly review gần nhất: ${reviewParts.join("; ") || "Chưa có"}`,
    `- Điểm kẹt gần nhất: ${context.stuckSignals.latestObstacle ?? "Chưa có"}`,
    `- Cam kết bị lỡ: ${missedCommitments || "Chưa có"}`,
    `- Task quá hạn: ${context.stuckSignals.overdueOpenCount} task mở${overdueTasks ? `; ${overdueTasks}` : ""}`,
    `- Reflection gần nhất: ${context.lastReflectionDate ?? "Chưa có"}`,
    ...trendParts,
    ...streakParts,
    ...deadlineParts,
  ].join("\n");
}
