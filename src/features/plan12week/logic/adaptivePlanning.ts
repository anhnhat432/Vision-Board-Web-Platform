function normalizeTaskCount(taskCount: number): number {
  if (!Number.isFinite(taskCount) || taskCount < 0) return 0;
  return Math.round(taskCount);
}

export function generateAdaptiveSuggestion(score: number, taskCount: number): string {
  const safeTaskCount = normalizeTaskCount(taskCount);

  if (score >= 85) {
    return "Việc thực hiện đang rất tốt. Tăng thử thách nhẹ trong tuần tới.";
  }

  if (score >= 60) {
    return "Việc thực hiện đang đúng nhịp. Giữ kế hoạch tuần hiện tại.";
  }

  if (score >= 40) {
    return safeTaskCount > 0
      ? `Việc thực hiện đang có rủi ro. Giảm số việc trong tuần từ ${safeTaskCount} xuống mức nhẹ hơn.`
      : "Việc thực hiện đang có rủi ro. Giảm số việc trong tuần xuống mức nhẹ hơn.";
  }

  return "Việc thực hiện đang rất rủi ro. Rút gọn kế hoạch và tập trung vào 1 việc quan trọng.";
}
