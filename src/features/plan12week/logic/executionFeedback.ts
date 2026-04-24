export type ExecutionStatus =
  | "excellent_execution"
  | "on_track"
  | "at_risk"
  | "critical";

export function interpretExecutionScore(score: number): ExecutionStatus {
  if (score >= 85) return "excellent_execution";
  if (score >= 60) return "on_track";
  if (score >= 40) return "at_risk";
  return "critical";
}

export function generateExecutionSuggestion(score: number): string {
  const status = interpretExecutionScore(score);

  switch (status) {
    case "excellent_execution":
      return "Nhịp thực thi đang rất tốt. Có thể tăng nhẹ độ khó trong tuần tới.";
    case "on_track":
      return "Nhịp thực thi đang ổn. Giữ nguyên kế hoạch tuần hiện tại.";
    case "at_risk":
      return "Nhịp đang trượt nhẹ. Giảm bớt việc trong tuần để lấy lại sự đều đặn.";
    default:
      return "Nhịp đang ở mức cần cứu. Rút gọn kế hoạch và tập trung vào một việc quan trọng nhất.";
  }
}
