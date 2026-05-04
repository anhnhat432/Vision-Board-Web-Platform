import type { SmartStepDefinition } from "./types";

export const DEFAULT_TARGET_WEEKS = "12";

export const SMART_STEPS: SmartStepDefinition[] = [
  {
    key: "specific",
    label: "Điều muốn đạt",
    title: "Bạn muốn có kết quả gì?",
    placeholder: "VD: Đạt vị trí Lập trình viên cao cấp và dẫn dắt một dự án chính trong năm nay.",
    description: "Một câu mô tả kết quả cuối cùng — rõ đến mức người khác đọc cũng hiểu.",
    coaching: "Viết kết quả cuối, không chỉ mong muốn chung chung.",
    completionHint: "Viết kết quả đủ rõ để người khác đọc cũng hiểu bạn muốn đạt gì.",
  },
  {
    key: "measurable",
    label: "Con số theo dõi",
    title: "Bạn sẽ biết mình đang tiến bộ bằng dấu hiệu nào?",
    placeholder: "VD: điểm IELTS, số dự án hoàn thành, doanh thu tháng...",
    description: "Chọn chỉ số đủ rõ để nhìn ra mình đang tiến hay đứng yên.",
    coaching: "Có thể là số lượng, cột mốc, kết quả hoặc một tiêu chí dễ quan sát.",
    completionHint: "Chốt một chỉ số, mốc hiện tại và mốc muốn chạm tới.",
  },
  {
    key: "achievable",
    label: "Điều kiện thật",
    title: "Bạn thật sự có gì để làm mục tiêu này?",
    placeholder: "VD: 5 giờ/tuần, mentor góp ý định kỳ, lịch thực hành cố định.",
    description: "Kéo mục tiêu về đời thật: thời gian, kỹ năng và nguồn lực bạn có.",
    coaching: "Ghi phần bạn thật sự giữ được đều, không phải phiên bản lý tưởng.",
    completionHint: "Điền giờ mỗi tuần, kỹ năng và nguồn lực bạn thật sự dựa vào được.",
  },
  {
    key: "relevant",
    label: "Lý do",
    title: "Vì sao mục tiêu này đáng theo đuổi?",
    placeholder: "VD: Gắn trực tiếp với mục tiêu nghề nghiệp 3 năm và mức thu nhập tôi hướng tới.",
    description: "Viết lý do khiến bạn vẫn theo đuổi ngay cả khi giai đoạn khó.",
    coaching: "Thử hoàn thành câu: mục tiêu này quan trọng vì...",
    completionHint: "Nêu lý do đủ thật để bạn giữ được cam kết vài tuần tới.",
  },
  {
    key: "timeBound",
    label: "Mốc thời gian",
    title: "Bạn muốn chạm tới kết quả này vào khi nào?",
    placeholder: "VD: 12 tuần, hoặc trước ngày 2027-03-01.",
    description: "Mốc thời gian tạo nhịp. Không cần gấp, nhưng đủ rõ để biết khi nào nhìn lại.",
    coaching: "Chưa chắc ngày cụ thể? Chọn số tuần là đủ.",
    completionHint: "Chốt số tuần hoặc ngày đích trước khi chuyển sang kiểm tra tính thực tế.",
  },
];
