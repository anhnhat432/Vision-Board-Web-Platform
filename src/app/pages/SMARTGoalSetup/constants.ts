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

export interface FocusAreaExample {
  specific: string[];
  measurable: { name: string; unit: string; baseline: string; target: string }[];
  achievable: { hours: string; skills: string; resources: string }[];
  relevant: { reason: string; alignment: string }[];
}

export const FOCUS_AREA_EXAMPLES: Record<string, FocusAreaExample> = {
  Career: {
    specific: [
      "Hoàn thành 1 dự án trọng điểm công việc để khẳng định năng lực chuyên môn và thăng tiến nghề nghiệp.",
      "Hoàn thành thiết kế hệ thống mới cho sản phẩm công ty để tối ưu hóa hiệu năng vận hành."
    ],
    measurable: [
      { name: "Số dự án bàn giao thành công", unit: "dự án", baseline: "0", target: "1" },
      { name: "Số giờ thực tế lập trình/tuần", unit: "giờ/tuần", baseline: "0", target: "8" }
    ],
    achievable: [
      { hours: "8", skills: "Thiết kế hệ thống, NodeJS nâng cao", resources: "Khóa học Udemy, Sách lập trình chuyên ngành" }
    ],
    relevant: [
      { reason: "Nâng cao năng lực chuyên môn để sẵn sàng cho đợt review thăng tiến tiếp theo.", alignment: "Sự nghiệp & Công việc" }
    ]
  },
  Finance: {
    specific: [
      "Thiết lập quỹ khẩn cấp đầu tiên để đảm bảo an toàn tài chính gia đình.",
      "Cắt giảm 15% chi phí không cần thiết để tối ưu hóa ngân sách tích lũy."
    ],
    measurable: [
      { name: "Số tiền tích lũy quỹ khẩn cấp", unit: "triệu VNĐ", baseline: "0", target: "20" },
      { name: "Tỷ lệ cắt giảm chi tiêu không thiết yếu", unit: "% chi phí", baseline: "0", target: "15" }
    ],
    achievable: [
      { hours: "2", skills: "Quản lý ngân sách cá nhân", resources: "Bảng Notion tài chính, Ứng dụng ghi chép chi tiêu" }
    ],
    relevant: [
      { reason: "Để gia tăng sự an tâm trước biến cố và xây dựng thói quen tích lũy lành mạnh.", alignment: "Tài chính & Tích lũy" }
    ]
  },
  Health: {
    specific: [
      "Duy trì thói quen chạy bộ 3 buổi mỗi tuần để gia tăng thể lực và cải thiện giấc ngủ.",
      "Thiết lập thói quen ăn uống lành mạnh, tự chuẩn bị bữa trưa mỗi ngày đi làm."
    ],
    measurable: [
      { name: "Số buổi chạy bộ/tuần", unit: "buổi/tuần", baseline: "0", target: "3" },
      { name: "Số bữa trưa tự chuẩn bị/tuần", unit: "bữa/tuần", baseline: "0", target: "5" }
    ],
    achievable: [
      { hours: "4", skills: "Lập kế hoạch chuẩn bị bữa ăn", resources: "Giày chạy bộ chuyên dụng, Hộp đựng thực phẩm giữ nhiệt" }
    ],
    relevant: [
      { reason: "Để khôi phục năng lượng cơ thể, ngủ ngon giấc và nâng cao sức đề kháng.", alignment: "Sức khỏe thể chất" }
    ]
  },
  Education: {
    specific: [
      "Hoàn thành lộ trình học IELTS và đạt điểm số mong muốn phục vụ công việc toàn cầu.",
      "Hoàn thành khóa học thiết kế đồ họa UI/UX chuyên sâu để bổ sung kỹ năng mới."
    ],
    measurable: [
      { name: "Điểm số IELTS đạt được", unit: "điểm", baseline: "5.5", target: "7.0" },
      { name: "Số chương học thiết kế hoàn thành", unit: "chương", baseline: "0", target: "12" }
    ],
    achievable: [
      { hours: "6", skills: "Tự học nghiên cứu tài liệu", resources: "Khóa học trực tuyến Coursera, Tài khoản luyện thi IELTS" }
    ],
    relevant: [
      { reason: "Mở rộng cơ hội nghề nghiệp toàn cầu và tự tin giao tiếp quốc tế.", alignment: "Học tập & Trí tuệ" }
    ]
  },
  Relationships: {
    specific: [
      "Duy trì thói quen chủ động kết nối chất lượng với những người bạn tích cực.",
      "Thiết lập 1 cuộc hẹn chia sẻ định kỳ hàng tuần với người đồng hành."
    ],
    measurable: [
      { name: "Số buổi gặp gỡ, trò chuyện chất lượng/tuần", unit: "buổi/tuần", baseline: "0", target: "2" }
    ],
    achievable: [
      { hours: "3", skills: "Lắng nghe thấu cảm", resources: "Lịch cá nhân dành riêng cho bạn bè" }
    ],
    relevant: [
      { reason: "Để nuôi dưỡng các mối quan hệ tích cực và giải tỏa áp lực tinh thần.", alignment: "Mối quan hệ" }
    ]
  },
  Family: {
    specific: [
      "Dành riêng khoảng thời gian chất lượng bên gia đình mỗi tuần không công việc.",
      "Thiết lập bữa tối sum họp đầm ấm và chia sẻ hàng ngày bên gia đình."
    ],
    measurable: [
      { name: "Số bữa tối sum họp không điện thoại/tuần", unit: "buổi/tuần", baseline: "0", target: "4" }
    ],
    achievable: [
      { hours: "5", skills: "Giao tiếp gắn kết gia đình", resources: "Không gian sinh hoạt chung ấm cúng" }
    ],
    relevant: [
      { reason: "Để thắt chặt tình cảm gia đình, tạo điểm tựa bình yên vững chắc sau giờ làm.", alignment: "Gia đình & Tổ ấm" }
    ]
  },
  "Personal Growth": {
    specific: [
      "Thiết lập thói quen thiền định chánh niệm hàng ngày để rèn luyện sự tập trung.",
      "Thực hiện thói quen viết nhật ký Stoic phản tư mỗi tối trước khi ngủ."
    ],
    measurable: [
      { name: "Số phút thiền định chánh niệm/ngày", unit: "phút/ngày", baseline: "0", target: "15" },
      { name: "Số trang nhật ký phản tư đã viết/tuần", unit: "trang/tuần", baseline: "0", target: "7" }
    ],
    achievable: [
      { hours: "3", skills: "Tự phản tỉnh bản thân", resources: "Ứng dụng thiền định, Cuốn sổ phản tư chánh niệm" }
    ],
    relevant: [
      { reason: "Để rèn luyện nội tâm mạnh mẽ, giảm lo âu và làm chủ cảm xúc của bản thân.", alignment: "Phát triển bản thân" }
    ]
  },
  Leisure: {
    specific: [
      "Lên lịch và thực hiện các chuyến đi dã ngoại cuối tuần để phục hồi năng lượng.",
      "Dành riêng khoảng thời gian theo đuổi sở thích nghệ thuật cá nhân mỗi tuần."
    ],
    measurable: [
      { name: "Số chuyến dã ngoại phục hồi năng lượng/tháng", unit: "chuyến/tháng", baseline: "0", target: "2" },
      { name: "Số giờ dành riêng cho sở thích cá nhân/tuần", unit: "giờ/tuần", baseline: "0", target: "4" }
    ],
    achievable: [
      { hours: "4", skills: "Quản lý cân bằng công việc - cuộc sống", resources: "Lịch nghỉ ngơi cuối tuần cố định" }
    ],
    relevant: [
      { reason: "Để hoàn toàn thư giãn đầu óc, ngăn chặn tình trạng kiệt sức trong công việc.", alignment: "Giải trí & Nghỉ ngơi" }
    ]
  }
};
