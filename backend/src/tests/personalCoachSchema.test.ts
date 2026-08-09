import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  COACH_ACTION_TYPES,
  type PersonalCoachContext,
  sanitizePersonalCoachRequest,
  validateCoachRecommendation,
} from "../shared/personalCoachSchema";

function makeContext(): PersonalCoachContext {
  return {
    goal: {
      id: "goal_1",
      title: "Ra mắt portfolio",
      outcome: "Có portfolio đủ tốt để ứng tuyển",
    },
    cycle: {
      currentWeek: 3,
      totalWeeks: 12,
      phase: "active",
    },
    today: {
      date: "2026-08-09",
      primaryTask: {
        id: "task_primary",
        title: "Chốt case study",
        scheduledDate: "2026-08-09",
        isCore: true,
      },
      openTasks: [
        {
          id: "task_primary",
          title: "Chốt case study",
          scheduledDate: "2026-08-09",
          isCore: true,
        },
      ],
      scheduledCount: 2,
      completedCount: 1,
      allScheduledComplete: false,
    },
    week: {
      focus: "Hoàn thiện portfolio",
      completionToDate: 50,
      wholeWeekCompletion: 33,
      coreCompletionToDate: 50,
      overdueCount: 1,
      overdueTasks: [
        {
          id: "task_overdue",
          title: "Sửa phần giới thiệu",
          scheduledDate: "2026-08-08",
          isCore: true,
        },
      ],
      carryOverCount: 0,
      checkInDays: 3,
      possibleCheckInDays: 7,
      reviewDueToday: false,
    },
    reflection: {
      weekNumber: 2,
      keepTactic: "Khối tập trung 90 phút",
      mainObstacle: "Deadline ở trường",
      nextWeekPriority: "Hoàn thiện case study",
      nextWeekCommitments: ["Chốt nội dung", "Kiểm tra responsive"],
      reduceTactic: "Việc chỉnh màu không bắt buộc",
      workloadDecision: "reduce slightly",
    },
    deterministicInsights: [
      {
        id: "needs_scope_reduction",
        severity: "warning",
        headline: "Nên thu hẹp phạm vi",
        metrics: { completionPercent: 50 },
      },
    ],
    lagMetric: {
      name: "Portfolio hoàn thiện",
      unit: "%",
      target: "100",
      currentValue: "50",
    },
  };
}

describe("personalCoachSchema", () => {
  it("reconstructs only allowlisted context fields and redacts sensitive free text", () => {
    const raw = {
      context: {
        ...makeContext(),
        email: "owner@example.test",
        billing: { plan: "PLUS", amount: 99000 },
        authToken: "Bearer AbCdEfGhIjKlMnOpQrStUvWxYz123456",
        journal: [{ content: "private journal entry" }],
        goal: {
          ...makeContext().goal,
          title: "Gửi buyer@example.test với api_key: sk_live_AbCdEfGhIjKl123456789",
          accountMetadata: "must not survive",
        },
        reflection: {
          ...makeContext().reflection,
          mainObstacle: "password=hunter2 và owner@example.test",
          fullJournal: "must not survive",
        },
      },
    };

    const result = sanitizePersonalCoachRequest(raw);

    assert.equal(result.ok, true);
    if (!result.ok) return;

    const serialized = JSON.stringify(result.value);
    assert.doesNotMatch(serialized, /owner@example\.test|buyer@example\.test|hunter2|sk_live_/);
    assert.doesNotMatch(serialized, /billing|authToken|journal|accountMetadata|fullJournal/);
    assert.match(result.value.goal.title, /\[EMAIL_REDACTED\]/);
    assert.match(result.value.reflection?.mainObstacle ?? "", /\[REDACTED\]/);
  });

  it("accepts one valid Vietnamese recommendation", () => {
    const result = validateCoachRecommendation(
      {
        title: "Ưu tiên hôm nay",
        recommendation: "Hãy chốt case study trước khi chuyển sang việc phụ.",
        rationale: [
          "Theo kế hoạch tuần, đây là việc cốt lõi đang mở.",
          "Trong review gần nhất bạn đã chọn giảm tải việc không bắt buộc.",
        ],
        primaryAction: { type: "open_task", taskId: "task_primary" },
      },
      makeContext(),
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.primaryAction.type, "open_task");
    assert.equal(result.value.primaryAction.taskId, "task_primary");
    assert.deepEqual(result.issues, []);
  });

  it("rejects malformed output, unknown actions, and empty rationale", () => {
    const malformed = validateCoachRecommendation({ title: "Thiếu dữ liệu" }, makeContext());
    const unknownAction = validateCoachRecommendation(
      {
        title: "Ưu tiên hôm nay",
        recommendation: "Làm việc cốt lõi trước.",
        rationale: ["Theo kế hoạch tuần."],
        primaryAction: { type: "mark_task_done", taskId: "task_primary" },
      },
      makeContext(),
    );
    const emptyRationale = validateCoachRecommendation(
      {
        title: "Ưu tiên hôm nay",
        recommendation: "Làm việc cốt lõi trước.",
        rationale: [],
        primaryAction: { type: "open_today" },
      },
      makeContext(),
    );

    assert.deepEqual(malformed, { ok: false, errorCode: "COACH_INVALID_RECOMMENDATION" });
    assert.deepEqual(unknownAction, { ok: false, errorCode: "COACH_INVALID_ACTION" });
    assert.deepEqual(emptyRationale, { ok: false, errorCode: "COACH_INVALID_RATIONALE" });
  });

  it("downgrades an unknown task action to the trusted Today surface", () => {
    const result = validateCoachRecommendation(
      {
        title: "Ưu tiên hôm nay",
        recommendation: "Mở việc quan trọng nhất trong Today.",
        rationale: ["Task trả về không còn mở trong trạng thái hiện tại."],
        primaryAction: { type: "open_task", taskId: "invented_task" },
      },
      makeContext(),
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.value.primaryAction, { type: "open_today" });
    assert.deepEqual(result.issues, ["COACH_INVALID_TASK_ACTION"]);
  });

  it("exposes navigation-only action types", () => {
    assert.deepEqual(COACH_ACTION_TYPES, [
      "open_today",
      "open_task",
      "open_week_review",
      "open_week_plan",
      "none",
    ]);
    assert.equal(COACH_ACTION_TYPES.includes("mark_task_done" as never), false);
    assert.equal(COACH_ACTION_TYPES.includes("create_task" as never), false);
  });
});
