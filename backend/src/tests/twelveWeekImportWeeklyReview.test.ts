import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getWeeklyReviewImportData } from "../services/twelve-week-import/payload-builders/weeklyReview";

describe("weekly review import payload", () => {
  it("preserves the complete canonical review contract", () => {
    const result = getWeeklyReviewImportData(
      "user_1",
      { clientPlanId: "goal_1:12-week-system" },
      {
        clientPlanId: "goal_1:12-week-system",
        clientWeekId: "goal_1:week:4",
        clientReviewId: "goal_1:12-week-system:review:4",
        weekNumber: 4,
        executionScore: 81,
        leadCompletionPercent: 81,
        lagProgressValue: "42",
        biggestOutputThisWeek: "Finished case study",
        mainObstacle: "Late meetings",
        nextWeekPriority: "Ship portfolio",
        workloadDecision: "reduce slightly",
        reviewCompleted: true,
        commitmentsKept: ["Deep work"],
        commitmentsMissed: ["Exercise"],
        insights: "Morning work was more reliable",
        nextWeekCommitments: ["Finish portfolio", "Train twice"],
        keepTactic: "Morning deep work",
        reduceTactic: "Optional evening work",
        reflection: "Legacy reflection",
        adjustments: "Legacy adjustment",
        lastReviewAt: "2026-08-08T08:00:00.000Z",
      },
      "backend_plan_1",
      {
        id: "backend_week_4",
        planId: "backend_plan_1",
        clientWeekId: "goal_1:week:4",
        weekNumber: 4,
      },
      "import_1",
      new Date("2026-08-08T08:30:00.000Z"),
    );

    assert.equal(result.executionScore, 81);
    assert.deepEqual(result.commitmentsKept, ["Deep work"]);
    assert.deepEqual(result.commitmentsMissed, ["Exercise"]);
    assert.equal(result.insights, "Morning work was more reliable");
    assert.deepEqual(result.nextWeekCommitments, ["Finish portfolio", "Train twice"]);
    assert.equal(result.keepTactic, "Morning deep work");
    assert.equal(result.reduceTactic, "Optional evening work");
    assert.equal(result.reflection, "Legacy reflection");
    assert.equal(result.adjustments, "Legacy adjustment");
    assert.equal(result.lastReviewAt?.toISOString(), "2026-08-08T08:00:00.000Z");
  });
});
