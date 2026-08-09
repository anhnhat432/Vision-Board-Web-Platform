import type {
  CoachRecommendation,
  CoachTask,
  PersonalCoachContext,
} from "@shared/personalCoachSchema";

function getWorkloadRationale(context: PersonalCoachContext): string | null {
  if (context.reflection?.workloadDecision !== "reduce slightly") return null;
  return "Trong review gần nhất, bạn đã chọn giảm tải; giữ một việc chính sẽ phù hợp hơn.";
}

function getPrimaryTaskRationale(context: PersonalCoachContext, task: CoachTask): string[] {
  const rationale = [
    task.isCore
      ? "Theo kế hoạch hôm nay, đây là việc cốt lõi đang mở."
      : "Theo kế hoạch hôm nay, đây là việc đầu tiên đang mở.",
  ];

  if (context.week.focus) {
    rationale.push("Theo kế hoạch tuần, việc này đang nằm trong ưu tiên đã chọn.");
  }

  const workloadRationale = getWorkloadRationale(context);
  if (workloadRationale) rationale.push(workloadRationale);
  return rationale.slice(0, 3);
}

export function getDeterministicCoachFallback(
  context: PersonalCoachContext,
): CoachRecommendation {
  const primaryTask = context.today.primaryTask;
  if (primaryTask) {
    return {
      title: "Ưu tiên hôm nay",
      recommendation: `Bắt đầu với “${primaryTask.title}” trước khi chuyển sang việc khác.`,
      rationale: getPrimaryTaskRationale(context, primaryTask),
      primaryAction: { type: "open_task", taskId: primaryTask.id },
    };
  }

  if (context.today.allScheduledComplete) {
    return {
      title: "Hôm nay đã khép lại",
      recommendation:
        "Bạn không cần thêm việc mới. Nếu còn 2 phút, hãy mở Today để check-in điều đã giúp hôm nay chạy tốt.",
      rationale: [
        `Theo dữ liệu thực thi, bạn đã hoàn thành ${context.today.completedCount}/${context.today.scheduledCount} việc được lên lịch hôm nay.`,
      ],
      primaryAction: { type: "open_today" },
    };
  }

  const overdueTask =
    context.week.overdueTasks.find((task) => task.isCore) ?? context.week.overdueTasks[0];
  if (overdueTask) {
    const rationale = [
      overdueTask.isCore
        ? "Theo dữ liệu thực thi, đây là việc cốt lõi đang quá hạn và vẫn còn liên quan."
        : "Theo dữ liệu thực thi, đây là việc quá hạn đang mở gần nhất.",
    ];
    const workloadRationale = getWorkloadRationale(context);
    if (workloadRationale) rationale.push(workloadRationale);

    return {
      title: "Khởi động lại nhẹ",
      recommendation: `Quay lại “${overdueTask.title}” và chỉ chốt một bước có ý nghĩa trước.`,
      rationale,
      primaryAction: { type: "open_task", taskId: overdueTask.id },
    };
  }

  if (context.week.reviewDueToday) {
    return {
      title: "Chốt tuần trước",
      recommendation:
        "Mở review tuần để xác nhận điều nên giữ, điều nên giảm và ưu tiên tiếp theo trước khi thêm việc.",
      rationale: ["Theo lịch chu kỳ, review tuần đang đến hạn hôm nay."],
      primaryAction: { type: "open_week_review" },
    };
  }

  if (context.cycle.phase === "final_week") {
    return {
      title: "Khép chu kỳ có chủ đích",
      recommendation:
        "Mở kế hoạch tuần cuối để chốt cam kết cốt lõi và chuẩn bị review chu kỳ, thay vì mở rộng thêm việc.",
      rationale: ["Theo kế hoạch, đây là tuần cuối của chu kỳ hiện tại."],
      primaryAction: { type: "open_week_plan" },
    };
  }

  return {
    title: "Chọn một bước có chủ đích",
    recommendation:
      "Hôm nay chưa có việc được lên lịch. Mở kế hoạch tuần để chọn bước tiếp theo thay vì tạo việc ngẫu nhiên.",
    rationale: ["Theo kế hoạch hôm nay, không có task nào đang mở trên Daily Home."],
    primaryAction: { type: "open_week_plan" },
  };
}
