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
      resources: "Chuẩn bị 1 dự án nhỏ làm output đầu tiên thay vì học lý thuyết tuần đầu.",
      clarity: "Thu hẹp phạm vi học còn 1 chủ đề và 1 sản phẩm thực hành đo được.",
    },
    firstWeek: {
      realistic:
        "Tuần 1 chọn 1 dự án nhỏ làm output đầu tiên và 3 buổi luyện cố định. Mục tiêu là tạo feedback loop, không phải nạp lý thuyết.",
      challenging:
        "Tuần 1 chỉ làm 1 sản phẩm rất nhỏ (mini project) và một buổi pair review. Đừng học song song nhiều khóa.",
      too_ambitious:
        "Tuần 1 thu hẹp về 1 buổi luyện 30p mỗi 2 ngày và một bài tập đầu ra. Lý thuyết để sau khi nhịp ổn.",
    },
    scope: {
      challenging:
        "Cắt số chủ đề học còn 1, gắn 1 deliverable nhỏ mỗi tuần. Học mà không có output là tín hiệu tiến bộ ảo.",
      too_ambitious:
        "Đổi mục tiêu sang một sub-skill cụ thể (ví dụ: Rust ownership thay vì 'thành thạo Rust') để có thể đo được trong 12 tuần.",
    },
  },
  health_fitness: {
    bottleneckOverlay: {
      time: "Tập đều 3 buổi ngắn quan trọng hơn 1 buổi dài. Cắt thời lượng, giữ tần suất.",
      energy:
        "Sức khỏe phụ thuộc recovery: ngủ và ăn quan trọng tuần 1 hơn cường độ buổi tập.",
      resources: "Cần đo baseline thật (cân, nhịp tim, form) trước khi tăng tải. Chấn thương từ form sai là rủi ro chính.",
      routine: "Khóa lịch tập cố định và bảo vệ nó như cuộc họp — không 'tập khi rảnh'.",
    },
    firstWeek: {
      realistic:
        "Tuần 1 nhẹ: kiểm tra form, đo baseline (cân, HR), 3 buổi ngắn. Giữ pace bền vững — đừng PR tuần đầu.",
      challenging:
        "Tuần 1 chỉ giữ frequency, không tăng tải. Ngày nghỉ có chủ đích quan trọng như ngày tập.",
      too_ambitious:
        "Tuần 1 hạ scope: 2 buổi ngắn mỗi tuần ở mức rất nhẹ. Recovery + giấc ngủ tuần 1 quan trọng hơn cường độ.",
    },
    scope: {
      challenging:
        "Sustainable pace: cắt 30% target nếu giảm cân/lên cơ quá nhanh. 12 tuần cần ngày nghỉ rõ và 1 buổi nhẹ hằng tuần.",
      too_ambitious:
        "Đặt lại target thành con số an toàn (ví dụ: 0.5kg/tuần thay vì 1kg/tuần). Nguy cơ kiệt sức hoặc chấn thương cao hơn lợi ích thúc ép.",
    },
  },
  career_growth: {
    bottleneckOverlay: {
      time: "Lock 1-2 deep work block cố định và 1 buổi 1:1 với mentor/manager hằng tuần.",
      clarity:
        "Career goal thường đặt ở kết quả ngoài tầm (promotion). Đặt lại thành input bạn kiểm soát được (số deliverable, số 1:1).",
      resources: "Tìm 1 mentor cùng cấp hoặc cao hơn trước tuần 2. Tự làm hết một mình là pattern thất bại phổ biến.",
      obstacle: "Stakeholder/manager cần biết kế hoạch của bạn từ tuần 1, không phải tuần 12.",
    },
    firstWeek: {
      realistic:
        "Tuần 1 lock deep work block + 1 buổi 1:1 stakeholder. Viết ra 12 deliverable IDP cụ thể, không phải 'chứng minh giá trị'.",
      challenging:
        "Tuần 1 thu hẹp còn 3 deliverable rõ ràng + 1 buổi feedback. Bỏ qua noise quanh promotion.",
      too_ambitious:
        "Tuần 1 đặt lại mục tiêu về input: bao nhiêu deliverable mỗi tuần. Promotion là kết quả phụ thuộc người khác.",
    },
    scope: {
      challenging:
        "Cắt số deliverable còn 3-4 thật cụ thể. Career growth bền là nhịp đều, không phải sprint cuối quý.",
      too_ambitious:
        "Đổi mục tiêu từ 'đạt vị trí Senior' (ngoài tầm) sang 'hoàn thành 12 deliverable IDP' (trong tầm). Kết quả tự đến.",
    },
  },
  financial_goal: {
    bottleneckOverlay: {
      time: "Tài chính cần 5-10p/ngày để track, không phải buổi dài. Set up tự động hóa thay vì làm tay.",
      routine:
        "Chuyển khoản tiết kiệm tự động vào ngày lương — đừng dựa vào ý chí cuối tháng.",
      resources: "Cần 1 hệ thống track (YNAB, Excel) trước khi đặt số tiết kiệm. Track mới biết thật.",
      obstacle: "Thu nhập biến động là rủi ro lớn nhất. Cần plan B (giảm % tiết kiệm tháng thấp).",
    },
    firstWeek: {
      realistic:
        "Tuần 1 set up tracking + chuyển khoản tự động. Đừng đặt số tiết kiệm to tuần đầu — kiểm chứng dòng tiền trước.",
      challenging:
        "Tuần 1 chỉ track chi tiêu hằng ngày 5-10p. Số tiết kiệm tuần đầu nên thấp hơn target dài hạn.",
      too_ambitious:
        "Tuần 1 hạ target xuống 50% và build runway 1-2 tuần trước khi cam kết toàn bộ kế hoạch.",
    },
    scope: {
      challenging:
        "Đặt action có thể kiểm soát (% income tiết kiệm, số lần track) thay vì số tiền tuyệt đối phụ thuộc thu nhập.",
      too_ambitious:
        "Đặt lại target sang controllable action: số tuần track đủ + tỷ lệ saving rate. Số tiền tuyệt đối là output, không phải input.",
    },
  },
  exam_study: {
    bottleneckOverlay: {
      time: "Thi cử có deadline cứng — tuần 1 phải làm đề thi thử để biết baseline, không học lan man.",
      clarity:
        "Band/level cuối là phi tuyến. Đo bằng số đề thi thử + điểm thử thay vì hi vọng band tăng đều.",
      resources: "Cần đề thi thật + người chữa speaking/writing. Tự học không có feedback là lỗ thủng lớn nhất.",
      confidence: "Tuần 1 làm 1 đề full để biết baseline thật, kể cả khi sợ điểm thấp.",
    },
    firstWeek: {
      realistic:
        "Tuần 1 làm 1 đề thi thử để biết baseline thật. Sau đó ưu tiên kỹ năng yếu nhất, không học dàn trải 4 kỹ năng.",
      challenging:
        "Tuần 1 chỉ làm 1 đề + review lỗi + spaced repetition cho kỹ năng yếu. Bỏ qua tham vọng band cuối.",
      too_ambitious:
        "Tuần 1 hạ target xuống nửa band và làm 2 đề thi thử để baseline rõ. Band lớn cần thời gian phi tuyến.",
    },
    scope: {
      challenging:
        "Cắt còn 2 kỹ năng ưu tiên. Spaced repetition + đề thi thử mỗi tuần quan trọng hơn nạp ngữ pháp mới.",
      too_ambitious:
        "Hạ target band 0.5 hoặc kéo dài timeline. Band score là phi tuyến — IELTS 6.5→7.5 cần nhiều hơn 5.5→6.5 ở cùng quỹ thời gian.",
    },
  },
  project_completion: {
    bottleneckOverlay: {
      clarity:
        "Dự án dễ phình scope. Mốc tuần 4 và tuần 8 phải rõ trước khi bắt đầu, không phải để 'thấy sao'.",
      resources: "Liệt kê dependencies (API, người, ngân sách) tuần 1 — block sớm là chết kế hoạch.",
      time: "Cắt scope, không cắt deliverable. Một feature ship được tốt hơn ba feature dở.",
      obstacle: "Stakeholder feedback từ tuần 2-3, không phải tuần 12. Build trong vacuum là pattern thất bại.",
    },
    firstWeek: {
      realistic:
        "Tuần 1 chốt MVP scope + danh sách dependencies + lịch user feedback. Mốc tuần 4 và 8 phải concrete.",
      challenging:
        "Tuần 1 cắt 30% scope. Liệt kê dependencies có thể block và phương án dự phòng cho từng cái.",
      too_ambitious:
        "Tuần 1 đổi mục tiêu sang 'ship 1 phần nhỏ' thay vì cả dự án. Scope creep là rủi ro chính của project goals.",
    },
    scope: {
      challenging:
        "Định nghĩa lại scope tối thiểu khả thi (MVP). Đặt mốc tuần 4 (50% scope) và tuần 8 (80% scope) trước khi tăng tốc.",
      too_ambitious:
        "Cắt scope còn 1 deliverable chính + 1 feedback session/tuần. Project completion bền là ship sớm + iterate, không phải perfect launch tuần 12.",
    },
  },
  habit_building: {
    bottleneckOverlay: {
      routine:
        "Habit cần cue + môi trường, không phải ý chí. Gắn habit vào routine có sẵn (sau cà phê sáng, trước bữa tối...).",
      energy: "Habit tuần 1 phải rất dễ — 2 phút thay vì 30 phút. Streak quan trọng hơn cường độ.",
      time: "Cắt habit về phiên bản 2-phút và gắn cue rõ. 'Tôi sẽ đọc 30p' luôn thua 'sau cà phê sáng tôi đọc 1 trang'.",
      confidence:
        "Habit khởi đầu bằng thắng nhỏ liên tiếp, không phải ngày bắt đầu hoành tráng.",
    },
    firstWeek: {
      realistic:
        "Tuần 1 chọn habit ở phiên bản 2-phút và gắn cue cụ thể (sau cà phê, trước đánh răng). Streak 7 ngày liên tiếp quan trọng hơn cường độ.",
      challenging:
        "Tuần 1 giảm friction tối đa: chuẩn bị môi trường (sách trên bàn, đồ tập sẵn). Bỏ qua tham vọng tần suất tuần đầu.",
      too_ambitious:
        "Tuần 1 chỉ giữ 1 habit ở phiên bản dễ nhất. Đa habit cùng lúc là lý do phổ biến nhất khiến habit chết.",
    },
    scope: {
      challenging:
        "Chọn 1 habit chính + 1 cue cố định. Đa habit cùng lúc làm streak vỡ trong 2 tuần.",
      too_ambitious:
        "Hạ tần suất xuống 3 lần/tuần thay vì hằng ngày. Hằng ngày dễ vỡ streak; 3-5 lần/tuần dễ phục hồi.",
    },
  },
  creative_output: {
    bottleneckOverlay: {
      confidence:
        "Sáng tạo bị chặn bởi 'chưa đủ tốt để ship'. Tuần 1 ship 1 thứ rough — perfectionism là kẻ thù chính.",
      clarity: "Đặt cadence xuất bản (1 post/tuần) thay vì 'viết khi có cảm hứng'.",
      time: "Buổi sáng tác ngắn cố định + buổi edit tách rời. Đừng edit trong lúc viết.",
      routine: "Lịch xuất bản cố định mới tạo cadence. 'Khi xong sẽ đăng' = không bao giờ đăng.",
    },
    firstWeek: {
      realistic:
        "Tuần 1 ship 1 tác phẩm rough — không edit vô hạn. Đặt lịch xuất bản cố định ngay tuần đầu.",
      challenging:
        "Tuần 1 cam kết 1 tác phẩm thay vì 3. Tách buổi sáng tác và buổi edit để tránh perfectionism block.",
      too_ambitious:
        "Tuần 1 chỉ ship 1 phiên bản rough nhất có thể. Cadence xuất bản quan trọng hơn chất lượng tác phẩm tuần đầu.",
    },
    scope: {
      challenging:
        "Cắt số tác phẩm còn 1/tuần. Edit pass thứ 3 không tăng giá trị bằng tác phẩm tiếp theo.",
      too_ambitious:
        "Đặt lại target sang số tác phẩm xuất bản, không phải chất lượng. Cadence ship là metric quan trọng nhất.",
    },
  },
  relationship_life: {
    bottleneckOverlay: {
      routine:
        "Quan hệ chắc khi có ngày/giờ cố định, không phải 'khi rảnh thì gặp'.",
      time: "Khóa 1 buổi cố định mỗi tuần và bảo vệ nó như cuộc họp.",
      clarity:
        "Đặt input mình kiểm soát ('mình sẽ gọi 1 buổi/tuần') thay vì kết quả phụ thuộc người khác ('quan hệ tốt hơn').",
      obstacle: "Lịch chen ngang là rủi ro lớn nhất — đặt buổi cố định trong calendar trước.",
    },
    firstWeek: {
      realistic:
        "Tuần 1 chốt 1 ngày/giờ cố định trong tuần. Một hành động nhỏ thể hiện quan tâm quan trọng hơn buổi gặp dài.",
      challenging:
        "Tuần 1 đặt 1 buổi 30 phút cố định + 1 hành động nhỏ. Bỏ qua tham vọng 'quan hệ sâu sắc tuần đầu'.",
      too_ambitious:
        "Tuần 1 chỉ giữ 1 ngày cố định trong tuần. Đa hoạt động cùng lúc dễ vỡ.",
    },
    scope: {
      challenging:
        "Đặt input có thể kiểm soát (số buổi gặp, lần gọi) thay vì kết quả phụ thuộc người khác.",
      too_ambitious:
        "Hạ tần suất xuống 1 buổi cố định/tuần. Quan hệ chắc lên từ consistency, không phải intensity.",
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
