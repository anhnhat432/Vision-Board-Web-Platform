// Tests cho chống bịa ID + parse JSON khoan dung + regex fence mở rộng (Nhóm 1 cải tiến AI).
// Khởi tạo env bắt buộc trước khi import bất kỳ module nào validate env.
process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/assistant-test";
process.env.FIREBASE_PROJECT_ID ??= "assistant-test";
process.env.FIREBASE_CLIENT_EMAIL ??= "firebase-admin@example.test";
process.env.FIREBASE_PRIVATE_KEY ??= "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----\\n";
process.env.FRONTEND_ORIGIN ??= "http://localhost:5173";

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type AssistantAction,
  dropActionsWithUnknownIds,
  parseAndValidateAIResponse,
} from "../services/aiAssistantService";
import type { AssistantContext } from "../services/assistantService";

const baseContext: AssistantContext = {
  currentWeek: 3,
  weeksTotal: 12,
  goals: [{ id: "g1", title: "Học tiếng Anh", progress: 40 }],
  todayTasks: [{ id: "t1", title: "Đọc 5 trang", done: false }],
  lastReflectionDate: null,
  route: "/today",
  feasibility: null,
  latestWeeklyReview: null,
  stuckSignals: {
    latestObstacle: null,
    missedCommitments: [],
    overdueOpenCount: 1,
    overdueTasks: [{ id: "t2", title: "Việc quá hạn", scheduledDate: "2026-06-20", isCore: true }],
  },
  trend: { completionLast4Weeks: [], direction: "unknown" },
  streak: { daysWithCompletedTask: 0 },
  upcomingDeadlines: [],
  pageContext: { route: "/today", currentStep: null, nextSuggestedStep: null, formDraft: {} },
} as AssistantContext;

function makeAction(type: AssistantAction["type"], payload: Record<string, unknown>): AssistantAction {
  return { id: `act_${type}`, type, payload, label: type };
}

describe("dropActionsWithUnknownIds (chống bịa ID)", () => {
  it("giữ mark_task_done khi taskId có thật trong todayTasks", () => {
    const actions = [makeAction("mark_task_done", { taskId: "t1", done: true })];
    const result = dropActionsWithUnknownIds(actions, baseContext);
    assert.equal(result.length, 1);
  });

  it("giữ taskId thuộc overdueTasks", () => {
    const actions = [makeAction("reschedule_task", { taskId: "t2", scheduledDate: "today" })];
    const result = dropActionsWithUnknownIds(actions, baseContext);
    assert.equal(result.length, 1);
  });

  it("loại action có taskId bịa không nằm trong context", () => {
    const actions = [makeAction("mark_task_done", { taskId: "fake-id", done: true })];
    const result = dropActionsWithUnknownIds(actions, baseContext);
    assert.equal(result.length, 0);
  });

  it("loại add_weekly_review khi goalId bịa, giữ khi goalId thật", () => {
    const fake = dropActionsWithUnknownIds(
      [makeAction("add_weekly_review", { goalId: "g-fake", weekNumber: 3 })],
      baseContext,
    );
    assert.equal(fake.length, 0);

    const real = dropActionsWithUnknownIds(
      [makeAction("add_weekly_review", { goalId: "g1", weekNumber: 3 })],
      baseContext,
    );
    assert.equal(real.length, 1);
  });

  it("không đụng tới action tạo mới (create_task)", () => {
    const actions = [makeAction("create_task", { title: "Việc mới", scheduledDate: "today", isCore: false })];
    const result = dropActionsWithUnknownIds(actions, baseContext);
    assert.equal(result.length, 1);
  });
});

describe("parse JSON khoan dung + regex fence", () => {
  it("vẫn parse được action block có trailing comma", () => {
    const raw = [
      "Gợi ý cho bạn:",
      "```action",
      "{",
      '  "type": "create_task",',
      '  "payload": { "title": "Đọc sách", "scheduledDate": "today", "isCore": false },',
      '  "label": "Thêm task",',
      "}",
      "```",
    ].join("\n");
    const result = parseAndValidateAIResponse(raw);
    assert.equal(result.proposedActions.length, 1);
    assert.equal(result.proposedActions[0].type, "create_task");
  });

  it("bắt được fence ```action có khoảng trắng và CRLF", () => {
    const raw =
      "Đề xuất:\r\n```action  \r\n" +
      '{"type":"navigate_to","payload":{"route":"/today"},"label":"Mở Hôm nay"}' +
      "\r\n```";
    const result = parseAndValidateAIResponse(raw);
    assert.equal(result.proposedActions.length, 1);
    assert.equal(result.proposedActions[0].type, "navigate_to");
  });

  it("bỏ qua block JSON hỏng không sửa được mà không ném lỗi", () => {
    const raw = "```action\n{ khong phai json }\n```";
    const result = parseAndValidateAIResponse(raw);
    assert.equal(result.proposedActions.length, 0);
  });
});
