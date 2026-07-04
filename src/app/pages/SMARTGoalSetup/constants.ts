import type { SmartStepDefinition } from "./types";

export const DEFAULT_TARGET_WEEKS = "12";

export const SMART_STEPS: SmartStepDefinition[] = [
  {
    key: "specific",
    label: "Cụ thể",
    title: "Bạn muốn đạt được điều gì?",
    placeholder: "VD: Đạt vị trí Senior Developer và dẫn dắt 1 dự án chính.",
    description: "Viết kết quả cụ thể, đủ rõ để người khác cũng hiểu.",
    coaching: "Tập trung vào kết quả cuối, không phải mong muốn chung chung.",
    completionHint: "Mô tả kết quả đủ rõ để hình dung khi hoàn thành.",
  },
  {
    key: "measurable",
    label: "Đo lường",
    title: "Đo tiến bộ bằng cách nào?",
    placeholder: "VD: điểm IELTS, số dự án, doanh thu...",
    description: "Chọn 1 chỉ số để biết bạn đang tiến hay đứng yên.",
    coaching: "Có thể là số lượng, cột mốc, hoặc tiêu chí quan sát được.",
    completionHint: "Chốt chỉ số, mốc hiện tại, và mốc đích.",
  },
  {
    key: "achievable",
    label: "Khả thi",
    title: "Bạn dành bao nhiêu thời gian?",
    placeholder: "VD: 5 giờ/tuần, mentor, lịch cố định.",
    description: "Chọn thời gian và nguồn lực bạn thật sự duy trì được.",
    coaching: "Chọn mức bạn giữ được đều, không phải phiên bản lý tưởng.",
    completionHint: "Điền giờ/tuần, kỹ năng và nguồn lực thực tế.",
  },
  {
    key: "relevant",
    label: "Ý nghĩa",
    title: "Tại sao điều này quan trọng?",
    placeholder: "VD: Gắn với mục tiêu 3 năm và thu nhập mong muốn.",
    description: "Lý do đủ sâu để giữ cam kết khi gặp khó khăn.",
    coaching: "Hoàn thành câu: 'Mục tiêu này quan trọng vì...'",
    completionHint: "Lý do đủ thật để cam kết vài tuần tới.",
  },
  {
    key: "timeBound",
    label: "Thời hạn",
    title: "Khi nào hoàn thành?",
    placeholder: "VD: 12 tuần, hoặc trước 01/03/2027.",
    description: "Mốc thời gian rõ để tạo động lực hành động.",
    coaching: "Chưa chắc ngày? Chọn số tuần là đủ.",
    completionHint: "Chốt số tuần hoặc ngày đích.",
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
      "Hoàn thành thiết kế hệ thống mới cho sản phẩm công ty để tối ưu hóa hiệu năng vận hành.",
      "Xây dựng portfolio cá nhân gồm 3 case study nổi bật để mở rộng cơ hội nghề nghiệp.",
      "Tham gia 1 khóa học chuyên sâu về kỹ năng cốt lõi của vị trí hiện tại.",
    ],
    measurable: [
      { name: "Số dự án bàn giao thành công", unit: "dự án", baseline: "0", target: "1" },
      { name: "Số giờ thực tế lập trình/tuần", unit: "giờ/tuần", baseline: "0", target: "8" },
      { name: "Số case study trong portfolio", unit: "case", baseline: "0", target: "3" },
      { name: "Số buổi networking chất lượng/tháng", unit: "buổi/tháng", baseline: "0", target: "2" },
    ],
    achievable: [
      {
        hours: "8",
        skills: "Thiết kế hệ thống, NodeJS nâng cao",
        resources: "Khóa học Udemy, Sách lập trình chuyên ngành",
      },
      {
        hours: "5",
        skills: "Quản lý dự án, Giao tiếp đa bộ phận",
        resources: "Mentor trong công ty, Tài liệu nội bộ",
      },
    ],
    relevant: [
      {
        reason: "Nâng cao năng lực chuyên môn để sẵn sàng cho đợt review thăng tiến tiếp theo.",
        alignment: "Sự nghiệp & Công việc",
      },
      {
        reason: "Mở rộng uy tín cá nhân trong ngành và tạo nhiều cơ hội hợp tác mới.",
        alignment: "Sự nghiệp & Công việc",
      },
    ],
  },
  Finance: {
    specific: [
      "Thiết lập quỹ khẩn cấp đầu tiên để đảm bảo an toàn tài chính gia đình.",
      "Cắt giảm 15% chi phí không cần thiết để tối ưu hóa ngân sách tích lũy.",
      "Tích lũy 50 triệu đồng trong vòng 6 tháng để bắt đầu quỹ đầu tư dài hạn.",
      "Xây dựng thói quen theo dõi dòng tiền hàng tuần để kiểm soát chi tiêu.",
    ],
    measurable: [
      { name: "Số tiền tích lũy quỹ khẩn cấp", unit: "triệu VNĐ", baseline: "0", target: "20" },
      { name: "Tỷ lệ cắt giảm chi tiêu không thiết yếu", unit: "% chi phí", baseline: "0", target: "15" },
      { name: "Số tuần chi tiêu nằm trong ngân sách", unit: "tuần", baseline: "0", target: "12" },
      { name: "Tỷ lệ thu nhập dành để đầu tư", unit: "%", baseline: "0", target: "10" },
    ],
    achievable: [
      {
        hours: "2",
        skills: "Quản lý ngân sách cá nhân",
        resources: "Bảng Notion tài chính, Ứng dụng ghi chép chi tiêu",
      },
      {
        hours: "1.5",
        skills: "Phân tích dòng tiền, Đầu tư cơ bản",
        resources: "Sách tài chính cá nhân, Ứng dụng đầu tư",
      },
    ],
    relevant: [
      {
        reason: "Để gia tăng sự an tâm trước biến cố và xây dựng thói quen tích lũy lành mạnh.",
        alignment: "Tài chính & Tích lũy",
      },
      {
        reason: "Giảm căng thẳng tài chính và tạo tự do lựa chọn cho tương lai.",
        alignment: "Tài chính & Tích lũy",
      },
    ],
  },
  Health: {
    specific: [
      "Duy trì thói quen chạy bộ 3 buổi mỗi tuần để gia tăng thể lực và cải thiện giấc ngủ.",
      "Thiết lập thói quen ăn uống lành mạnh, tự chuẩn bị bữa trưa mỗi ngày đi làm.",
      "Giảm 2kg mỡ thừa trong 12 tuần bằng thói quen vận động và ăn uống lành mạnh.",
      "Ngủ đủ 7 tiếng mỗi đêm để phục hồi thể lực và tinh thần.",
    ],
    measurable: [
      { name: "Số buổi chạy bộ/tuần", unit: "buổi/tuần", baseline: "0", target: "3" },
      { name: "Số bữa trưa tự chuẩn bị/tuần", unit: "bữa/tuần", baseline: "0", target: "5" },
      { name: "Số giờ ngủ trung bình/đêm", unit: "giờ/đêm", baseline: "5", target: "7" },
      { name: "Số bước chân/ngày", unit: "bước/ngày", baseline: "3000", target: "8000" },
    ],
    achievable: [
      {
        hours: "4",
        skills: "Lập kế hoạch chuẩn bị bữa ăn",
        resources: "Giày chạy bộ chuyên dụng, Hộp đựng thực phẩm giữ nhiệt",
      },
      {
        hours: "5",
        skills: "Tự động lập, Quản lý thời gian",
        resources: "App theo dõi giấc ngủ, Đồng hồ thông minh",
      },
    ],
    relevant: [
      {
        reason: "Để khôi phục năng lượng cơ thể, ngủ ngon giấc và nâng cao sức đề kháng.",
        alignment: "Sức khỏe thể chất",
      },
      {
        reason: "Để có thể trạng tốt hơn, tự tin hơn và làm việc hiệu quả hơn mỗi ngày.",
        alignment: "Sức khỏe thể chất",
      },
    ],
  },
  Education: {
    specific: [
      "Hoàn thành lộ trình học IELTS và đạt điểm số mong muốn phục vụ công việc toàn cầu.",
      "Hoàn thành khóa học thiết kế đồ họa UI/UX chuyên sâu để bổ sung kỹ năng mới.",
      "Hoàn thành 1 chứng chỉ chuyên môn để mở rộng cơ hội nghề nghiệp.",
      "Xây dựng thói quen học 1 giờ mỗi ngày để làm chủ kiến thức mới.",
    ],
    measurable: [
      { name: "Điểm số IELTS đạt được", unit: "điểm", baseline: "5.5", target: "7.0" },
      { name: "Số chương học thiết kế hoàn thành", unit: "chương", baseline: "0", target: "12" },
      { name: "Số từ vựng mới học/tuần", unit: "từ/tuần", baseline: "0", target: "100" },
      { name: "Số bài kiểm tra thử hoàn thành", unit: "đề", baseline: "0", target: "6" },
    ],
    achievable: [
      {
        hours: "6",
        skills: "Tự học nghiên cứu tài liệu",
        resources: "Khóa học trực tuyến Coursera, Tài khoản luyện thi IELTS",
      },
      {
        hours: "7",
        skills: "Quản lý thời gian học, Tự kiểm tra tiến độ",
        resources: "Flashcard app, Nhóm học online",
      },
    ],
    relevant: [
      { reason: "Mở rộng cơ hội nghề nghiệp toàn cầu và tự tin giao tiếp quốc tế.", alignment: "Học tập & Trí tuệ" },
      { reason: "Tăng năng lực chuyên môn và khả năng cạnh tranh trong lĩnh vực mình chọn.", alignment: "Học tập & Trí tuệ" },
    ],
  },
  Relationships: {
    specific: [
      "Duy trì thói quen chủ động kết nối chất lượng với những người bạn tích cực.",
      "Thiết lập 1 cuộc hẹn chia sẻ định kỳ hàng tuần với người đồng hành.",
      "Nhắn tin hoặc gọi điện cho 1 người bạn quan trọng mỗi tuần.",
      "Tham gia 1 nhóm cộng đồng hoặc CLB mới để mở rộng các mối quan hệ.",
    ],
    measurable: [
      { name: "Số buổi gặp gỡ, trò chuyện chất lượng/tuần", unit: "buổi/tuần", baseline: "0", target: "2" },
      { name: "Số tin nhắn/chủ động liên lạc/tuần", unit: "lần/tuần", baseline: "0", target: "3" },
      { name: "Số người mới làm quen/tháng", unit: "người/tháng", baseline: "0", target: "2" },
    ],
    achievable: [
      { hours: "3", skills: "Lắng nghe thấu cảm", resources: "Lịch cá nhân dành riêng cho bạn bè" },
      { hours: "2", skills: "Giao tiếp chủ động, Mở lòng", resources: "Danh sách liên lạc, Nhóm cộng đồng" },
    ],
    relevant: [
      { reason: "Để nuôi dưỡng các mối quan hệ tích cực và giải tỏa áp lực tinh thần.", alignment: "Mối quan hệ" },
      { reason: "Tạo hệ thống hỗ trợ tinh thần vững chắc trong giai đoạn thay đổi.", alignment: "Mối quan hệ" },
    ],
  },
  Family: {
    specific: [
      "Dành riêng khoảng thời gian chất lượng bên gia đình mỗi tuần không công việc.",
      "Thiết lập bữa tối sum họp đầm ấm và chia sẻ hàng ngày bên gia đình.",
      "Dành 30 phút trò chuyện không điện thoại với gia đình mỗi ngày.",
      "Lập thói quen đi chơi cuối tuần cùng gia đình 2 lần/tháng.",
    ],
    measurable: [
      { name: "Số bữa tối sum họp không điện thoại/tuần", unit: "buổi/tuần", baseline: "0", target: "4" },
      { name: "Số phút trò chuyện chất lượng/ngày", unit: "phút/ngày", baseline: "0", target: "30" },
      { name: "Số chuyến đi chơi gia đình/tháng", unit: "chuyến/tháng", baseline: "0", target: "2" },
    ],
    achievable: [
      { hours: "5", skills: "Giao tiếp gắn kết gia đình", resources: "Không gian sinh hoạt chung ấm cúng" },
      { hours: "3", skills: "Lập kế hoạch gia đình, Lắng nghe", resources: "Lịch tuần chung, Không gian yên tĩnh" },
    ],
    relevant: [
      {
        reason: "Để thắt chặt tình cảm gia đình, tạo điểm tựa bình yên vững chắc sau giờ làm.",
        alignment: "Gia đình & Tổ ấm",
      },
      {
        reason: "Xây dựng không gian an toàn để mỗi thành viên được lắng nghe và yêu thương.",
        alignment: "Gia đình & Tổ ấm",
      },
    ],
  },
  "Personal Growth": {
    specific: [
      "Thiết lập thói quen thiền định chánh niệm hàng ngày để rèn luyện sự tập trung.",
      "Thực hiện thói quen viết nhật ký Stoic phản tư mỗi tối trước khi ngủ.",
      "Dành 10 phút mỗi sáng để tập trung và lập ý định cho ngày mới.",
      "Hoàn thành 1 cuốn sách phát triển bản thân mỗi tháng.",
    ],
    measurable: [
      { name: "Số phút thiền định chánh niệm/ngày", unit: "phút/ngày", baseline: "0", target: "15" },
      { name: "Số trang nhật ký phản tư đã viết/tuần", unit: "trang/tuần", baseline: "0", target: "7" },
      { name: "Số cuốn sách phát triển bản thân/tháng", unit: "cuốn/tháng", baseline: "0", target: "1" },
      { name: "Số ngày viết nhật ký liên tục", unit: "ngày", baseline: "0", target: "21" },
    ],
    achievable: [
      { hours: "3", skills: "Tự phản tỉnh bản thân", resources: "Ứng dụng thiền định, Cuốn sổ phản tư chánh niệm" },
      { hours: "2", skills: "Đọc chủ động, Ghi chép", resources: "Sách phát triển bản thân, App đọc sách" },
    ],
    relevant: [
      {
        reason: "Để rèn luyện nội tâm mạnh mẽ, giảm lo âu và làm chủ cảm xúc của bản thân.",
        alignment: "Phát triển bản thân",
      },
      {
        reason: "Hiểu rõ bản thân hơn và sống có chủ đích hơn mỗi ngày.",
        alignment: "Phát triển bản thân",
      },
    ],
  },
  Leisure: {
    specific: [
      "Lên lịch và thực hiện các chuyến đi dã ngoại cuối tuần để phục hồi năng lượng.",
      "Dành riêng khoảng thời gian theo đuổi sở thích nghệ thuật cá nhân mỗi tuần.",
      "Tham gia 1 hoạt động sáng tạo hoặc thể thao mới mỗi tháng.",
      "Dành 1 ngày cuối tuần làm điều mình yêu thích không công việc.",
    ],
    measurable: [
      { name: "Số chuyến dã ngoại phục hồi năng lượng/tháng", unit: "chuyến/tháng", baseline: "0", target: "2" },
      { name: "Số giờ dành riêng cho sở thích cá nhân/tuần", unit: "giờ/tuần", baseline: "0", target: "4" },
      { name: "Số hoạt động mới trải nghiệm/tháng", unit: "hoạt động/tháng", baseline: "0", target: "1" },
      { name: "Số ngày nghỉ thực sự/tuần", unit: "ngày/tuần", baseline: "0", target: "1" },
    ],
    achievable: [
      { hours: "4", skills: "Quản lý cân bằng công việc - cuộc sống", resources: "Lịch nghỉ ngơi cuối tuần cố định" },
      { hours: "2", skills: "Lập kế hoạch nghỉ ngơi, Khám phá sở thích", resources: "Danh sách địa điểm, Bạn đồng hành" },
    ],
    relevant: [
      {
        reason: "Để hoàn toàn thư giãn đầu óc, ngăn chặn tình trạng kiệt sức trong công việc.",
        alignment: "Giải trí & Nghỉ ngơi",
      },
      {
        reason: "Tạo niềm vui và cảm hứng để duy trì năng lượng lâu dài.",
        alignment: "Giải trí & Nghỉ ngơi",
      },
    ],
  },
};
