import type { PricingPlanCode } from "../storage-types";
import type { PremiumFeatureContext } from "./types";

export function getPaywallCopy(context: PremiumFeatureContext): {
  title: string;
  description: string;
  recommendedPlan: PricingPlanCode;
  bullets: string[];
} {
  switch (context) {
    case "template":
      return {
        title: "Mở khóa 5 khung Plus thích nghi",
        description:
          "Đỡ mất thời gian tự dựng từ số 0. Chọn đúng khung cho kiểu mục tiêu của bạn rồi vào thẳng tuần đầu với tactic, nhịp tải và điểm review đã được gợi ý sẵn.",
        recommendedPlan: "PLUS",
        bullets: [
          "5 khung chuyên biệt cho tìm việc, học sâu, sáng tạo, sức khỏe và mục tiêu cần tăng tốc",
          "Tactic mẫu đủ rõ để sửa nhanh theo mục tiêu cụ thể của bạn",
          "Gợi ý tải và nhịp tuần đầu để vào guồng ngay, không phải đoán nhiều",
        ],
      };
    case "review":
      return {
        title: "Mở Plus để review thông minh hơn",
        description:
          "Review xong là biết tuần này đang lệch ở đâu, tín hiệu nào đáng lo trước, và tuần sau nên giữ, giảm hay tăng phần nào.",
        recommendedPlan: "PLUS",
        bullets: [
          "Đọc tín hiệu từ score, tiến độ và phần việc bị dồn lại trong tuần",
          "Nhận gợi ý chỉnh tải đúng lúc thay vì tự đoán",
          "Chốt tuần sau rõ hơn ngay trong chính flow review",
        ],
      };
    case "reminder":
      return {
        title: "Mở Plus để giữ nhịp tốt hơn",
        description:
          "Plus không chỉ thêm nhắc việc. Nó giúp bạn biết việc nào nên chạm trước và nhận ra sớm khi nhịp tuần bắt đầu lệch.",
        recommendedPlan: "PLUS",
        bullets: [
          "Nhắc việc ưu tiên theo đúng thứ tự quan trọng",
          "Analytics sâu hơn để thấy tuần nào đang hụt nhịp",
          "Toàn bộ lớp premium gộp trong một gói Plus duy nhất",
        ],
      };
    default:
      return {
        title: "Mở Plus để đi nhanh và chắc hơn",
        description:
          "Free đủ để bắt đầu một chu kỳ. Plus dành cho lúc bạn muốn bớt loay hoay lúc setup, giữ nhịp đều hơn trong tuần và review ra quyết định nhanh hơn.",
        recommendedPlan: "PLUS",
        bullets: [
          "Bắt đầu nhanh hơn với khung gợi ý thích nghi",
          "Giữ nhịp tốt hơn với reminder và analytics premium",
          "Review thông minh hơn với gợi ý tuần sau rõ ràng",
        ],
      };
  }
}
