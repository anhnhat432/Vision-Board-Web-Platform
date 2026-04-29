export interface SmartGoalStarter {
  specificGoalStatement: string;
  metricName: string;
  baselineValue: string;
  targetValue: string;
  weeklyHours: string;
  requiredSkills: string;
  supportResources: string;
  motivationReason: string;
  lifeDimensionAlignment: string;
  targetWeeks: string;
}

const DEFAULT_TARGET_WEEKS = "12";

const DEFAULT_SMART_GOAL_STARTER: SmartGoalStarter = {
  specificGoalStatement:
    "Hoàn thành một kết quả quan trọng trong 12 tuần để cải thiện lĩnh vực đang ưu tiên và có bằng chứng rõ ràng về tiến bộ.",
  metricName: "Số tuần hoàn thành việc trọng tâm",
  baselineValue: "0",
  targetValue: "12",
  weeklyHours: "4",
  requiredSkills: "Lập kế hoạch tuần\nGiữ lịch cố định\nReview tiến độ",
  supportResources: "Lịch cá nhân\nDashboard 12 tuần\nMột người nhắc nhở hoặc góp ý",
  motivationReason:
    "Mục tiêu này quan trọng vì nó giúp tôi biến mong muốn đang ưu tiên thành việc làm đều đặn, có thể theo dõi và không bị trôi theo lịch bận.",
  lifeDimensionAlignment: "",
  targetWeeks: DEFAULT_TARGET_WEEKS,
};

const SMART_GOAL_STARTERS_BY_AREA: Record<string, SmartGoalStarter> = {
  Career: {
    specificGoalStatement:
      "Hoàn thành một dự án nổi bật trong 12 tuần để có bằng chứng rõ ràng khi trao đổi về bước tiến nghề nghiệp.",
    metricName: "Số tuần review công việc hoàn thành",
    baselineValue: "0",
    targetValue: "12",
    weeklyHours: "4",
    requiredSkills: "Lập kế hoạch tuần\nTập trung sâu\nGhi nhận kết quả",
    supportResources: "Lịch cá nhân\nNgười góp ý định kỳ\nDashboard 12 tuần",
    motivationReason:
      "Tôi muốn mục tiêu này vì nó giúp công việc có kết quả nhìn thấy được, tăng năng lực và tạo nền rõ hơn cho bước tiến nghề nghiệp tiếp theo.",
    lifeDimensionAlignment: "Sự nghiệp",
    targetWeeks: DEFAULT_TARGET_WEEKS,
  },
  Finance: {
    specificGoalStatement:
      "Xây dựng quỹ dự phòng đầu tiên trong 12 tuần để tài chính cá nhân ổn hơn và giảm áp lực khi có việc phát sinh.",
    metricName: "Số tiền tiết kiệm mỗi tháng",
    baselineValue: "0",
    targetValue: "3000000",
    weeklyHours: "2",
    requiredSkills: "Theo dõi chi tiêu\nChốt ngân sách tuần\nRa quyết định mua sắm chậm lại",
    supportResources: "Bảng theo dõi chi tiêu\nTài khoản tiết kiệm riêng\nLịch review tài chính cuối tuần",
    motivationReason:
      "Tôi muốn mục tiêu này vì tài chính ổn hơn sẽ giúp tôi bớt căng thẳng, chủ động hơn và không bị động trước các khoản phát sinh.",
    lifeDimensionAlignment: "Tài chính",
    targetWeeks: DEFAULT_TARGET_WEEKS,
  },
  Health: {
    specificGoalStatement:
      "Duy trì 3 buổi vận động mỗi tuần trong 12 tuần để cơ thể khỏe hơn, ngủ tốt hơn và có nhiều năng lượng hơn.",
    metricName: "Số buổi vận động mỗi tuần",
    baselineValue: "0",
    targetValue: "3",
    weeklyHours: "4",
    requiredSkills: "Chọn bài tập vừa sức\nGiữ lịch tập\nTheo dõi năng lượng",
    supportResources: "Giày hoặc dụng cụ tập\nKhung giờ cố định\nỨng dụng hoặc sổ theo dõi",
    motivationReason:
      "Tôi muốn mục tiêu này vì sức khỏe tốt hơn sẽ giúp tôi có năng lượng ổn định hơn cho công việc, gia đình và các mục tiêu dài hạn.",
    lifeDimensionAlignment: "Sức khỏe",
    targetWeeks: DEFAULT_TARGET_WEEKS,
  },
  Education: {
    specificGoalStatement:
      "Hoàn thành một lộ trình học 12 tuần để nắm chắc một kỹ năng mới và có sản phẩm nhỏ chứng minh kết quả học.",
    metricName: "Số buổi học sâu mỗi tuần",
    baselineValue: "0",
    targetValue: "4",
    weeklyHours: "5",
    requiredSkills: "Đọc có mục tiêu\nGhi chú ngắn\nThực hành sau mỗi buổi học",
    supportResources: "Khóa học hoặc tài liệu chính\nLịch học cố định\nMột nơi lưu bài thực hành",
    motivationReason:
      "Tôi muốn mục tiêu này vì học có đầu ra rõ sẽ giúp tôi tiến bộ thật, không chỉ tích lũy tài liệu mà không áp dụng.",
    lifeDimensionAlignment: "Học tập",
    targetWeeks: DEFAULT_TARGET_WEEKS,
  },
  Relationships: {
    specificGoalStatement:
      "Duy trì ít nhất 2 lần chủ động kết nối mỗi tuần trong 12 tuần để các mối quan hệ quan trọng gần gũi hơn.",
    metricName: "Số lần chủ động kết nối mỗi tuần",
    baselineValue: "0",
    targetValue: "2",
    weeklyHours: "2",
    requiredSkills: "Lắng nghe\nChủ động nhắn hoặc hẹn\nGhi nhớ điều quan trọng",
    supportResources: "Danh sách người cần ưu tiên\nLịch nhắc nhẹ\nMột khung giờ không bị chen ngang",
    motivationReason:
      "Tôi muốn mục tiêu này vì những mối quan hệ quan trọng cần được chăm sóc đều, không chỉ đợi đến khi có vấn đề mới chú ý.",
    lifeDimensionAlignment: "Mối quan hệ",
    targetWeeks: DEFAULT_TARGET_WEEKS,
  },
  Family: {
    specificGoalStatement:
      "Duy trì 2 khoảng thời gian chất lượng với gia đình mỗi tuần trong 12 tuần để kết nối gần hơn và bớt bị cuốn vào việc riêng.",
    metricName: "Số buổi dành riêng cho gia đình mỗi tuần",
    baselineValue: "0",
    targetValue: "2",
    weeklyHours: "3",
    requiredSkills: "Sắp lịch trước\nCó mặt trọn vẹn\nTrao đổi rõ kỳ vọng",
    supportResources: "Lịch gia đình\nDanh sách hoạt động đơn giản\nKhung giờ không dùng điện thoại",
    motivationReason:
      "Tôi muốn mục tiêu này vì gia đình là nền quan trọng, và tôi cần biến sự quan tâm thành thời gian cụ thể thay vì chỉ nghĩ trong đầu.",
    lifeDimensionAlignment: "Gia đình",
    targetWeeks: DEFAULT_TARGET_WEEKS,
  },
  "Personal Growth": {
    specificGoalStatement:
      "Duy trì một thói quen phát triển bản thân trong 12 tuần để hiểu mình hơn và có nhịp cải thiện đều mỗi tuần.",
    metricName: "Số tuần hoàn thành thói quen chính",
    baselineValue: "0",
    targetValue: "12",
    weeklyHours: "3",
    requiredSkills: "Tự quan sát\nGhi chép ngắn\nGiữ cam kết nhỏ",
    supportResources: "Sổ ghi chép\nKhung giờ tĩnh\nMột câu hỏi review mỗi tuần",
    motivationReason:
      "Tôi muốn mục tiêu này vì phát triển bản thân chỉ có tác dụng khi được duy trì đều và có điểm nhìn lại rõ ràng.",
    lifeDimensionAlignment: "Phát triển bản thân",
    targetWeeks: DEFAULT_TARGET_WEEKS,
  },
  Leisure: {
    specificGoalStatement:
      "Duy trì 2 khoảng nghỉ chất lượng mỗi tuần trong 12 tuần để phục hồi năng lượng và không để cuộc sống chỉ xoay quanh việc phải làm.",
    metricName: "Số khoảng nghỉ chất lượng mỗi tuần",
    baselineValue: "0",
    targetValue: "2",
    weeklyHours: "3",
    requiredSkills: "Chọn hoạt động phục hồi\nĐặt ranh giới với công việc\nKhông biến nghỉ ngơi thành lướt vô thức",
    supportResources: "Danh sách hoạt động yêu thích\nKhung giờ rảnh cố định\nNhắc lịch nghỉ",
    motivationReason:
      "Tôi muốn mục tiêu này vì nghỉ ngơi có chủ ý giúp tôi phục hồi tốt hơn và giữ nhịp sống bền hơn trong dài hạn.",
    lifeDimensionAlignment: "Giải trí",
    targetWeeks: DEFAULT_TARGET_WEEKS,
  },
};

export function getSmartGoalStarter(focusArea: string): SmartGoalStarter {
  return SMART_GOAL_STARTERS_BY_AREA[focusArea] ?? DEFAULT_SMART_GOAL_STARTER;
}

export function getSmartGoalStarterPreview(
  stepKey: "specific" | "measurable" | "achievable" | "relevant" | "timeBound",
  starter: SmartGoalStarter,
): string {
  switch (stepKey) {
    case "specific":
      return starter.specificGoalStatement;
    case "measurable":
      return `${starter.metricName}: từ ${starter.baselineValue} đến ${starter.targetValue}`;
    case "achievable":
      return `${starter.weeklyHours} giờ mỗi tuần, có kỹ năng và nguồn lực khởi đầu rõ.`;
    case "relevant":
      return starter.motivationReason;
    case "timeBound":
      return `Theo dõi trong ${starter.targetWeeks} tuần trước khi nhìn lại toàn bộ kết quả.`;
    default:
      return "";
  }
}
