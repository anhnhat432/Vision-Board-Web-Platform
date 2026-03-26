import {
  buildRescuePlanSummary,
  evaluateRescueTriggers,
  dismissRescueTrigger,
  isRescueTriggerDismissed,
  getOutboxSummaryText,
  getOutboxTypeLabel,
  getWorkloadDecisionLabel,
} from "./twelve-week-system-ui";
import type { SyncOutboxItem, TwelveWeekTaskInstance, TwelveWeekSystem } from "./storage-types";

describe("twelve-week-system-ui helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("maps workload decisions to readable labels", () => {
    expect(getWorkloadDecisionLabel("keep same")).toBe("Giữ nguyên");
    expect(getWorkloadDecisionLabel("reduce slightly")).toBe("Giảm tải nhẹ");
    expect(getWorkloadDecisionLabel("increase slightly")).toBe("Tăng tải nhẹ");
  });

  it("builds readable outbox labels and summaries", () => {
    const item: SyncOutboxItem = {
      id: "outbox_1",
      type: "12_week_task_completed",
      createdAt: "2026-03-26",
      goalId: "goal_1",
      payloadSummary: "weekNumber:1, taskId:task_3",
      status: "pending",
    };

    expect(getOutboxTypeLabel(item.type)).toBe("Hoàn thành việc");
    expect(getOutboxSummaryText(item)).toContain("Tuần 1");
    expect(getOutboxSummaryText(item)).toContain("việc task_3");
  });
  it("recommends a lighten rescue when overdue work and optional load stack together", () => {
    const missedTasks: TwelveWeekTaskInstance[] = [
      {
        id: "task_1",
        weekNumber: 1,
        scheduledDate: "2026-03-24",
        title: "Viết bản nháp",
        leadIndicatorName: "Viết",
        isCore: true,
        completed: false,
      },
      {
        id: "task_2",
        weekNumber: 1,
        scheduledDate: "2026-03-25",
        title: "Biên tập",
        leadIndicatorName: "Xuất bản",
        isCore: false,
        completed: false,
      },
    ];

    const rescuePlan = buildRescuePlanSummary({
      missedTasks,
      currentWeekTasks: [
        ...missedTasks,
        {
          id: "task_3",
          weekNumber: 1,
          scheduledDate: "2026-03-27",
          title: "Tái sử dụng nội dung",
          leadIndicatorName: "Tái sử dụng",
          isCore: false,
          completed: false,
        },
      ],
    });

    expect(rescuePlan?.recommendedMode).toBe("lighten");
    expect(rescuePlan?.headline).toContain("nhẹ xuống");
  });

  it("fires urgent missed_checkin trigger after several inactive days", () => {
    const system = {
      reviewDay: "Sunday",
      currentWeek: 1,
      totalWeeks: 12,
      taskInstances: [
        {
          id: "task_1",
          weekNumber: 1,
          scheduledDate: "2026-03-26",
          title: "Việc cốt lõi",
          leadIndicatorName: "Lead 1",
          isCore: true,
          completed: false,
        },
      ],
      dailyCheckIns: [
        {
          date: "2026-03-20",
          mood: "steady",
          didWorkToday: false,
          whichLeadIndicatorWorkedOn: "",
          amountDone: "",
          outputCreated: "",
          obstacleOrIssue: "",
          dailySelfRating: 5,
          optionalNote: "",
        },
      ],
      weeklyReviews: [],
      scoreboard: [],
      weeklyPlans: [],
      startDate: "2026-03-17",
      endDate: "2026-06-15",
      goalType: "Project Completion",
      vision12Week: "Test",
      lagMetric: { name: "Lag", unit: "x", target: "1", currentValue: "" },
      leadIndicators: [],
      milestones: { week4: "", week8: "", week12: "" },
      successEvidence: "",
      week12Outcome: "",
      timezone: "Asia/Ho_Chi_Minh",
      weekStartsOn: "Monday",
      status: "active",
      dailyReminderTime: "19:00",
      tacticLoadPreference: "balanced",
      reentryCount: 0,
    } satisfies TwelveWeekSystem;

    const triggers = evaluateRescueTriggers({
      system,
      missedTasksCount: 4,
      weekCompletionPercent: 10,
      referenceDate: new Date("2026-03-25T00:00:00.000Z"),
    });

    expect(triggers.some((trigger) => trigger.kind === "missed_checkin")).toBe(true);
    expect(triggers.some((trigger) => trigger.kind === "overdue_pile")).toBe(true);
  });

  it("persists rescue trigger dismissal by kind", () => {
    dismissRescueTrigger("missed_checkin");
    expect(isRescueTriggerDismissed("missed_checkin")).toBe(true);
  });

  describe("evaluateRescueTriggers", () => {
    const makeMinimalSystem = (overrides?: Partial<TwelveWeekSystem>): TwelveWeekSystem =>
      ({
        currentWeek: 3,
        totalWeeks: 12,
        status: "active",
        startDate: "2026-03-17",
        dailyCheckIns: [],
        leadIndicators: [{ id: "t1", name: "Focus", type: "core", schedule: [1, 3, 5], target: "3", unit: "lần/tuần", priority: 1 }],
        taskInstances: [
          { id: "task_1", weekNumber: 3, scheduledDate: "2026-03-25", title: "A", leadIndicatorName: "Focus", isCore: true, completed: false },
        ],
        ...overrides,
      }) as unknown as TwelveWeekSystem;

    it("returns empty when system is null", () => {
      expect(evaluateRescueTriggers({ system: null })).toEqual([]);
    });

    it("fires missed_checkin when last check-in was 3+ days ago", () => {
      const triggers = evaluateRescueTriggers({
        system: makeMinimalSystem({
          dailyCheckIns: [
            {
              date: "2026-03-20",
              mood: "steady",
              didWorkToday: false,
              whichLeadIndicatorWorkedOn: "",
              amountDone: "",
              outputCreated: "",
              obstacleOrIssue: "",
              dailySelfRating: 5,
              optionalNote: "",
            },
          ],
        }),
        referenceDate: new Date("2026-03-24T00:00:00.000Z"),
      });

      const missed = triggers.find((t) => t.kind === "missed_checkin");
      expect(missed).toBeDefined();
    });

    it("fires low_execution_score when weekCompletionPercent < 30", () => {
      const triggers = evaluateRescueTriggers({
        system: makeMinimalSystem(),
        missedTasksCount: 1,
        weekCompletionPercent: 15,
        referenceDate: new Date("2026-03-21T00:00:00.000Z"),
      });

      const low = triggers.find((t) => t.kind === "low_execution_score");
      expect(low).toBeDefined();
    });

    it("fires overdue_pile when missedTasksCount >= 3", () => {
      const triggers = evaluateRescueTriggers({
        system: makeMinimalSystem(),
        missedTasksCount: 4,
      });

      const overdue = triggers.find((t) => t.kind === "overdue_pile");
      expect(overdue).toBeDefined();
      expect(overdue?.severity).toBe("caution");
    });

    it("escalates overdue_pile to urgent when missedTasksCount >= 5", () => {
      const triggers = evaluateRescueTriggers({
        system: makeMinimalSystem(),
        missedTasksCount: 6,
      });

      const overdue = triggers.find((t) => t.kind === "overdue_pile");
      expect(overdue?.severity).toBe("urgent");
    });

    it("sorts triggers by severity (urgent first)", () => {
      const triggers = evaluateRescueTriggers({
        system: makeMinimalSystem({ dailyCheckIns: [] }),
        missedTasksCount: 6,
        weekCompletionPercent: 10,
      });

      if (triggers.length >= 2) {
        const severityOrder = { urgent: 0, caution: 1, watch: 2 };
        for (let i = 1; i < triggers.length; i++) {
          expect(severityOrder[triggers[i].severity]).toBeGreaterThanOrEqual(
            severityOrder[triggers[i - 1].severity],
          );
        }
      }
    });
  });

  describe("dismissRescueTrigger / isRescueTriggerDismissed", () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it("dismisses a trigger kind and reports it as dismissed", () => {
      expect(isRescueTriggerDismissed("missed_checkin")).toBe(false);
      dismissRescueTrigger("missed_checkin");
      expect(isRescueTriggerDismissed("missed_checkin")).toBe(true);
    });
  });
});
