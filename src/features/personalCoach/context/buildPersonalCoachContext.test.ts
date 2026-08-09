import { describe, expect, it } from "vitest";
import type { Goal, TwelveWeekSystem, TwelveWeekTaskInstance } from "@/app/utils/storage-types";
import {
  buildPersonalCoachContext,
  getPersonalCoachContextSignature,
} from "./buildPersonalCoachContext";

const REFERENCE_DATE = new Date("2026-08-09T10:00:00+07:00");

function task(
  id: string,
  scheduledDate: string,
  options: Partial<TwelveWeekTaskInstance> = {},
): TwelveWeekTaskInstance {
  return {
    id,
    weekNumber: 2,
    scheduledDate,
    title: `Task ${id}`,
    leadIndicatorName: "Deep work",
    isCore: true,
    completed: false,
    ...options,
  };
}

function system(overrides: Partial<TwelveWeekSystem> = {}): TwelveWeekSystem {
  return {
    goalType: "Project Completion",
    vision12Week: "Ra mắt portfolio để ứng tuyển",
    lagMetric: { name: "Portfolio hoàn thiện", unit: "%", target: "100", currentValue: "45" },
    leadIndicators: [{ name: "Deep work", target: "3", unit: "buổi/tuần", type: "core" }],
    milestones: { week4: "Draft", week8: "Public", week12: "Applications" },
    successEvidence: "Portfolio đã xuất bản",
    reviewDay: "Sunday",
    week12Outcome: "Portfolio đủ tốt để ứng tuyển",
    startDate: "2026-07-27",
    endDate: "2026-10-18",
    timezone: "Asia/Ho_Chi_Minh",
    weekStartsOn: "Monday",
    status: "active",
    currentWeek: 2,
    totalWeeks: 12,
    weeklyPlans: [
      { weekNumber: 2, phaseName: "Build", focus: "Hoàn thiện case study", milestone: "Draft", completed: false },
    ],
    taskInstances: [
      task("overdue", "2026-08-07", { title: "Sửa phần giới thiệu" }),
      task("done", "2026-08-08", {
        title: "Chốt outline",
        completed: true,
        completedAt: "2026-08-08T12:00:00.000Z",
      }),
      task("primary", "2026-08-09", { title: "Chốt case study" }),
      task("future", "2026-08-10", { title: "Kiểm tra responsive", isCore: false }),
      task("carry", "2026-08-11", { weekNumber: 3, rescheduledFrom: "2026-08-07" }),
    ],
    dailyCheckIns: [
      {
        date: "2026-08-08",
        didWorkToday: true,
        whichLeadIndicatorWorkedOn: "Deep work",
        amountDone: "1 việc",
        outputCreated: "Outline",
        obstacleOrIssue: "",
        dailySelfRating: 7,
        optionalNote: "private daily note must not enter coach context",
      },
    ],
    weeklyReviews: [
      {
        weekNumber: 1,
        leadCompletionPercent: 70,
        lagProgressValue: "35",
        biggestOutputThisWeek: "Draft đầu tiên",
        mainObstacle: "Deadline ở trường",
        nextWeekPriority: "Hoàn thiện case study",
        workloadDecision: "reduce slightly",
        reviewCompleted: true,
        nextWeekCommitments: ["Chốt nội dung", "Kiểm tra responsive", "Việc thứ ba", "Việc thứ tư"],
        keepTactic: "Khối tập trung 90 phút",
        reduceTactic: "Chỉnh màu không bắt buộc",
        reflection: "private long reflection must not enter coach context",
      },
      {
        weekNumber: 2,
        leadCompletionPercent: 0,
        lagProgressValue: "",
        biggestOutputThisWeek: "",
        mainObstacle: "Incomplete review must not win",
        nextWeekPriority: "",
        workloadDecision: "",
        reviewCompleted: false,
      },
    ],
    scoreboard: [],
    ...overrides,
  };
}

function goal(twelveWeekSystem = system()): Goal {
  return {
    id: "goal_portfolio",
    category: "Career",
    title: "Ra mắt portfolio",
    description: "private goal description must not enter coach context",
    deadline: "2026-10-18",
    tasks: [],
    createdAt: "2026-07-01T00:00:00.000Z",
    twelveWeekSystem,
  };
}

describe("buildPersonalCoachContext", () => {
  it("reuses Daily Home primary state and keeps early-week metrics time-aware", () => {
    const context = buildPersonalCoachContext({ goal: goal(), system: system(), referenceDate: REFERENCE_DATE });

    expect(context.cycle).toEqual({ currentWeek: 2, totalWeeks: 12, phase: "active" });
    expect(context.today.primaryTask?.id).toBe("primary");
    expect(context.today.openTasks.map((item) => item.id)).toEqual(["primary"]);
    expect(context.week.focus).toBe("Hoàn thiện case study");
    expect(context.week.completionToDate).toBe(33);
    expect(context.week.coreCompletionToDate).toBe(33);
    expect(context.week.wholeWeekCompletion).toBe(25);
    expect(context.week.overdueCount).toBe(1);
    expect(context.week.overdueTasks[0]?.id).toBe("overdue");
    expect(context.week.carryOverCount).toBe(1);
    expect(context.deterministicInsights.length).toBeLessThanOrEqual(3);
  });

  it("uses the latest completed review and omits unrelated free-text surfaces", () => {
    const context = buildPersonalCoachContext({ goal: goal(), system: system(), referenceDate: REFERENCE_DATE });

    expect(context.reflection).toEqual({
      weekNumber: 1,
      keepTactic: "Khối tập trung 90 phút",
      mainObstacle: "Deadline ở trường",
      nextWeekPriority: "Hoàn thiện case study",
      nextWeekCommitments: ["Chốt nội dung", "Kiểm tra responsive", "Việc thứ ba"],
      reduceTactic: "Chỉnh màu không bắt buộc",
      workloadDecision: "reduce slightly",
    });

    const serialized = JSON.stringify(context);
    expect(serialized).not.toContain("private goal description");
    expect(serialized).not.toContain("private daily note");
    expect(serialized).not.toContain("private long reflection");
    expect(serialized).not.toContain("Incomplete review must not win");
  });

  it("marks final-week context without changing the underlying cycle", () => {
    const finalSystem = system({
      startDate: "2026-05-18",
      endDate: "2026-08-09",
      currentWeek: 12,
      taskInstances: [task("final", "2026-08-09", { weekNumber: 12 })],
      weeklyPlans: [
        { weekNumber: 12, phaseName: "Close", focus: "Khép chu kỳ", milestone: "Done", completed: false },
      ],
    });

    const context = buildPersonalCoachContext({ goal: goal(finalSystem), system: finalSystem, referenceDate: REFERENCE_DATE });

    expect(context.cycle).toEqual({ currentWeek: 12, totalWeeks: 12, phase: "final_week" });
    expect(finalSystem.status).toBe("active");
  });

  it("reports all-done without inventing an open primary task", () => {
    const doneSystem = system({
      taskInstances: [
        task("one", "2026-08-09", { completed: true, completedAt: "2026-08-09T02:00:00.000Z" }),
        task("two", "2026-08-09", { completed: true, completedAt: "2026-08-09T03:00:00.000Z" }),
      ],
    });

    const context = buildPersonalCoachContext({ goal: goal(doneSystem), system: doneSystem, referenceDate: REFERENCE_DATE });

    expect(context.today.primaryTask).toBeUndefined();
    expect(context.today.openTasks).toEqual([]);
    expect(context.today.allScheduledComplete).toBe(true);
  });

  it("caps task and review arrays to the compact provider budget", () => {
    const manyToday = Array.from({ length: 12 }, (_, index) =>
      task(`today_${index}`, "2026-08-09", { isCore: index % 2 === 0 }),
    );
    const manyOverdue = Array.from({ length: 6 }, (_, index) => task(`late_${index}`, "2026-08-07"));
    const cappedSystem = system({ taskInstances: [...manyOverdue, ...manyToday] });

    const context = buildPersonalCoachContext({
      goal: goal(cappedSystem),
      system: cappedSystem,
      referenceDate: REFERENCE_DATE,
    });

    expect(context.today.openTasks).toHaveLength(8);
    expect(context.week.overdueTasks).toHaveLength(3);
  });

  it("changes the signature when meaningful execution or review context changes", () => {
    const initialSystem = system();
    const initial = buildPersonalCoachContext({ goal: goal(initialSystem), system: initialSystem, referenceDate: REFERENCE_DATE });
    const completedSystem = system({
      taskInstances: initialSystem.taskInstances.map((item) =>
        item.id === "primary" ? { ...item, completed: true, completedAt: "2026-08-09T04:00:00.000Z" } : item,
      ),
    });
    const completed = buildPersonalCoachContext({
      goal: goal(completedSystem),
      system: completedSystem,
      referenceDate: REFERENCE_DATE,
    });

    expect(getPersonalCoachContextSignature(initial)).not.toBe(getPersonalCoachContextSignature(completed));
    expect(getPersonalCoachContextSignature(initial)).toBe(getPersonalCoachContextSignature(initial));
  });
});
