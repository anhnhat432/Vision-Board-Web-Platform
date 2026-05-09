import { describe, expect, it } from "vitest";

import { createWeeklyReview } from "./weeklyReview";
import type { Task, Week } from "../types/planTypes";

const week: Pick<Week, "weekNumber"> = { weekNumber: 2 };

const tasks: Task[] = [
  { id: "task-1", title: "Draft", status: "done" },
  { id: "task-2", title: "Publish", status: "todo" },
];

describe("createWeeklyReview", () => {
  it("creates a WAM review with lead score and commitment fields", () => {
    const review = createWeeklyReview({
      week,
      tasks,
      lagMetric: { target: 100, currentValue: 25 },
      commitmentsKept: ["Draft"],
      commitmentsMissed: ["Publish"],
      insights: "Block deep work before meetings.",
      nextWeekCommitments: ["Publish draft"],
    });

    expect(review).toMatchObject({
      weekNumber: 2,
      leadScore: 50,
      lagScore: 100,
      commitmentsKept: ["Draft"],
      commitmentsMissed: ["Publish"],
      insights: "Block deep work before meetings.",
      nextWeekCommitments: ["Publish draft"],
      executionScore: 50,
    });
  });

  it("maps the legacy reflection/adjustments signature into WAM fields", () => {
    const review = createWeeklyReview(week, tasks, "Review insight", "Next commitment");

    expect(review.insights).toBe("Review insight");
    expect(review.nextWeekCommitments).toEqual(["Next commitment"]);
    expect(review.commitmentsKept).toEqual([]);
    expect(review.commitmentsMissed).toEqual([]);
    expect(review.reflection).toBe("Review insight");
    expect(review.adjustments).toBe("Next commitment");
  });
});
