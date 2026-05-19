import type { GoalArchetype } from "@/lib/smart-goal/goalArchetypes";

import type { FeasibilityAxis, ResultType } from "./types";

/**
 * Archetype-aware copy overlay for the Feasibility result.
 *
 * Numeric scoring stays in `helpers.ts` and is unchanged. This module only
 * tweaks the human-readable strings (`firstWeekGuidance`, `scopeRecommendation`,
 * and an optional appended note on `bottleneck.action`) so the same score on
 * different archetypes produces relevant advice.
 *
 * Design rules:
 *  - Generic `helpers.ts` copy is the fallback. Overrides return `null` to
 *    keep the generic.
 *  - Archetype `other` always returns `null` everywhere — generic copy wins.
 *  - No new questions, no scoring change.
 */

interface ArchetypeFeasibilityCopy {
  bottleneckOverlay?: Partial<Record<FeasibilityAxis | "wheel", string>>;
  firstWeek: Partial<Record<ResultType, string>>;
  scope: Partial<Record<ResultType, string>>;
}

const ARCHETYPE_COPY: Record<GoalArchetype, ArchetypeFeasibilityCopy | null> = {
  skill_learning: {
    bottleneckOverlay: {
      time: "Học kỹ năng cần consistency hơn cường độ — chọn 3 buổi ngắn cố định trong tuần.",
      energy: "Sau ngày bận, hãy luyện 20-30p thay vì bỏ buổi để giữ feedback loop hằng ngày.",
      resources: "Chuẩn bị 1 dự án nhỏ làm kết quả đầu tiên thay vì học lý thuyết tuần đầu.",
      clarity: "Thu hẹp phạm vi học còn 1 chủ đề và 1 sản phẩm thực hành đo được.",
    },
    firstWeek: {
      realistic:
        "Tuần 1 chọn 1 dự án nhỏ làm kết quả đầu tiên và 3 buổi luyện cố định. Mục tiêu là tạo vòng góp ý, không phải nạp lý thuyết.",
      challenging:
        "Tuần 1 chỉ làm 1 sản phẩm rất nhỏ (mini project) và một buổi pair review. Đừng học song song nhiều khóa.",
      too_ambitious:
        "Tuần 1 thu hẹp về 1 buổi luyện 30p mỗi 2 ngày và một bài tập đầu ra. Lý thuyết để sau khi nhịp ổn.",
    },
    scope: {
      challenging:
        "Cắt số chủ đề học còn 1, gắn 1 kết quả nhỏ mỗi tuần. Học mà không có kết quả là tín hiệu tiến bộ ảo.",
      too_ambitious:
        "Đổi mục tiêu sang một kỹ năng con cụ thể (ví dụ: cơ chế ownership trong Rust thay vì 'thành thạo Rust') để có thể đo được trong 12 tuần.",
    },
  },
  health_fitness: {
    bottleneckOverlay: {
      time: "Tập đều 3 buổi ngắn quan trọng hơn 1 buổi dài. Cắt thời lượng, giữ tần suất.",
      energy: "Sức khỏe phụ thuộc recovery: ngủ và ăn quan trọng tuần 1 hơn cường độ buổi tập.",
      resources:
        "Cần đo mốc hiện tại thật (cân, nhịp tim, kỹ thuật) trước khi tăng tải. Chấn thương từ kỹ thuật sai là rủi ro chính.",
      routine: "Khóa lịch tập cố định và bảo vệ nó như cuộc họp — không 'tập khi rảnh'.",
    },
    firstWeek: {
      realistic:
        "Tuần 1 nhẹ: kiểm tra kỹ thuật, đo mốc hiện tại (cân, nhịp tim), 3 buổi ngắn. Giữ nhịp bền vững — đừng cố lập kỷ lục tuần đầu.",
      challenging: "Tuần 1 chỉ giữ frequency, không tăng tải. Ngày nghỉ có chủ đích quan trọng như ngày tập.",
      too_ambitious:
        "Tuần 1 hạ phạm vi: 2 buổi ngắn mỗi tuần ở mức rất nhẹ. Phục hồi + giấc ngủ tuần 1 quan trọng hơn cường độ.",
    },
    scope: {
      challenging:
        "Nhịp bền vững: cắt 30% mục tiêu nếu giảm cân/lên cơ quá nhanh. 12 tuần cần ngày nghỉ rõ và 1 buổi nhẹ hằng tuần.",
      too_ambitious:
        "Đặt lại mục tiêu thành con số an toàn (ví dụ: 0.5kg/tuần thay vì 1kg/tuần). Nguy cơ kiệt sức hoặc chấn thương cao hơn lợi ích thúc ép.",
    },
  },
  career_growth: {
    bottleneckOverlay: {
      time: "Chốt 1-2 khung làm sâu cố định và 1 buổi 1:1 với mentor/quản lý hằng tuần.",
      clarity:
        "Mục tiêu nghề nghiệp thường đặt ở kết quả ngoài tầm (thăng chức). Đặt lại thành việc bạn kiểm soát được (số kết quả công việc, số buổi 1:1).",
      resources: "Tìm 1 mentor cùng cấp hoặc cao hơn trước tuần 2. Tự làm hết một mình là kiểu thất bại phổ biến.",
      obstacle: "Người liên quan/quản lý cần biết kế hoạch của bạn từ tuần 1, không phải tuần 12.",
    },
    firstWeek: {
      realistic:
        "Tuần 1 chốt khung làm sâu + 1 buổi 1:1 với người liên quan. Viết ra 12 kết quả công việc cụ thể, không phải 'chứng minh giá trị'.",
      challenging:
        "Tuần 1 thu hẹp còn 3 kết quả công việc rõ ràng + 1 buổi góp ý. Bỏ qua nhiễu quanh chuyện thăng chức.",
      too_ambitious:
        "Tuần 1 đặt lại mục tiêu về việc trong tầm kiểm soát: bao nhiêu kết quả công việc mỗi tuần. Thăng chức là kết quả phụ thuộc người khác.",
    },
    scope: {
      challenging:
        "Cắt số kết quả công việc còn 3-4 thật cụ thể. Phát triển nghề nghiệp bền là nhịp đều, không phải nước rút cuối quý.",
      too_ambitious:
        "Đổi mục tiêu từ 'đạt vị trí Senior' (ngoài tầm) sang 'hoàn thành 12 kết quả công việc cụ thể' (trong tầm). Kết quả tự đến.",
    },
  },
  financial_goal: {
    bottleneckOverlay: {
      time: "Tài chính cần 5-10p/ngày để theo dõi, không phải buổi dài. Thiết lập tự động hóa thay vì làm tay.",
      routine: "Chuyển khoản tiết kiệm tự động vào ngày lương — đừng dựa vào ý chí cuối tháng.",
      resources: "Cần 1 hệ thống theo dõi (YNAB, Excel) trước khi đặt số tiết kiệm. Theo dõi mới biết thật.",
      obstacle: "Thu nhập biến động là rủi ro lớn nhất. Cần plan B (giảm % tiết kiệm tháng thấp).",
    },
    firstWeek: {
      realistic:
        "Tuần 1 thiết lập theo dõi + chuyển khoản tự động. Đừng đặt số tiết kiệm to tuần đầu — kiểm chứng dòng tiền trước.",
      challenging: "Tuần 1 chỉ theo dõi chi tiêu hằng ngày 5-10p. Số tiết kiệm tuần đầu nên thấp hơn mục tiêu dài hạn.",
      too_ambitious: "Tuần 1 hạ mục tiêu xuống 50% và tạo khoảng đệm 1-2 tuần trước khi cam kết toàn bộ kế hoạch.",
    },
    scope: {
      challenging:
        "Đặt hành động có thể kiểm soát (% thu nhập tiết kiệm, số lần theo dõi) thay vì số tiền tuyệt đối phụ thuộc thu nhập.",
      too_ambitious:
        "Đặt lại mục tiêu sang hành động kiểm soát được: số tuần theo dõi đủ + tỷ lệ tiết kiệm. Số tiền tuyệt đối là kết quả, không phải việc lặp lại.",
    },
  },
  exam_study: {
    bottleneckOverlay: {
      time: "Thi cử có hạn chót cứng — tuần 1 phải làm đề thi thử để biết mốc hiện tại, không học lan man.",
      clarity: "Band/level cuối là phi tuyến. Đo bằng số đề thi thử + điểm thử thay vì hi vọng band tăng đều.",
      resources: "Cần đề thi thật + người chữa speaking/writing. Tự học không có feedback là lỗ thủng lớn nhất.",
      confidence: "Tuần 1 làm 1 đề đầy đủ để biết mốc hiện tại thật, kể cả khi sợ điểm thấp.",
    },
    firstWeek: {
      realistic:
        "Tuần 1 làm 1 đề thi thử để biết mốc hiện tại thật. Sau đó ưu tiên kỹ năng yếu nhất, không học dàn trải 4 kỹ năng.",
      challenging: "Tuần 1 chỉ làm 1 đề + review lỗi + spaced repetition cho kỹ năng yếu. Bỏ qua tham vọng band cuối.",
      too_ambitious:
        "Tuần 1 hạ mục tiêu xuống nửa band và làm 2 đề thi thử để mốc hiện tại rõ. Mức điểm lớn cần thời gian phi tuyến.",
    },
    scope: {
      challenging:
        "Cắt còn 2 kỹ năng ưu tiên. Spaced repetition + đề thi thử mỗi tuần quan trọng hơn nạp ngữ pháp mới.",
      too_ambitious:
        "Hạ mục tiêu 0.5 band hoặc kéo dài lộ trình. Mức điểm band là phi tuyến — IELTS 6.5→7.5 cần nhiều hơn 5.5→6.5 ở cùng quỹ thời gian.",
    },
  },
  project_completion: {
    bottleneckOverlay: {
      clarity: "Dự án dễ phình phạm vi. Mốc tuần 4 và tuần 8 phải rõ trước khi bắt đầu, không phải để 'thấy sao'.",
      resources: "Liệt kê phần phụ thuộc (API, người, ngân sách) tuần 1 — bị chặn sớm là chết kế hoạch.",
      time: "Cắt phạm vi, không cắt kết quả chính. Một tính năng hoàn tất tốt hơn ba tính năng dở.",
      obstacle:
        "Góp ý từ người liên quan cần có từ tuần 2-3, không phải tuần 12. Làm trong khoảng trống là kiểu dễ thất bại.",
    },
    firstWeek: {
      realistic:
        "Tuần 1 chốt phạm vi MVP + danh sách phần phụ thuộc + lịch góp ý người dùng. Mốc tuần 4 và 8 phải cụ thể.",
      challenging:
        "Tuần 1 cắt 30% phạm vi. Liệt kê phần phụ thuộc có thể chặn tiến độ và phương án dự phòng cho từng phần.",
      too_ambitious:
        "Tuần 1 đổi mục tiêu sang 'hoàn tất 1 phần nhỏ' thay vì cả dự án. Phạm vi phình to là rủi ro chính của mục tiêu dự án.",
    },
    scope: {
      challenging:
        "Định nghĩa lại phạm vi tối thiểu khả thi (MVP). Đặt mốc tuần 4 (50% phạm vi) và tuần 8 (80% phạm vi) trước khi tăng tốc.",
      too_ambitious:
        "Cắt phạm vi còn 1 kết quả chính + 1 buổi góp ý/tuần. Hoàn thành dự án bền là ra bản nhỏ sớm + cải thiện dần, không phải ra mắt hoàn hảo ở tuần 12.",
    },
  },
  habit_building: {
    bottleneckOverlay: {
      routine:
        "Thói quen cần tín hiệu kích hoạt + môi trường, không phải ý chí. Gắn thói quen vào nhịp quen thuộc có sẵn (sau cà phê sáng, trước bữa tối...).",
      energy: "Thói quen tuần 1 phải rất dễ — 2 phút thay vì 30 phút. Chuỗi ngày quan trọng hơn cường độ.",
      time: "Cắt thói quen về phiên bản 2-phút và gắn tín hiệu rõ. 'Tôi sẽ đọc 30p' luôn thua 'sau cà phê sáng tôi đọc 1 trang'.",
      confidence: "Thói quen khởi đầu bằng thắng nhỏ liên tiếp, không phải ngày bắt đầu hoành tráng.",
    },
    firstWeek: {
      realistic:
        "Tuần 1 chọn thói quen ở phiên bản 2-phút và gắn tín hiệu cụ thể (sau cà phê, trước đánh răng). Chuỗi 7 ngày liên tiếp quan trọng hơn cường độ.",
      challenging:
        "Tuần 1 giảm friction tối đa: chuẩn bị môi trường (sách trên bàn, đồ tập sẵn). Bỏ qua tham vọng tần suất tuần đầu.",
      too_ambitious:
        "Tuần 1 chỉ giữ 1 thói quen ở phiên bản dễ nhất. Nhiều thói quen cùng lúc là lý do phổ biến nhất khiến thói quen chết.",
    },
    scope: {
      challenging:
        "Chọn 1 thói quen chính + 1 tín hiệu cố định. Nhiều thói quen cùng lúc làm chuỗi ngày vỡ trong 2 tuần.",
      too_ambitious: "Hạ tần suất xuống 3 lần/tuần thay vì hằng ngày. Hằng ngày dễ vỡ chuỗi; 3-5 lần/tuần dễ phục hồi.",
    },
  },
  creative_output: {
    bottleneckOverlay: {
      confidence: "Sáng tạo bị chặn bởi 'chưa đủ tốt để đưa ra'. Tuần 1 hoàn tất 1 bản thô — cầu toàn là kẻ thù chính.",
      clarity: "Đặt nhịp xuất bản (1 bài/tuần) thay vì 'viết khi có cảm hứng'.",
      time: "Buổi sáng tác ngắn cố định + buổi sửa tách rời. Đừng sửa trong lúc viết.",
      routine: "Lịch xuất bản cố định mới tạo nhịp. 'Khi xong sẽ đăng' = không bao giờ đăng.",
    },
    firstWeek: {
      realistic: "Tuần 1 hoàn tất 1 tác phẩm bản thô — không sửa vô hạn. Đặt lịch xuất bản cố định ngay tuần đầu.",
      challenging: "Tuần 1 cam kết 1 tác phẩm thay vì 3. Tách buổi sáng tác và buổi sửa để tránh bị cầu toàn chặn lại.",
      too_ambitious:
        "Tuần 1 chỉ hoàn tất 1 phiên bản thô nhất có thể. Nhịp xuất bản quan trọng hơn chất lượng tác phẩm tuần đầu.",
    },
    scope: {
      challenging: "Cắt số tác phẩm còn 1/tuần. Lần sửa thứ 3 không tăng giá trị bằng tác phẩm tiếp theo.",
      too_ambitious:
        "Đặt lại mục tiêu sang số tác phẩm xuất bản, không phải chất lượng. Nhịp hoàn tất đều là chỉ số quan trọng nhất.",
    },
  },
  relationship_life: {
    bottleneckOverlay: {
      routine: "Quan hệ chắc khi có ngày/giờ cố định, không phải 'khi rảnh thì gặp'.",
      time: "Khóa 1 buổi cố định mỗi tuần và bảo vệ nó như cuộc họp.",
      clarity:
        "Đặt việc mình kiểm soát ('mình sẽ gọi 1 buổi/tuần') thay vì kết quả phụ thuộc người khác ('quan hệ tốt hơn').",
      obstacle: "Lịch chen ngang là rủi ro lớn nhất — đặt buổi cố định trong calendar trước.",
    },
    firstWeek: {
      realistic:
        "Tuần 1 chốt 1 ngày/giờ cố định trong tuần. Một hành động nhỏ thể hiện quan tâm quan trọng hơn buổi gặp dài.",
      challenging: "Tuần 1 đặt 1 buổi 30 phút cố định + 1 hành động nhỏ. Bỏ qua tham vọng 'quan hệ sâu sắc tuần đầu'.",
      too_ambitious: "Tuần 1 chỉ giữ 1 ngày cố định trong tuần. Đa hoạt động cùng lúc dễ vỡ.",
    },
    scope: {
      challenging: "Đặt việc có thể kiểm soát (số buổi gặp, lần gọi) thay vì kết quả phụ thuộc người khác.",
      too_ambitious: "Hạ tần suất xuống 1 buổi cố định/tuần. Quan hệ chắc lên từ consistency, không phải intensity.",
    },
  },
  other: null,
};

export interface ArchetypeFeasibilityOverride {
  firstWeekGuidance: string | null;
  scopeRecommendation: string | null;
  bottleneckOverlayNote: string | null;
}

export function getArchetypeFeasibilityOverride(
  archetype: GoalArchetype | undefined,
  resultType: ResultType,
  bottleneckAxis: FeasibilityAxis | "wheel",
): ArchetypeFeasibilityOverride {
  if (!archetype) {
    return { firstWeekGuidance: null, scopeRecommendation: null, bottleneckOverlayNote: null };
  }
  const copy = ARCHETYPE_COPY[archetype];
  if (!copy) {
    return { firstWeekGuidance: null, scopeRecommendation: null, bottleneckOverlayNote: null };
  }

  return {
    firstWeekGuidance: copy.firstWeek[resultType] ?? null,
    scopeRecommendation: copy.scope[resultType] ?? null,
    bottleneckOverlayNote: copy.bottleneckOverlay?.[bottleneckAxis] ?? null,
  };
}
