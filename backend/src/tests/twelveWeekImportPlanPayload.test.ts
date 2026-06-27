import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getGoalImportData, getPlanImportData } from "../services/twelve-week-import/payload-builders/plan";

const now = new Date("2026-04-30T00:00:00.000Z");

describe("12-week import plan payload builder", () => {
  it("preserves supported plan setup metadata for round-trip pull/apply", () => {
    const goalData = getGoalImportData(
      "user_owner",
      {
        clientGoalId: "goal_local_1",
        title: "Ship launch",
        category: "Product",
        description: "Launch with trusted sync.",
        deadline: "2026-07-23",
        status: "active",
      },
      {
        endDate: "2026-07-23",
      },
      "import_1",
      now,
    );

    const planData = getPlanImportData(
      "user_owner",
      goalData,
      {
        clientPlanId: "goal_local_1:12-week-system",
        vision: "Launch with field-complete sync",
        startDate: "2026-04-30",
        endDate: "2026-07-23",
        timezone: "Asia/Saigon",
        weekStartsOn: "Sunday",
        totalWeeks: 12,
        status: "paused",
        goalType: "Product",
        templateId: "template_launch",
        templateName: "Launch Sprint",
        lagMetric: {
          name: "Launch readiness",
          unit: "%",
          target: "100",
          currentValue: "25",
        },
        milestones: {
          week4: "Prototype validated",
          week8: "Beta cohort active",
          week12: "Public launch ready",
        },
        successEvidence: "Three users finish one cycle.",
        reviewDay: "Friday",
        week12Outcome: "Launch with restored cross-device metadata.",
        weeklyActions: ["Write", "Interview", "Ship"],
        successMetric: "5 active testers",
        dailyReminderTime: "20:30",
        tacticLoadPreference: "lighter",
        preferredDays: [2, 4, 6],
        personalConstraint: "time",
        reentryCount: 2,
      },
      "backend_goal_1",
      "import_1",
      now,
    );

    assert.equal(planData.clientPlanId, "goal_local_1:12-week-system");
    assert.equal(planData.endDate?.toISOString(), "2026-07-23T00:00:00.000Z");
    assert.equal(planData.timezone, "Asia/Saigon");
    assert.equal(planData.weekStartsOn, "Sunday");
    assert.equal(planData.totalWeeks, 12);
    assert.equal(planData.status, "paused");
    assert.equal(planData.goalType, "Product");
    assert.equal(planData.templateId, "template_launch");
    assert.equal(planData.templateName, "Launch Sprint");
    assert.deepEqual(planData.lagMetric, {
      name: "Launch readiness",
      unit: "%",
      target: "100",
      currentValue: "25",
    });
    assert.deepEqual(planData.milestones, {
      week4: "Prototype validated",
      week8: "Beta cohort active",
      week12: "Public launch ready",
    });
    assert.equal(planData.successEvidence, "Three users finish one cycle.");
    assert.equal(planData.reviewDay, "Friday");
    assert.equal(planData.week12Outcome, "Launch with restored cross-device metadata.");
    assert.deepEqual(planData.weeklyActions, ["Write", "Interview", "Ship"]);
    assert.equal(planData.successMetric, "5 active testers");
    assert.equal(planData.dailyReminderTime, "20:30");
    assert.equal(planData.tacticLoadPreference, "lighter");
    assert.deepEqual(planData.preferredDays, [2, 4, 6]);
    assert.equal(planData.personalConstraint, "time");
    assert.equal(planData.reentryCount, 2);
  });

  it("normalizes numeric weekStartsOn from older clients", () => {
    const goalData = getGoalImportData(
      "user_owner",
      {
        clientGoalId: "goal_local_1",
        title: "Ship launch",
        category: "Product",
        description: "Launch with trusted sync.",
        deadline: "2026-07-23",
        status: "active",
      },
      {},
      "import_1",
      now,
    );

    const planData = getPlanImportData(
      "user_owner",
      goalData,
      {
        clientPlanId: "goal_local_1:12-week-system",
        startDate: "2026-04-30",
        weekStartsOn: 1,
      },
      "backend_goal_1",
      "import_1",
      now,
    );

    assert.equal(planData.weekStartsOn, "Monday");
  });
});
