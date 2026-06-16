import type { ScreenGuideStep } from "@/app/components/ScreenGuide";

export interface ScreenGuideContent {
  screenId: string;
  title: string;
  intro?: string;
  steps: ScreenGuideStep[];
  tip?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Central copy bank for on-screen workflow guidance.
 *
 * Keeping every guidance string here makes it easy to audit tone and ensure
 * no demo-only phrasing leaks into real mode. Copy is action-oriented and
 * uses account-bound, friendly Vietnamese.
 */
export const SCREEN_GUIDES = {
    onboarding: {
      screenId: "onboarding",
      title: "Bắt đầu từ bức tranh hiện tại",
      intro: "Chọn nhanh điều đang ổn và điều cần chăm để biết bước tiếp theo.",
      steps: [
        { label: "Chấm nhanh", text: "Cho điểm thật cho 8 lĩnh vực, chưa cần hoàn hảo." },
        { label: "Xem điểm lệch", text: "Nhìn lĩnh vực thấp nhất để biết nơi nên ưu tiên trước." },
        { label: "Đi tới insight", text: "App sẽ gợi ý một trọng tâm rõ cho 12 tuần tới." },
      ],
      tip: "Điểm được lưu tự động, bạn có thể quay lại chỉnh bất cứ lúc nào.",
      action: { label: "Xem insight", onClick: () => window.location.assign("/life-insight") },
    },
  aspirationalVision: {
    screenId: "aspirational-vision",
    title: "Viết tầm nhìn dài hạn",
    intro: "Màn này giúp bạn có một điểm neo trước khi chọn mục tiêu 12 tuần.",
    steps: [
      { label: "Viết bức tranh chung.", text: "Tóm tắt con người, công việc và nhịp sống bạn muốn có trong 3-5 năm tới." },
      { label: "Chọn vài mảng chính.", text: "Chỉ cần điền những mảng thật sự quan trọng, không phải lấp đầy tất cả." },
      { label: "Dùng làm điểm neo.", text: "Sau khi lưu, quay lại Trang chính để chọn trọng tâm và kế hoạch gần nhất." },
    ],
    tip: "Tầm nhìn không cần hoàn hảo; nó chỉ cần đủ rõ để giúp bạn ra quyết định tốt hơn trong chu kỳ hiện tại.",
  },
    lifeBalance: {
      screenId: "life-balance",
      title: "Xem bản đồ cân bằng cuộc sống",
      intro: "Màn này cho bạn thấy chỗ đang ổn và chỗ đang cần thêm năng lượng.",
      steps: [
        { label: "Nhìn tổng thể", text: "Đừng nhìn từng điểm lẻ; hãy tìm phần đang hụt rõ nhất." },
        { label: "Chấm lại nếu cần", text: "Bạn có thể cập nhật điểm bất cứ lúc nào cuộc sống thay đổi." },
        { label: "Sang insight", text: "Bước tiếp theo là chọn một lĩnh vực đáng đầu tư nhất." },
      ],
      tip: "Điểm thấp không có nghĩa là bạn kém; đó chỉ là nơi cần chăm hơn ở chu kỳ này.",
      action: { label: "Xem insight", onClick: () => window.location.assign("/life-insight") },
    },
    lifeInsight: {
      screenId: "life-insight",
      title: "Chọn một trọng tâm cho 12 tuần tới",
      intro: "Bạn không cần làm mọi thứ cùng lúc. Chỉ cần chốt 1 điều quan trọng nhất.",
      steps: [
        { label: "Đọc gợi ý", text: "Xem vì sao app đề xuất lĩnh vực này trước." },
        { label: "Chốt 1 trọng tâm", text: "Chọn một lĩnh vực để giữ năng lượng không bị phân tán." },
        { label: "Đi sang SMART", text: "Bước tiếp theo là viết mục tiêu SMART thật rõ." },
      ],
      tip: "Bạn chưa bỏ lỡ gì; chỉ đang ưu tiên đúng thứ tự cho chu kỳ này.",
      action: { label: "Viết SMART Goal", onClick: () => window.location.assign("/smart-goal-setup") },
    },
    smartGoal: {
      screenId: "smart-goal",
      title: "Viết mục tiêu SMART từng bước",
      intro: "Mỗi bước làm rõ một phần để mục tiêu đủ cụ thể và đo được.",
      steps: [
        { label: "Điền lần lượt", text: "Trả lời theo thứ tự: kết quả, chỉ số, nguồn lực, lý do, mốc thời gian." },
        { label: "Bí ý thì dùng mẫu", text: "Bấm gợi ý rồi sửa lại cho giống bạn." },
        { label: "Xem chất lượng", text: "Điểm tăng khi mục tiêu rõ và đo được." },
      ],
      tip: "Bản nháp tự lưu, bạn có thể quay lại sau.",
      action: { label: "Kiểm tra khả thi", onClick: () => window.location.assign("/feasibility") },
    },
  feasibility: {
    screenId: "feasibility",
    title: "Đo mức sẵn sàng trước khi lập kế hoạch",
    intro: "Để mục tiêu không quá nặng so với lịch sống hiện tại của bạn.",
    steps: [
      { label: "Trả lời thật.", text: "Đánh giá đúng quỹ thời gian và nguồn lực bạn có." },
      { label: "Đọc kết quả.", text: "Điểm thấp là lời khuyên điều chỉnh, không phải trượt." },
      { label: "Đi tiếp.", text: "Sẵn sàng rồi thì tạo kế hoạch 12 tuần." },
    ],
    tip: "Bạn có thể chỉnh lại mục tiêu hoặc nguồn lực rồi đo lại bất cứ lúc nào.",
  },
  twelveWeekSetup: {
    screenId: "12-week-setup",
    title: "Chốt chu kỳ 12 tuần",
    intro: "Bốn bước để biến mục tiêu thành nhịp làm việc rõ ràng.",
    steps: [
      { label: "Đích đến.", text: "Mô tả kết quả bạn muốn thấy ở tuần 12." },
      { label: "Hành động.", text: "Chọn 2-3 việc lặp lại mỗi tuần sẽ kéo bạn tới đích." },
      { label: "Lịch & kích hoạt.", text: "Xếp việc vào tuần, chọn ngày nhìn lại rồi kích hoạt." },
    ],
    tip: "Hành động cam kết là việc bạn làm đều, khác với kết quả cuối cùng. Mọi thứ chỉnh lại được sau.",
    action: { label: "Mở Today", onClick: () => window.location.assign("/12-week-system?tab=today") },
  },
    twelveWeekSystem: {
      screenId: "12-week-system",
      title: "Giữ nhịp mỗi ngày, nhìn lại mỗi tuần",
      intro: "Đây là màn bạn quay lại thường xuyên để biến kế hoạch thành tiến độ thật.",
      steps: [
        { label: "Bắt đầu từ Today", text: "Làm xong việc quan trọng nhất hôm nay trước để giữ nhịp." },
        { label: "Nhìn lại cuối tuần", text: "Dành vài phút review để biết tuần sau nên giữ, tăng hay giảm tải." },
        { label: "Theo dõi tiến độ", text: "Xem mình đang tiến gần mục tiêu hay cần chỉnh sớm." },
      ],
      tip: "Khi ngoại tuyến, dữ liệu vẫn nằm trên thiết bị và sẽ đồng bộ lại khi có mạng.",
      action: { label: "Mở Today", onClick: () => window.location.assign("/12-week-system?tab=today") },
    },
  reflectionJournal: {
    screenId: "reflection-journal",
    title: "Ghi lại hành trình của bạn",
    intro: "Viết ngắn cũng được, quan trọng là đều đặn.",
    steps: [
      { label: "Viết nhanh.", text: "Vài câu về hôm nay là đủ để bắt đầu." },
      { label: "Chọn tâm trạng.", text: "Gắn tâm trạng để nhìn lại xu hướng theo thời gian." },
      { label: "Tìm lại.", text: "Dùng ô tìm kiếm và bộ lọc để xem lại dòng cũ." },
    ],
    tip: "Lỡ xóa nhầm vẫn có thể Hoàn tác ngay sau đó.",
  },
  settings: {
    screenId: "settings",
    title: "Quản lý dữ liệu và tài khoản",
    intro: "Mọi thiết lập tài khoản và dữ liệu của bạn nằm ở đây.",
    steps: [
      { label: "Xuất dữ liệu.", text: "Tải bản sao dữ liệu của bạn dưới dạng tệp JSON." },
      { label: "Quản lý gói.", text: "Xem và thay đổi gói của bạn khi cần." },
      { label: "Thận trọng.", text: "Xóa dữ liệu hoặc tài khoản là hành động không thể hoàn tác." },
    ],
    tip: "Nên tải bản xuất trước khi xóa để giữ lại dữ liệu quan trọng.",
  },
  billingPlan: {
    screenId: "billing-plan",
    title: "Tìm hiểu các gói",
    intro: "Xem gói nào hợp với nhịp làm việc của bạn.",
    steps: [
      { label: "So sánh.", text: "Đối chiếu quyền lợi giữa các gói trước khi chọn." },
      { label: "Nâng cấp.", text: "Gói Plus mở khoá mẫu nâng cao và phân tích sâu." },
      { label: "Quản lý.", text: "Có thể quản lý hoặc hủy gói trên tài khoản này." },
    ],
    tip: "Quyền lợi được mở khoá sau khi thanh toán của bạn được xác nhận.",
  },
    visionBoardEditor: {
      screenId: "vision-board-editor",
      title: "Dựng vision board thật nhanh",
      intro: "Biến mục tiêu và cảm hứng thành một bảng trực quan để quay lại mỗi ngày.",
      steps: [
        { label: "Chọn điểm bắt đầu", text: "Dùng mẫu hoặc Story Mode nếu muốn có bố cục nhanh." },
        { label: "Sắp xếp trên bảng", text: "Kéo thả ảnh, câu nói, biểu tượng và thẻ mục tiêu vào đúng chỗ." },
        { label: "Lưu rồi xuất", text: "Bấm Lưu trước khi rời trang; khi ưng ý thì xuất ảnh để dùng nhắc nhớ." },
      ],
      tip: "Nếu bảng đang trống, Story Mode là cách nhanh nhất để có bản nháp đầu tiên.",
    },
  visionBoardGallery: {
    screenId: "vision-board-gallery",
    title: "Quản lý thư viện vision board",
    intro: "Đây là nơi xem lại, mở tiếp và tạo thêm các bảng tầm nhìn theo từng năm.",
    steps: [
      { label: "Tạo mới.", text: "Bấm Tạo bảng mới khi muốn bắt đầu một phiên bản tầm nhìn khác." },
      { label: "Mở lại.", text: "Dùng Mở hoặc Chỉnh sửa trên từng bảng để tiếp tục hoàn thiện." },
      { label: "Dọn thư viện.", text: "Chỉ xoá bảng khi bạn chắc chắn không cần giữ lại hình ảnh, câu nói và bố cục đó." },
    ],
    tip: "Mỗi bảng có thể đại diện cho một mùa phát triển khác nhau, không cần gom mọi thứ vào một nơi.",
  },
} as const satisfies Record<string, ScreenGuideContent>;

export type ScreenGuideKey = keyof typeof SCREEN_GUIDES;
