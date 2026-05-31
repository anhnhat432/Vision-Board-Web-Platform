import type { SmartStepDefinition } from "./types";

export const DEFAULT_TARGET_WEEKS = "12";

export const SMART_STEPS: SmartStepDefinition[] = [
  {
    key: "specific",
    label: "Mục tiêu cụ thể",
    title: "Bạn muốn đạt được điều gì?",
    placeholder: "VD: Đạt vị trí Lập trình viên cao cấp và dẫn dắt một dự án chính trong năm nay.",
    description: "Một mong muốn cụ thể giúp tâm trí bạn tập trung vào điều cần làm.",
    coaching: "Viết kết quả cuối, không chỉ mong muốn chung chung.",
    completionHint: "Viết kết quả đủ rõ để người khác đọc cũng hiểu bạn muốn đạt gì.",
  },
  {
    key: "measurable",
    label: "Đo lường tiến bộ",
    title: "Làm sao để đo lường tiến bộ?",
    placeholder: "VD: điểm IELTS, số dự án hoàn thành, doanh thu tháng...",
    description: "Chọn một chỉ số rõ ràng giúp bạn biết mình đang đi đúng hướng hay đứng yên.",
    coaching: "Có thể là số lượng, cột mốc, kết quả hoặc một tiêu chí dễ quan sát.",
    completionHint: "Chốt một chỉ số, mốc hiện tại và mốc muốn chạm tới.",
  },
  {
    key: "achievable",
    label: "Tính khả thi",
    title: "Bạn sẽ dành bao nhiêu thời gian và nguồn lực?",
    placeholder: "VD: 5 giờ/tuần, mentor góp ý định kỳ, lịch thực hành cố định.",
    description: "Kéo mục tiêu về đời thật dựa trên quỹ thời gian và những hỗ trợ bạn có.",
    coaching: "Ghi phần bạn thật sự giữ được đều, không phải phiên bản lý tưởng.",
    completionHint: "Điền giờ mỗi tuần, kỹ năng và nguồn lực bạn thật sự dựa vào được.",
  },
  {
    key: "relevant",
    label: "Ý nghĩa mục tiêu",
    title: "Tại sao mục tiêu này quan trọng với bạn?",
    placeholder: "VD: Gắn trực tiếp với mục tiêu nghề nghiệp 3 năm và mức thu nhập tôi hướng tới.",
    description: "Tìm kiếm lý do sâu sắc phía sau để tiếp thêm động lực cho bạn vượt qua khó khăn.",
    coaching: "Thử hoàn thành câu: mục tiêu này quan trọng vì...",
    completionHint: "Nêu lý do đủ thật để bạn giữ được cam kết vài tuần tới.",
  },
  {
    key: "timeBound",
    label: "Mốc thời gian",
    title: "Khi nào bạn muốn hoàn thành?",
    placeholder: "VD: 12 tuần, hoặc trước ngày 2027-03-01.",
    description: "Một mốc thời gian rõ ràng để tạo động lực hành động mà không gây áp lực.",
    coaching: "Chưa chắc ngày cụ thể? Chọn số tuần là đủ.",
    completionHint: "Chốt số tuần hoặc ngày đích trước khi chuyển sang kiểm tra tính thực tế.",
  },
];
