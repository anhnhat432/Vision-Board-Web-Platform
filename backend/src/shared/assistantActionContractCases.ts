import type { AssistantActionType } from "./assistantActionSchema";

export interface AssistantActionContractCase {
  type: AssistantActionType;
  label: string;
  rawPayload: Record<string, unknown>;
  expectedPayload: Record<string, unknown>;
}

// Bộ case dùng chung để khóa contract giữa FE (parseActions) và BE (aiAssistantService).
// Mỗi case phải đi qua đúng cùng một sanitizer trong assistantActionSchema và cho ra expectedPayload giống nhau ở cả hai phía.
export const ASSISTANT_ACTION_CONTRACT_CASES: AssistantActionContractCase[] = [
  {
    type: "create_task",
    label: "Thêm task: Đọc sách",
    rawPayload: { title: "Đọc sách", scheduledDate: "today", isCore: true },
    expectedPayload: { title: "Đọc sách", scheduledDate: "today", isCore: true },
  },
  {
    type: "mark_task_done",
    label: "Hoàn thành task",
    rawPayload: { taskId: " task_123 ", done: true },
    expectedPayload: { taskId: "task_123", done: true },
  },
  {
    type: "navigate_to",
    label: "Mở trang Hôm nay",
    rawPayload: { route: "/today" },
    expectedPayload: { route: "/today" },
  },
  {
    type: "create_goal",
    label: "Tạo mục tiêu",
    rawPayload: { title: "Học tiếng Nhật", category: "Career", description: "Học N3", deadline: "2026-12-31" },
    expectedPayload: { title: "Học tiếng Nhật", category: "career", description: "Học N3", deadline: "2026-12-31" },
  },
  {
    type: "create_life_insight_note",
    label: "Lưu insight",
    rawPayload: { title: "Nhận ra", content: "Mình cần nghỉ ngơi", mood: "calm", entryType: "freeform" },
    expectedPayload: { title: "Nhận ra", content: "Mình cần nghỉ ngơi", mood: "calm", entryType: "freeform" },
  },
  {
    type: "create_smart_goal_from_insight",
    label: "Tạo SMART goal",
    rawPayload: {
      title: "Chạy bộ đều đặn",
      category: "Health",
      description: "Chạy 3 lần/tuần",
      deadline: "2026-09-30",
      focusArea: "Sức khỏe",
    },
    expectedPayload: {
      title: "Chạy bộ đều đặn",
      category: "health",
      description: "Chạy 3 lần/tuần",
      deadline: "2026-09-30",
      focusArea: "Sức khỏe",
    },
  },
  {
    type: "suggest_feasibility_inputs",
    label: "Gợi ý feasibility",
    rawPayload: {
      answers: {
        1: "1to3",
        2: "energy_stable",
        3: "resources_basic",
        4: "realistic",
        5: "time",
        6: "sometimes",
        7: "ready",
      },
    },
    expectedPayload: {
      answers: {
        1: "1to3",
        2: "energy_stable",
        3: "resources_basic",
        4: "realistic",
        5: "time",
        6: "sometimes",
        7: "ready",
      },
    },
  },
  {
    type: "create_twelve_week_plan_draft",
    label: "Tạo bản nháp kế hoạch",
    rawPayload: {
      week12Outcome: "Giảm 5kg",
      lagMetricName: "Cân nặng",
      lagMetricTarget: "70",
      lagMetricUnit: "kg",
      startDate: "2026-06-08",
      reviewDay: "Sunday",
      tacticLoadPreference: "balanced",
      leadIndicators: [
        { id: "lead_1", name: "Chạy bộ 3 lần/tuần", target: "3", unit: "lần", type: "core", cadence: "spread" },
      ],
    },
    expectedPayload: {
      week12Outcome: "Giảm 5kg",
      lagMetricName: "Cân nặng",
      lagMetricTarget: "70",
      lagMetricUnit: "kg",
      startDate: "2026-06-08",
      reviewDay: "Sunday",
      tacticLoadPreference: "balanced",
      week4Milestone: "",
      week8Milestone: "",
      successEvidence: "",
      dailyTimeBudget: "",
      personalConstraint: "",
      leadIndicators: [
        { id: "lead_1", name: "Chạy bộ 3 lần/tuần", target: "3", unit: "lần", type: "core", cadence: "spread" },
      ],
    },
  },
  {
    type: "add_weekly_review",
    label: "Thêm weekly review",
    rawPayload: {
      goalId: "goal_1",
      weekNumber: 5,
      mainObstacle: "Bận việc",
      nextWeekPriority: "Tập trung hơn",
      workloadDecision: "keep same",
      biggestOutputThisWeek: "Hoàn thành báo cáo",
      reflection: "Tuần ổn",
      adjustments: "Ngủ sớm hơn",
      disciplineScore: 8,
      progressScore: 7,
    },
    expectedPayload: {
      goalId: "goal_1",
      weekNumber: 5,
      mainObstacle: "Bận việc",
      nextWeekPriority: "Tập trung hơn",
      workloadDecision: "keep same",
      biggestOutputThisWeek: "Hoàn thành báo cáo",
      reflection: "Tuần ổn",
      adjustments: "Ngủ sớm hơn",
      disciplineScore: 8,
      progressScore: 7,
    },
  },
  {
    type: "reschedule_task",
    label: "Dời lịch task",
    rawPayload: { taskId: "task_9", scheduledDate: "tomorrow" },
    expectedPayload: { taskId: "task_9", scheduledDate: "tomorrow" },
  },
  {
    type: "update_task_status",
    label: "Cập nhật trạng thái",
    rawPayload: { taskId: " task_5 ", completed: true },
    expectedPayload: { taskId: "task_5", completed: true },
  },
];

export function buildActionBlock(testCase: AssistantActionContractCase): string {
  const action = {
    type: testCase.type,
    payload: testCase.rawPayload,
    label: testCase.label,
  };
  return `\`\`\`action\n${JSON.stringify(action)}\n\`\`\``;
}
