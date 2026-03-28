import type { DimensionScores } from "./dimensionScore";
import { getDimensionStatus } from "./dimensionStatus";

const MIN_SUGGESTIONS = 2;
const MAX_SUGGESTIONS = 4;

const FALLBACK_SUGGESTIONS = [
  "Giữ tuần đầu thật gọn để tạo nhịp ổn định trước khi tăng tải.",
  "Tập trung vào một outcome chính và review ngắn hàng tuần để theo dõi tiến độ.",
] as const;

export function generateSuggestions(scores: DimensionScores): string[] {
  const suggestions: string[] = [];

  if (getDimensionStatus(scores.capacity) === "weak") {
    suggestions.push("Giảm khối lượng cam kết mỗi tuần để phù hợp với quỹ thời gian thực tế.");
  }

  if (getDimensionStatus(scores.readiness) === "weak") {
    suggestions.push("Bắt đầu bằng thói quen nhỏ hơn theo thử nghiệm 2 tuần trước khi khóa kế hoạch 12 tuần.");
  }

  if (getDimensionStatus(scores.risk) === "weak") {
    suggestions.push("Xác định trước các trở ngại lớn và chuẩn bị phương án dự phòng cho từng trở ngại.");
  }

  if (getDimensionStatus(scores.context) === "weak") {
    suggestions.push("Điều chỉnh thời điểm bắt đầu hoặc sắp xếp lại ưu tiên cuộc sống để giảm xung đột.");
  }

  for (const fallback of FALLBACK_SUGGESTIONS) {
    if (suggestions.length >= MIN_SUGGESTIONS) break;
    suggestions.push(fallback);
  }

  return suggestions.slice(0, MAX_SUGGESTIONS);
}
