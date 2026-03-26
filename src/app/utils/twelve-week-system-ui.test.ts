import {
  buildRescuePlanSummary,
  getOutboxSummaryText,
  getOutboxTypeLabel,
  getWorkloadDecisionLabel,
} from "./twelve-week-system-ui";
import type { SyncOutboxItem, TwelveWeekTaskInstance } from "./storage-types";

describe("twelve-week-system-ui helpers", () => {
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
});
