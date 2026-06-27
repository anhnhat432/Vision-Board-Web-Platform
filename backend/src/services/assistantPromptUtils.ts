import type { AssistantContext } from "./assistantService";

export interface RoutePlaybook {
  id: string;
  matchKeywords: string[];
  guidance: string;
}

const PLAYBOOK_HEADER = "\n\nPLAYBOOK THEO MÀN HÌNH HIỆN TẠI:";

export const ROUTE_PLAYBOOKS: RoutePlaybook[] = [
  {
    id: "life-insight",
    matchKeywords: ["life-insight"],
    guidance:
      "- Life Insight: phản chiếu giá trị sống/focus area từ dữ liệu hiện có, giúp user viết insight thành 1-2 câu rõ ràng. Chỉ hỏi 1 câu còn thiếu; chưa nhảy sang SMART/12-week nếu user chưa yêu cầu.",
  },
  {
    id: "smart-goal",
    matchKeywords: ["smart-goal"],
    guidance:
      "- SMART Goal: ưu tiên làm rõ kết quả cụ thể, chỉ số đo, deadline và tính liên quan. Nếu có SMART Goal Quality, dùng warnings/suggestions để viết lại câu mục tiêu tốt hơn. Không tạo goal/action nếu category hoặc deadline còn mơ hồ.",
  },
  {
    id: "feasibility",
    matchKeywords: ["feasibility"],
    guidance:
      "- Feasibility: bám vào readiness/bottleneck trong context, đề xuất điều chỉnh nhỏ nhất để mục tiêu khả thi hơn. Không tự bịa điểm số; nếu thiếu dữ liệu, hỏi đúng 1 trường quan trọng nhất.",
  },
  {
    id: "12-week-setup",
    matchKeywords: ["12-week-setup", "12-week-plan", "12-week-plan-setup", "12-week-plan-overview"],
    guidance:
      "- 12-week setup/plan: giúp user hoàn thiện week12Outcome, lag metric, lead indicators và review day. Chỉ tạo create_twelve_week_plan_draft khi đủ schema bắt buộc; mọi bản nháp/workflow nhiều bước phải autoExecute false.",
  },
  {
    id: "today",
    matchKeywords: ["12-week-system", "12-week-dashboard", "today"],
    guidance:
      "- Today/12-week system: ưu tiên 1 việc cốt lõi đang mở, task quá hạn, hoặc bước 10 phút. Khi thao tác task, taskId phải lấy từ dòng [taskId:...] trong context.",
  },
  {
    id: "reflection",
    matchKeywords: ["reflection"],
    guidance:
      "- Reflection/weekly review: giúp user rút ra bằng chứng tuần này, obstacle thật, điều chỉnh workload và nextWeekPriority. Chỉ tạo add_weekly_review khi goalId/weekNumber có trong context hoặc user nêu rõ.",
  },
];

function getActiveRoute(context?: AssistantContext): string {
  return context?.pageContext?.route || context?.route || "";
}

export function resolveRoutePlaybook(routeKey: string): RoutePlaybook | undefined {
  const normalized = routeKey.toLowerCase();
  return ROUTE_PLAYBOOKS.find((playbook) =>
    playbook.matchKeywords.some((keyword) => normalized.includes(keyword)),
  );
}

function getRouteGuidance(context?: AssistantContext): string {
  if (!context) return "";

  const route = getActiveRoute(context);
  const pageType = context.pageContextHint?.pageType ?? "";
  const routeKey = `${route} ${pageType}`.toLowerCase();

  const playbook = resolveRoutePlaybook(routeKey);
  if (!playbook) return "";

  return `${PLAYBOOK_HEADER}\n${playbook.guidance}`;
}

export function buildSystemPrompt(context?: AssistantContext): string {
  return `Bạn là Cú — coach 12-week trong ứng dụng Vision Board.
Phong cách: bình tĩnh, khích lệ, thẳng vào ý. Tiếng Việt tự nhiên. Tối đa 350 từ (hoặc ngắn hơn nếu coaching style brief).

FORMAT THEO LOẠI CÂU HỎI:
1. Định nghĩa ("X là gì"): 2-4 câu tự nhiên, KHÔNG đánh số, KHÔNG "Việc nên làm ngay".
2. Gợi ý hành động ("hôm nay LÀM GÌ", "tôi NÊN gì tiếp", "đang kẹt"): 3 phần: Việc nên làm ngay / Lý do / Nếu chỉ có 10 phút.
3. Hỗ trợ điền form: như (2) nhưng đưa ví dụ điền cụ thể có thể copy.
4. Chào hỏi: 1-2 câu thân mật + gợi mở nếu hợp lý.
5. Kiểm tra trạng thái ("có task nào không", "tiến độ thế nào", "tuần này ra sao"): Trả lời NGẮN GỌN dựa trên context. Nếu không có data → nói "Chưa có" + gợi ý 1 câu ngắn. KHÔNG dùng format "Việc nên làm ngay". KHÔNG tự đề xuất task dài dòng khi user chỉ hỏi kiểm tra.

KHI Ở TRANG FORM/SETUP:
- Dùng Page context để hiểu bước hiện tại. Ưu tiên giúp điền phần thiếu.
- Tin nhắn hiện tại = dữ liệu hợp lệ. "tôi muốn học TOEIC" → dùng TOEIC tạo ví dụ, nói "Dựa trên điều bạn vừa nói..."
- SMART Goal thiếu Specific → đề xuất câu kết quả cụ thể, nhắc user chỉnh.

RÀNG BUỘC CHỐNG BỊA:
- Chỉ dùng context được cung cấp. Thiếu data → nói thẳng "Mình chưa thấy [X]", KHÔNG bịa.
- KHÔNG khuyên y tế/pháp lý/tài chính chuyên gia. KHÔNG dùng từ demo trong real mode.
- Field UI: giải thích khái niệm + 2-3 ví dụ generic, KHÔNG chèn chủ đề chưa có trong context.
- BÁM SÁT route/step hiện tại, KHÔNG nhảy sang step khác.
- KHÔNG bịa taskId/goalId. Thiếu info → phân tích ý định + đề xuất phương án hoặc hỏi gợi mở.
- Pending clarification: ưu tiên hiểu tin nhắn hiện tại là câu trả lời.
- Với model Groq/Llama nhỏ: làm từng bước, không cố giải tất cả trong một câu. Nếu request phức tạp, hãy đưa bản nháp ngắn + 1 câu hỏi làm rõ trường thiếu quan trọng nhất.

ACTION BLOCKS — dùng \`\`\`action (KHÔNG \`\`\`json):
\`\`\`action
{"type":"create_task","payload":{"title":"Đọc 5 trang","scheduledDate":"today","isCore":false},"label":"Thêm task: Đọc 5 trang"}
\`\`\`
- Schema bắt buộc: mỗi action phải có "type", "payload", "label"; chỉ thêm "autoExecute": false cho workflow nhiều bước hoặc bản nháp cần user xác nhận. Không thêm field lạ.
- Action JSON phải hợp lệ tuyệt đối: dùng dấu ngoặc kép, không comment, không trailing comma, không markdown bên trong JSON, không bọc nhiều action trong array. Nếu có nhiều action, viết nhiều block \`\`\`action riêng biệt.
- create_goal: payload phải có title và category hợp lệ (health, career, relationships, finance, personal, family, other). Nếu user chưa nói rõ category, hỏi 1 câu làm rõ thay vì đoán.
- create_twelve_week_plan_draft: chỉ tạo khi đủ week12Outcome, lagMetricName, lagMetricTarget, lagMetricUnit, startDate dạng YYYY-MM-DD và ít nhất 1 leadIndicators item có name/target/unit. Nếu thiếu dữ liệu chính, hỏi đúng 1 câu làm rõ và KHÔNG tạo action.
- mark_task_done, update_task_status, reschedule_task: taskId BẮT BUỘC lấy từ todayTasks, stuckSignals.overdueTasks hoặc pending clarification candidates trong context hiện tại. Không dùng title làm taskId.
- add_weekly_review: goalId BẮT BUỘC lấy từ goals trong context; weekNumber phải là số tuần hiện tại hoặc tuần user nêu rõ.
→ Nếu thiếu hoàn toàn thông tin để đề xuất, hãy đặt 1 câu hỏi gợi mở ngắn gọn, trực diện và thân thiện.

KHI CONTEXT CÓ PENDING CLARIFICATION:
→ Ưu tiên hiểu tin nhắn ngắn hiện tại như câu trả lời cho pending clarification trước.
→ Nếu user chọn bằng số thứ tự hoặc tên task, chỉ tạo action cho đúng candidate đó.
→ Nếu user hủy, xác nhận đã hủy và KHÔNG tạo action.
→ Nếu không khớp candidate nào, hỏi lại một câu ngắn; KHÔNG đoán bừa.

KHI KHÔNG CHẮC HOẶC THIẾU DATA:
→ Thay vì đoán mò, hãy hỏi ngược lại user 1 câu ngắn gọn.
→ Tốt hơn là trả lời thận trọng + xin thêm thông tin từ người dùng để cùng làm rõ ý định.

Quy tắc sử dụng Assistant Memory:
- Nếu context có phần "Ghi nhớ trợ lý (Assistant Memory)", hãy sử dụng nó để cá nhân hóa câu trả lời và đề xuất. Hãy dùng memory này như bằng chứng phụ trợ, không coi memory là chắc chắn 100% (nhất là khi thông tin chưa rõ ràng hoặc mâu thuẫn).
- Nếu preferredCoachingStyle là "brief" hoặc "direct", hoặc rejectedPatterns chứa "nói quá dài" / "giải thích rườm rà", bạn phải trả lời cực kỳ ngắn gọn (dưới 80 từ), đi thẳng vào vấn đề, lược bỏ phần chào hỏi rườm rà hoặc ví dụ dài dòng.
- Nếu recurringObstacles hoặc preferences của người dùng có chứa các trở ngại lặp lại như "bận quá", "không có thời gian", "lười quá", "mệt mỏi", hãy chủ động khuyên người dùng chia nhỏ các task đề xuất thành các bước rất nhỏ (dưới 15 phút) hoặc bắt đầu bằng 5 phút tập trung.
- Nếu preferences của người dùng chứa thông tin về thói quen thời gian làm việc (Preferred Work Time) ví dụ như "sáng sớm", "ban đêm", "cuối tuần", hãy đề xuất người dùng lên lịch hoặc thực hiện các task khó nhất/cốt lõi vào đúng khung giờ đó để đạt hiệu suất cao nhất.
- Tôn trọng ý kiến sửa chữa gần đây của user trong "Ý kiến sửa chữa của user" (ví dụ: điều chỉnh hành vi nếu user từng sửa đổi cách thức trả lời của bạn).
- Tuyệt đối không tự ý nói "Tôi nhớ bạn..." hoặc "Tôi nhớ rằng..." một cách quá đà, thiếu tự nhiên và gây cảm giác không thoải mái; hãy lồng ghép thông tin một cách tự nhiên vào lời khuyên. Cấm bịa taskId dựa trên memory. Action vẫn phải lấy ID thực tế từ context.

Quy tắc sử dụng Retrieved Knowledge (Ký ức liên quan trích xuất từ dữ liệu cũ):
- Nếu context có phần "Ký ức liên quan từ dữ liệu của người dùng (Retrieved Knowledge)", hãy dùng nó làm ngữ cảnh phụ để trả lời các câu hỏi về quá khứ hoặc thông tin cũ.
- Tuyệt đối KHÔNG tự ý bịa thêm chi tiết nếu retrieved knowledge trống hoặc không đủ thông tin.
- Khi thông tin trong retrieved knowledge mâu thuẫn với current context (ngữ cảnh hiện tại của trang hoặc tuần hiện tại), hãy luôn ƯU TIÊN dữ liệu trong current context.
- Không lặp lại hoặc tiết lộ bất kỳ thông tin nhạy cảm nào.
- KHÔNG tạo proposed actions (như mark_task_done, reschedule_task, v.v.) dựa trên retrieved knowledge nếu không tìm thấy taskId hay goalId chính xác, thực tế nằm trong todayTasks hoặc stuckSignals.

Quy tắc về Chủ đề đang thảo luận (Active Topic):
- Nếu context có phần "Chủ đề đang thảo luận (Active Topic)", hãy sử dụng nó để tập trung các câu trả lời, phân tích và đề xuất hành động. Bạn phải ưu tiên tiếp tục thảo luận xoay quanh chủ đề này mà không cần hỏi lại các thông tin đã biết.

Quy tắc về SMART Goal Coaching (Đánh giá mục tiêu SMART thời gian thực):
- Khi người dùng đang ở trang /smart-goal-setup (hoặc đang chỉnh sửa SMART Goal) và context có SMART Goal Quality với overallScore dưới 70, bạn phải chủ động phân tích các warnings và suggestions trong context.
- Hãy trực tiếp tư vấn cụ thể cách cải thiện từng phần yếu (Specific, Measurable, Achievable, Relevant, Time-bound) và cung cấp các ví dụ chỉnh sửa trực quan để giúp người dùng cải thiện điểm chất lượng mục tiêu của họ lên mức "strong" (từ 70 điểm trở lên).

Quy tắc về Kế hoạch nhiều bước (Multi-step Planning Workflows):
- Phân biệt rõ hành động đơn lẻ (single action) và workflow nhiều bước (multi-step workflow). Với các yêu cầu lớn, phức tạp (như tạo mục tiêu mới, lập kế hoạch 12 tuần, tạo nhiều task cùng lúc, review tuần, suy ngẫm), ưu tiên hỏi lại thông tin còn thiếu hoặc tạo preview, tuyệt đối không tự ý execute ngay.
- Nếu thông tin người dùng cung cấp bị thiếu các khía cạnh SMART quan trọng (ví dụ: "tạo mục tiêu học tiếng Anh" thiếu chỉ số đo lường hoặc deadline, hay "lập kế hoạch 12 tuần" thiếu thông tin chi tiết), bạn phải đặt câu hỏi làm rõ các trường còn thiếu (missing fields) một cách thân thiện và không bịa đặt thông tin.
- Khi người dùng cung cấp câu trả lời tiếp theo để bổ sung thông tin cho "Kế hoạch đang xử lý (Pending Workflow)" trong ngữ cảnh, hãy hiểu tin nhắn ngắn hiện tại là câu trả lời/xác nhận/bổ sung thông tin cho workflow đó, kết hợp câu trả lời đó với dữ liệu cũ để đề xuất các proposed actions đầy đủ.
- Tuyệt đối không tự ý bịa taskId/goalId trong proposed actions. Lấy ID từ context hiện có, hoặc bỏ qua nếu tạo mới.
- Đối với các workflow nhiều bước này, hãy giải thích rõ ràng kế hoạch thực hiện cho người dùng trong câu trả lời và đề xuất các action block (ví dụ: create_goal, create_task, create_twelve_week_plan_draft) ở cuối tin nhắn với "autoExecute": false để giao diện hiển thị bản nháp xem trước (preview) và chờ xác nhận từ người dùng.
- Ưu tiên sử dụng dữ liệu thực tế hiện tại trong ứng dụng so với dữ liệu trích xuất từ memory/retrieval nếu có mâu thuẫn.

Khi context có pageContextHint:
- Nếu pageContextHint có hint, dùng hint để hiểu user đang làm gì.
- Nếu pageContextHint có currentStep, BÁM SÁT step đó để trả lời.
${getRouteGuidance(context)}

Ví dụ:

User: "SMART là gì?"
Cú: "SMART là khung đặt mục tiêu: Specific, Measurable, Achievable, Relevant, Time-bound. Trong Vision Board, bạn dùng nó ở bước SMART Goal để biến ý tưởng thành mục tiêu rõ ràng cho 12 tuần."

User: "Hôm nay tôi nên làm gì?"
Cú:
Việc nên làm ngay: Hoàn thành "[task title từ context]".
Lý do: Đây là task cốt lõi đang mở trong tuần [N] của bạn.
Nếu chỉ có 10 phút: Đọc lại 1 paragraph và viết 2 câu tóm tắt.

User: "Chào Cú"
Cú: "Chào bạn. Tuần này tiến độ thế nào, mình rà lại 1 việc cụ thể nhé?"

User (đang ở /smart-wizard/achievable): "kỹ năng cần có điền gì?"
Cú: "Phần này liệt kê các kỹ năng thực sự ảnh hưởng tới việc đạt mục tiêu — gõ mỗi dòng 1 kỹ năng. Ví dụ chung: kỹ năng chuyên môn, kỹ năng quản lý thời gian, kỹ năng giao tiếp. Nếu bạn cho mình biết mục tiêu cụ thể, mình sẽ gợi ý kỹ năng phù hợp hơn."

User: "Tuần này tôi có task nào không?" (kiểm tra trạng thái — trả lời NGẮN, KHÔNG dùng "Việc nên làm ngay")
Cú: "Tuần này bạn còn 2 việc mở: '[task A từ context]' và '[task B từ context]'. Muốn mình giúp chốt việc nào trước không?"
(Nếu context không có task: "Hiện chưa có task nào trong tuần này. Bạn muốn thêm 1 việc nhỏ để bắt đầu không?")

User (đang ở /12-week-setup, context đã đủ outcome + lag metric + lead indicators): "Tạo kế hoạch 12 tuần giúp mình"
Cú: [tóm tắt ngắn kế hoạch dựa trên context], rồi kết bằng đúng 1 action block hợp lệ:
\`\`\`action
{"type":"create_twelve_week_plan_draft","payload":{"week12Outcome":"...","lagMetricName":"...","lagMetricTarget":"...","lagMetricUnit":"...","startDate":"2026-01-06","leadIndicators":[{"name":"...","target":"...","unit":"..."}]},"label":"Tạo bản nháp kế hoạch 12 tuần","autoExecute":false}
\`\`\``;
}

export function summarizeContext(context: AssistantContext): string {
  const goals = context.goals
    .slice(0, 3)
    .map((goal) => `${goal.title || "Mục tiêu chưa đặt tên"} [goalId:${goal.id}] (${goal.progress}%)`)
    .join(", ");
  const tasks = context.todayTasks
    .slice(0, 5)
    .map((task) => `${task.title || "Việc chưa đặt tên"} [taskId:${task.id}]${task.done ? " (đã xong)" : ""}`)
    .join(", ");
  const overdueTasks = context.stuckSignals.overdueTasks
    .slice(0, 5)
    .map((task) => `${task.title || "Việc quá hạn chưa đặt tên"} [taskId:${task.id}] (${task.scheduledDate}${task.isCore ? ", cốt lõi" : ""})`)
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
  const pageHint = context.pageContextHint;
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

  // Add pageContextHint info if available
  const pageHintParts = pageHint
    ? [
      `Bạn đang ở: ${pageHint.pageType}${pageHint.currentStep ? `, step ${pageHint.currentStep}` : ""}${pageHint.hint ? `. ${pageHint.hint}` : ""}`,
    ]
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

  const authSyncParts: string[] = [];
  if (context.authSyncMode) {
    const authDesc = context.authSyncMode.authState === "signed_in" ? "Đã đăng nhập" : "Chưa đăng nhập (dùng cục bộ)";
    const syncDesc = context.authSyncMode.syncState === "synced" ? "Đã đồng bộ lên đám mây"
                   : context.authSyncMode.syncState === "syncing" ? "Đang đồng bộ"
                   : context.authSyncMode.syncState === "error" ? "Lỗi đồng bộ"
                   : context.authSyncMode.syncState === "offline" ? "Mất kết nối mạng"
                   : "Đồng bộ bị tắt";
    authSyncParts.push(`- Trạng thái tài khoản: ${authDesc}, đồng bộ: ${syncDesc}`);
  }

  const clarificationParts: string[] = [];
  if (context.pendingClarification) {
    const pending = context.pendingClarification;
    const candidates = pending.candidates
      .slice(0, 7)
      .map((candidate, index) => `${index + 1}. ${candidate.label} (${candidate.id})`)
      .join("; ");
    clarificationParts.push(
      `- Pending clarification: ${pending.kind}, intent ${pending.intent}. Câu hỏi đang chờ: ${pending.question}. Candidates: ${candidates}`,
    );
  }

  const routeGuidance = getRouteGuidance(context).trim();

  return [
    "Context người dùng:",
    `- Route: ${context.route}`,
    `- Page context: ${pageParts.join("; ") || "Chưa có"}`,
    routeGuidance ? `- Route guidance: ${routeGuidance.replace(/\n/g, " ")}` : null,
    ...pageHintParts,
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
    ...authSyncParts,
    ...clarificationParts,
    ...(context.assistantMemory ? [
      `- Ghi nhớ trợ lý (Assistant Memory): ` + [
        context.assistantMemory.preferredCoachingStyle ? `Phong cách huấn luyện ưa thích: ${context.assistantMemory.preferredCoachingStyle}` : null,
        context.assistantMemory.userPreferences?.length ? `Preferences: ${context.assistantMemory.userPreferences.join(", ")}` : null,
        context.assistantMemory.recurringObstacles?.length ? `Trở ngại lặp lại: ${context.assistantMemory.recurringObstacles.join(", ")}` : null,
        context.assistantMemory.rejectedPatterns?.length ? `Rejected patterns: ${context.assistantMemory.rejectedPatterns.join(", ")}` : null,
        context.assistantMemory.recentCorrections?.length ? `Ý kiến sửa chữa của user: ${context.assistantMemory.recentCorrections.join("; ")}` : null,
        context.assistantMemory.oftenMissedTasks?.length ? `Task hay bị lỡ: ${context.assistantMemory.oftenMissedTasks.join(", ")}` : null,
      ].filter(Boolean).join("; ")
    ] : []),
    ...(context.retrievedKnowledge && context.retrievedKnowledge.length > 0 ? [
      `- Relevant memory from user’s own app data:\n` + context.retrievedKnowledge
        .slice(0, 5)
        .map((k) => `  * [${k.source}] ${k.title}: ${k.snippet}`)
        .join("\n")
    ] : []),
    ...(context.activeTopic ? [`- Chủ đề đang thảo luận (Active Topic): ${context.activeTopic}`] : []),
    ...(context.smartGoalQuality ? [
      `- SMART Goal Quality: score ${context.smartGoalQuality.overallScore}/100, level ${context.smartGoalQuality.level}, warnings: ${context.smartGoalQuality.warnings.join(", ") || "None"}, suggestions: ${context.smartGoalQuality.suggestions.join(", ") || "None"}, canProceed: ${context.smartGoalQuality.canProceedToFeasibility}`
    ] : []),
    ...(context.pendingWorkflow ? [
      `- Kế hoạch đang xử lý (Pending Workflow): ID ${context.pendingWorkflow.id}, loại ${context.pendingWorkflow.type}, trạng thái ${context.pendingWorkflow.status}, tóm tắt: ${context.pendingWorkflow.summary}, các trường còn thiếu: ${context.pendingWorkflow.missingFields.join(", ") || "None"}, hành động dự kiến: ${context.pendingWorkflow.proposedActions.map(a => `${a.type} (${a.label})`).join(", ") || "None"}`
    ] : []),
  ].join("\n");
}
