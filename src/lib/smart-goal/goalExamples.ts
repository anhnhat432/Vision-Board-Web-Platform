/**
 * Goal Examples v1 — concrete worked examples per `GoalArchetype`.
 *
 * Why a separate module from `goalArchetypes.ts`?
 *  - `goalArchetypes.ts` ships *types* of metric and *anti-pattern lists*.
 *    Useful for nudges and warnings.
 *  - This module ships **concrete, copyable Vietnamese examples** users can
 *    pattern-match against (weak vs. stronger goal, good vs. bad metric,
 *    good vs. bad lead indicator, week-1 starter task).
 *
 * Constraints honored (v1):
 *  - No AI, no dependency, no storage schema change.
 *  - Examples never promise an outcome the user cannot control (e.g.
 *    "thăng chức trong 4 tuần", "giảm 10kg trong 1 tháng"). Every example
 *    is calibrated to be a realistic, controllable, 12-week-friendly target.
 *  - Pure data. No side effects, no I/O.
 *  - Backwards compatible: adding new archetypes only requires extending
 *    `GOAL_EXAMPLES`. Callers gracefully degrade via the `"other"` fallback.
 */

import type { GoalArchetype } from "./goalArchetypes";

export interface ArchetypeExample {
  archetype: GoalArchetype;
  /** A typical "weak" SMART goal statement — vague or wishful. */
  weakGoal: string;
  /** A "stronger" SMART goal statement that fixes the weak version. */
  strongerGoal: string;
  /** A measurable metric users can track week-to-week. */
  goodMetric: string;
  /** A metric that looks measurable but is misleading or unhelpful. */
  badMetric: string;
  /** A lead indicator (`việc lặp lại`) that the user controls weekly. */
  goodLeadIndicator: string;
  /**
   * A lead indicator that is actually a lag/result, not a controllable
   * weekly action. Surfaced to help users distinguish input vs. output.
   */
  badLeadIndicator: string;
  /** A small, concrete task to start week 1 — not a 4-hour commitment. */
  week1StarterTask: string;
}

const GOAL_EXAMPLES: Record<GoalArchetype, ArchetypeExample> = {
  skill_learning: {
    archetype: "skill_learning",
    weakGoal: "Học JavaScript giỏi hơn trong vài tháng tới.",
    strongerGoal:
      "Trong 12 tuần, hoàn thành 3 dự án nhỏ JavaScript đăng lên GitHub, mỗi dự án có README rõ và 1 đoạn minh họa.",
    goodMetric: "Số dự án nhỏ hoàn thành (3 dự án có README + minh họa trong 12 tuần).",
    badMetric: "Số giờ ngồi học (đo thời gian không nói lên có làm ra sản phẩm).",
    goodLeadIndicator: "Viết và push commit cho 1 tính năng nhỏ, 3 buổi mỗi tuần.",
    badLeadIndicator: "Trở thành lập trình viên giỏi (kết quả cuối, không phải việc tuần).",
    week1StarterTask: "Đặt dự án 1: tạo repo, viết README 5 dòng và commit hello-world.",
  },

  health_fitness: {
    archetype: "health_fitness",
    weakGoal: "Khỏe hơn và giảm cân trong vài tháng.",
    strongerGoal: "Trong 12 tuần, tập đều 3 buổi/tuần và giảm 3-4 kg, giữ nhịp ngủ ≥ 6 giờ/đêm tối thiểu 5 đêm/tuần.",
    goodMetric: "Số buổi tập hoàn thành mỗi tuần và cân nặng đo cùng giờ thứ Hai mỗi tuần.",
    badMetric: "Cảm giác khỏe hơn (chủ quan, không so sánh được giữa các tuần).",
    goodLeadIndicator: "Đi bộ hoặc tập 30 phút, 3 buổi cố định mỗi tuần.",
    badLeadIndicator: "Có vóc dáng đẹp (kết quả cuối, không phải việc tuần).",
    week1StarterTask: "Đi bộ 15 phút sau bữa tối thứ Hai và ghi cân nặng vào ghi chú.",
  },

  career_growth: {
    archetype: "career_growth",
    weakGoal: "Thăng chức trong 3 tháng tới.",
    strongerGoal:
      "Trong 12 tuần, hoàn thành 2 kết quả công việc lớn của vai trò hiện tại và đặt 6 buổi 1:1 với mentor để xin góp ý định kỳ.",
    goodMetric: "Số kết quả công việc đã hoàn thành (2 trong 12 tuần) và số buổi 1:1 đã xin góp ý.",
    badMetric: "Có được thăng chức (kết quả người khác quyết, không kiểm soát được).",
    goodLeadIndicator: "Giữ 2 khung 90 phút làm sâu mỗi tuần để đẩy kết quả công việc.",
    badLeadIndicator: "Được sếp công nhận (kết quả phụ thuộc người khác).",
    week1StarterTask: "Giữ 60 phút trên lịch thứ Tư và viết 5 dòng phạm vi cho kết quả công việc đầu tiên.",
  },

  financial_goal: {
    archetype: "financial_goal",
    weakGoal: "Tiết kiệm nhiều hơn để có quỹ dự phòng.",
    strongerGoal:
      "Trong 12 tuần, tiết kiệm tổng 12 triệu đồng (≈ 1 triệu/tuần) bằng tự động chuyển khoản và theo dõi chi tiêu hằng tuần.",
    goodMetric: "Số tiền chuyển vào tài khoản tiết kiệm mỗi tuần và tổng đã tiết kiệm cuối chu kỳ.",
    badMetric: "Cảm giác đỡ lo về tiền (chủ quan, không kiểm chứng được).",
    goodLeadIndicator: "Chuyển 1 triệu vào tài khoản tiết kiệm mỗi sáng thứ Hai (lịch tự động).",
    badLeadIndicator: "Trở nên giàu hơn (kết quả cuối, phụ thuộc nhiều biến).",
    week1StarterTask: "Mở app ngân hàng và đặt lệnh chuyển khoản tự động 1 triệu mỗi thứ Hai.",
  },

  exam_study: {
    archetype: "exam_study",
    weakGoal: "Đạt IELTS 7.0 thật sớm.",
    strongerGoal:
      "Trong 12 tuần, hoàn thành 8 đề thi thử IELTS đầy đủ, tăng điểm Reading + Listening lên ít nhất 0.5 band so với mốc hiện tại tuần 1.",
    goodMetric: "Số đề thi thử đã hoàn thành và điểm trung bình Reading + Listening qua từng tuần.",
    badMetric: "Đạt band 7.0 (mức điểm band là chỉ số phi tuyến — hãy đo qua đề thi thử thay).",
    goodLeadIndicator: "Làm 1 đề thi thử Reading hoặc Listening đầy đủ, 2 buổi mỗi tuần.",
    badLeadIndicator: "Học chăm hơn (mơ hồ, không đo được).",
    week1StarterTask: "Làm 1 phần Reading 30 phút từ đề mẫu vào tối thứ Ba và ghi điểm mốc hiện tại.",
  },

  project_completion: {
    archetype: "project_completion",
    weakGoal: "Ra mắt MVP trong 3 tháng.",
    strongerGoal:
      "Trong 12 tuần, hoàn tất 4 cột mốc của MVP (phạm vi rõ ở tuần 1) và có ít nhất 5 buổi góp ý với người dùng thật.",
    goodMetric: "Số cột mốc đã hoàn tất và số buổi phỏng vấn người dùng đã hoàn thành.",
    badMetric: "Sản phẩm thành công (kết quả thị trường, không kiểm soát được trong 12 tuần).",
    goodLeadIndicator: "Hoàn tất 1 phần việc nhỏ thuộc cột mốc hiện tại, 2 buổi mỗi tuần.",
    badLeadIndicator: "Có nhiều người dùng (kết quả cuối, phụ thuộc thị trường).",
    week1StarterTask: "Viết tài liệu phạm vi 5-10 dòng cho cột mốc 1 và đăng lên Notion/tài liệu nội bộ.",
  },

  habit_building: {
    archetype: "habit_building",
    weakGoal: "Tập thiền đều đặn để bớt căng thẳng.",
    strongerGoal:
      "Trong 12 tuần, thiền 5 phút mỗi sáng sau khi đánh răng, tối thiểu 5 ngày/tuần, ghi vào bảng theo dõi đơn giản.",
    goodMetric: "Số ngày trong tuần đã thiền (mục tiêu ≥ 5/7) và chuỗi ngày dài nhất trong chu kỳ.",
    badMetric: "Cảm thấy bình tĩnh hơn (chủ quan, không so sánh được).",
    goodLeadIndicator: "Thiền 5 phút sau khi đánh răng buổi sáng, 5 ngày/tuần.",
    badLeadIndicator: "Có cuộc sống cân bằng hơn (kết quả cuối, không phải việc tuần).",
    week1StarterTask: "Đặt app timer 2 phút và thiền 1 lần sáng mai sau khi đánh răng.",
  },

  creative_output: {
    archetype: "creative_output",
    weakGoal: "Trở thành writer giỏi và có nhiều người đọc.",
    strongerGoal: "Trong 12 tuần, xuất bản 12 bài blog (1 bài/tuần) trên nền tảng cá nhân, mỗi bài 600-1200 từ.",
    goodMetric: "Số bài đã xuất bản mỗi tuần và tổng số bài cuối chu kỳ.",
    badMetric: "Số người đăng ký theo dõi (phụ thuộc thuật toán + thời gian, không kiểm soát hết).",
    goodLeadIndicator: "Viết bản nháp 600 từ vào tối thứ Tư và xuất bản vào sáng thứ Bảy mỗi tuần.",
    badLeadIndicator: "Viết hay hơn (mơ hồ, không đo được).",
    week1StarterTask: "Viết bản thô 200 từ về 1 chủ đề bạn quan tâm và lưu nháp (chưa cần xuất bản).",
  },

  relationship_life: {
    archetype: "relationship_life",
    weakGoal: "Dành nhiều thời gian hơn cho gia đình.",
    strongerGoal:
      "Trong 12 tuần, có 1 buổi tối thứ Sáu/tuần dành cho gia đình (không điện thoại) và 1 cuộc gọi/tuần với 1 người bạn cũ.",
    goodMetric: "Số buổi tối thứ Sáu đã giữ và số cuộc gọi đã thực hiện mỗi tuần.",
    badMetric: "Cảm thấy gắn kết hơn (chủ quan, dễ rơi vào ảo tưởng).",
    goodLeadIndicator: "Buổi tối thứ Sáu 19h-21h dành cho gia đình, không nhắn tin công việc.",
    badLeadIndicator: "Mối quan hệ tốt hơn (kết quả cuối, không phải việc tuần).",
    week1StarterTask: "Nhắn tin 5 phút chốt với gia đình về buổi tối thứ Sáu tuần này.",
  },

  other: {
    archetype: "other",
    // For "other" we deliberately keep the example *generic* so users still
    // see the weak vs stronger pattern without being pushed into a category.
    weakGoal: "Cải thiện cuộc sống nói chung trong vài tháng tới.",
    strongerGoal:
      "Trong 12 tuần, chốt 1 kết quả cụ thể đo được và giữ 2-3 việc lặp lại mỗi tuần để chạm tới kết quả đó.",
    goodMetric: "Một con số bạn có thể đo lại mỗi tuần và biết rõ tăng hay giảm.",
    badMetric: "Cảm giác tốt hơn về cuộc sống (chủ quan, không so sánh được).",
    goodLeadIndicator: "Một việc bạn kiểm soát được, lặp lại 2-3 buổi mỗi tuần.",
    badLeadIndicator: "Một kết quả phụ thuộc người khác hoặc thị trường.",
    week1StarterTask: "Chốt 1 việc nhỏ < 30 phút làm được trong 24h tới và đặt giờ cụ thể.",
  },
};

/**
 * Look up the example bundle for a given archetype. Always returns a value;
 * unknown archetypes (defensive) fall back to the `"other"` bundle.
 */
export function getGoalArchetypeExample(archetype: GoalArchetype): ArchetypeExample {
  return GOAL_EXAMPLES[archetype] ?? GOAL_EXAMPLES.other;
}

/** Test/debug helper — list every archetype that has an example bundle. */
export function getAllGoalArchetypeExamples(): readonly ArchetypeExample[] {
  return Object.values(GOAL_EXAMPLES);
}
