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
      return "Thực hiện rất tốt. Tăng nhẹ thử thách tuần sau.";
    case "on_track":
      return "Thực hiện đúng nhịp. Giữ nguyên kế hoạch tuần.";
    case "at_risk":
      return "Thực hiện đang chậm. Giảm số việc trong tuần để nhẹ hơn.";
    default:
      return "Nhịp đang ở mức cần cứu. Rút gọn kế hoạch và tập trung vào một việc quan trọng nhất.";
  }
}
