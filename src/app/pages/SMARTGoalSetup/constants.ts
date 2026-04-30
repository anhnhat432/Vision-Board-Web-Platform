import type { SmartStepDefinition } from "./types";

export const DEFAULT_TARGET_WEEKS = "12";

export const SMART_STEPS: SmartStepDefinition[] = [
  {
    key: "specific",
    label: "Điều muốn đạt",
    title: "Bạn muốn có kết quả gì?",
    placeholder: "Ví dụ: Tôi muốn được thăng chức lên vị trí Lập trình viên cao cấp và dẫn dắt một dự án quan trọng.",
    description: "Viết bằng một câu rõ ràng để chính bạn nhìn vào là biết mình đang hướng tới điều gì.",
    coaching: "Nói về kết quả cuối cùng, không chỉ viết mong muốn chung chung.",
    completionHint: "Viết một kết quả đủ rõ để người khác đọc cũng hiểu bạn muốn đạt điều gì.",
  },
  {
    key: "measurable",
    label: "Con số theo dõi",
    title: "Bạn sẽ biết mình đang tiến bộ bằng dấu hiệu nào?",
    placeholder: "Ví dụ: Hoàn thành 3 khóa học nâng cao, dẫn dắt 2 tính năng lớn và nhận đánh giá tốt từ quản lý.",
    description: "Chọn một dấu hiệu cụ thể để bạn không phải đoán mò mình có đang đi đúng hướng hay không.",
    coaching: "Có thể là số lượng, cột mốc, đầu ra hoặc một tiêu chí dễ quan sát.",
    completionHint: "Chốt một chỉ số, mốc hiện tại và mốc muốn chạm tới.",
  },
  {
    key: "achievable",
    label: "Điều kiện thật",
    title: "Bạn thật sự có gì để làm mục tiêu này?",
    placeholder: "Ví dụ: cần 5 giờ học mỗi tuần, mentor góp ý định kỳ và thời gian thực hành có lịch cố định.",
    description: "Phần này kéo mục tiêu về đời sống thật: thời gian, kỹ năng, người hỗ trợ và nguồn lực bạn có.",
    coaching: "Đừng viết phiên bản lý tưởng. Hãy viết phần bạn thật sự có thể giữ đều.",
    completionHint: "Điền thời gian mỗi tuần, kỹ năng và nguồn lực thực tế bạn có thể dựa vào.",
  },
  {
    key: "relevant",
    label: "Lý do",
    title: "Vì sao mục tiêu này đáng theo đuổi?",
    placeholder: "Ví dụ: Vì nó gắn trực tiếp với tầm nhìn nghề nghiệp 3 năm tới và mức thu nhập tôi đang hướng đến.",
    description: "Khi mục tiêu gắn với một lý do đủ mạnh, bạn sẽ dễ giữ được kỷ luật hơn trong giai đoạn khó.",
    coaching: "Viết như đang tự nhắc mình: mục tiêu này quan trọng vì...",
    completionHint: "Nêu lý do đủ thật để mục tiêu này đáng theo đuổi trong vài tuần tới.",
  },
  {
    key: "timeBound",
    label: "Mốc thời gian",
    title: "Bạn muốn chạm tới kết quả này vào khi nào?",
    placeholder: "Ví dụ: Trong vòng 12 tháng, trước tháng 3 năm 2027.",
    description: "Mốc thời gian tạo ra nhịp. Không cần quá gấp, nhưng cần đủ rõ để bạn biết khi nào phải nhìn lại.",
    coaching: "Nếu chưa chắc ngày cụ thể, ít nhất hãy đưa ra khung tuần hoặc tháng.",
    completionHint: "Chốt số tuần hoặc ngày đích trước khi chuyển sang kiểm tra tính thực tế.",
  },
];
