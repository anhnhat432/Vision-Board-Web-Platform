import type { GoalArchetype } from "@/lib/smart-goal";

import type { WeeklyTaskLoadPreference } from "./taskConstraints";

/**
 * Archetype-aware plan generation defaults.
 *
 * Pure module. Given a goal archetype, returns default lead indicator
 * suggestions, milestone templates, week-1 focus, suggested starting load,
 * review prompt, anti-pattern warnings, and keyword signals that planQuality
 * can use to detect archetype-shape mismatches.
 *
 * These defaults are suggestions — they never block plan creation and never
 * rewrite user input. `generate12WeekPlan` uses them only when an archetype
 * is supplied and the user has not yet filled in fields.
 */

export interface ArchetypeFirstAction {
  /**
   * Concrete first action for week 1 at standard feasibility.
   * Action verb + small deliverable doable inside 24-48h.
   */
  standard: string;
  /**
   * Smaller "setup / start small" first action used when feasibility is low
   * (lighter plan load, low weekly capacity, energy/confidence bottleneck).
   * Should be doable in <30 minutes today/tomorrow with no heavy prep.
   */
  lowFeasibility: string;
}

export interface ArchetypePlanFullDefaults {
  /** 2-3 example lead indicator names for this archetype. */
  leadIndicatorSuggestions: readonly string[];
  /** Template milestone strings user can adapt. */
  milestoneTemplates: {
    week4: string;
    week8: string;
    week12: string;
  };
  /** Suggested week-1 focus text (used as `Week.focus` default). */
  weekOneFocus: string;
  /** Suggested week-1 expectedOutput (used as `Week.expectedOutput` default). */
  weekOneExpectedOutput: string;
  /**
   * Concrete first action for week 1 — used by Week 1 Startability logic to
   * seed a clear starter task. Two sizes: standard and a smaller variant
   * for low-feasibility cases.
   */
  firstAction: ArchetypeFirstAction;
  /** Suggested starting tactic load — skill/project can push, health/habit should go lighter. */
  weekOneTacticLoadHint: WeeklyTaskLoadPreference;
  /** Short review prompt hint for this archetype. */
  reviewPrompt: string;
  /** Anti-pattern warnings user should avoid. */
  antiPatterns: readonly string[];
  /**
   * Keyword signals used by planQuality to detect plan-archetype match.
   * All lowercase, accent-sensitive — matched as substrings.
   */
  requiredSignals: {
    /** At least one lead indicator name should include one of these. */
    leadIndicatorKeywords: readonly string[];
    /** At least one milestone should include one of these. */
    milestoneKeywords: readonly string[];
  };
}

const DEFAULTS: Record<GoalArchetype, ArchetypePlanFullDefaults> = {
  skill_learning: {
    leadIndicatorSuggestions: [
      "Luyện tập / làm bài thực hành",
      "Đọc tài liệu chính",
      "Pair review hoặc demo nhỏ",
    ],
    milestoneTemplates: {
      week4: "Hoàn thành 1 dự án nhỏ làm output đầu tiên.",
      week8: "Ship phiên bản thứ 2 sau khi nhận feedback.",
      week12: "Có portfolio hoặc 3-4 sản phẩm thực hành đo được.",
    },
    weekOneFocus: "Chọn 1 dự án nhỏ làm output đầu tiên, bắt đầu feedback loop.",
    weekOneExpectedOutput: "1 mini project chạy được + 1 buổi pair review/demo nhỏ.",
    firstAction: {
      standard: "Lên lịch 1 buổi luyện tập 30-60 phút trong 24h tới và viết tên buổi vào lịch.",
      lowFeasibility: "Đặt lịch 1 buổi luyện 15 phút ngay hôm nay hoặc ngày mai — chỉ cần bắt đầu, chưa cần dài.",
    },
    weekOneTacticLoadHint: "balanced",
    reviewPrompt: "Tuần này học được kỹ năng nào mới? Có output nào để demo chưa?",
    antiPatterns: [
      "Học lý thuyết không có sản phẩm — dễ ảo tưởng tiến bộ.",
      "Dùng số giờ học làm metric chính thay vì số sản phẩm.",
      "Chọn quá nhiều khóa học song song, không hoàn thành khóa nào.",
    ],
    requiredSignals: {
      leadIndicatorKeywords: ["luyện", "luyen", "làm", "lam ", "thực hành", "thuc hanh", "code", "demo", "practice", "output", "project", "dự án", "du an"],
      milestoneKeywords: ["output", "project", "dự án", "du an", "ship", "sản phẩm", "san pham", "demo", "portfolio"],
    },
  },
  health_fitness: {
    leadIndicatorSuggestions: [
      "Buổi cardio chính",
      "Buổi strength",
      "Mobility / recovery ngắn",
    ],
    milestoneTemplates: {
      week4: "Giữ được frequency 3 buổi/tuần và đo được baseline (nhịp tim, tạ, km).",
      week8: "Tăng tải ~15% so với tuần 4 nhưng vẫn giữ ngày nghỉ.",
      week12: "Đạt chỉ số mục tiêu ở mức bền vững, không chấn thương.",
    },
    weekOneFocus: "Tuần 1 nhẹ: đo baseline, kiểm tra form, làm quen nhịp.",
    weekOneExpectedOutput: "3 buổi ngắn đã làm + ghi chú baseline (cân, nhịp tim, form).",
    firstAction: {
      standard: "Đo baseline trong 24h tới (cân, nhịp tim, hoặc 1 set thử) và ghi lại.",
      lowFeasibility: "Hôm nay đi bộ 10-15 phút và ghi 1 dòng baseline. Chỉ cần thế là tuần 1 đã bắt đầu.",
    },
    weekOneTacticLoadHint: "lighter",
    reviewPrompt: "Tuần này ngủ đủ không? Form có ổn không? Có cần ngày nghỉ thêm không?",
    antiPatterns: [
      "Tuần 1 push PR hoặc tăng tải mạnh — nguy cơ chấn thương sớm.",
      "Không có ngày nghỉ có chủ đích trong tuần.",
      "Đặt mục tiêu giảm cân/lên cơ nhanh hơn mức an toàn (> 1kg/tuần).",
    ],
    requiredSignals: {
      leadIndicatorKeywords: ["tập", "tap ", "workout", "cardio", "strength", "buổi", "buoi", "chạy", "chay", "run", "yoga", "mobility", "recovery"],
      milestoneKeywords: ["buổi", "buoi", "tuần", "tuan", "km", "kg", "frequency", "nhịp", "nhip", "form", "baseline", "recovery"],
    },
  },
  career_growth: {
    leadIndicatorSuggestions: [
      "Deep work block",
      "1:1 với stakeholder / mentor",
      "Demo prep / feedback session",
    ],
    milestoneTemplates: {
      week4: "Hoàn thành 3-4 deliverable IDP và có 2 buổi 1:1.",
      week8: "Ship deliverable lớn + feedback từ stakeholder.",
      week12: "Có 12 deliverable cụ thể và 1 bản self-review.",
    },
    weekOneFocus: "Lock lịch deep work + book 1 buổi 1:1 với mentor/manager.",
    weekOneExpectedOutput: "2 deep work block đã chạy + 1 buổi 1:1 đã họp.",
    firstAction: {
      standard: "Đặt lịch 1 buổi deep work 60-90 phút trong 48h tới và gửi tin nhắn xin 1:1 với mentor.",
      lowFeasibility: "Hôm nay block 30 phút deep work trên lịch và soạn 1 tin nhắn xin 1:1 (chưa cần gửi cũng được).",
    },
    weekOneTacticLoadHint: "balanced",
    reviewPrompt: "Có deliverable nào ship được tuần này? Có stakeholder nào cần update?",
    antiPatterns: [
      "Đặt mục tiêu kết quả ngoài tầm (promotion) thay vì input kiểm soát được.",
      "Chỉ làm việc lớn, không có việc nhỏ giữ nhịp hằng tuần.",
      "Tự làm hết một mình, không có mentor/stakeholder.",
    ],
    requiredSignals: {
      leadIndicatorKeywords: ["deep work", "1:1", "mentor", "stakeholder", "demo", "deliverable", "feedback", "review", "họp", "hop "],
      milestoneKeywords: ["deliverable", "1:1", "review", "mentor", "stakeholder", "feedback", "self-review", "idp"],
    },
  },
  financial_goal: {
    leadIndicatorSuggestions: [
      "Track chi tiêu 5-10 phút",
      "Chuyển khoản tiết kiệm cố định",
      "Weekly money review",
    ],
    milestoneTemplates: {
      week4: "Tracking chi tiêu 4 tuần liên tiếp + chuyển khoản tự động đã set up.",
      week8: "Đạt saving rate mục tiêu 2 tuần liên tiếp + có runway 1 tháng.",
      week12: "Đạt milestone tiết kiệm + có báo cáo hằng tuần ổn định.",
    },
    weekOneFocus: "Set up tracking + tự động hóa saving, giữ số tiết kiệm nhẹ tuần đầu.",
    weekOneExpectedOutput: "Hệ thống tracking đã chạy + 1 lần chuyển khoản tự động đã thành công.",
    firstAction: {
      standard: "Mở app/sheet tracking trong 24h tới và set up 1 lệnh chuyển khoản tiết kiệm tự động.",
      lowFeasibility: "Hôm nay mở 1 sheet/app và ghi lại 3 khoản chi gần nhất. Chỉ cần thế.",
    },
    weekOneTacticLoadHint: "lighter",
    reviewPrompt: "Saving rate tuần này bao nhiêu? Chi tiêu có khoản nào bất ngờ?",
    antiPatterns: [
      "Đặt số tiết kiệm tuyệt đối phụ thuộc thu nhập biến động — không có plan B.",
      "Không track chi tiêu hằng tuần, chỉ check cuối kỳ.",
      "Chỉ có lag metric (số tiền) mà không có lead action (track/chuyển khoản/review).",
    ],
    requiredSignals: {
      leadIndicatorKeywords: ["track", "chi tiêu", "chi tieu", "tiết kiệm", "tiet kiem", "chuyển khoản", "chuyen khoan", "tự động", "tu dong", "review", "ngân sách", "ngan sach", "saving"],
      milestoneKeywords: ["saving", "tiết kiệm", "tiet kiem", "runway", "tracking", "báo cáo", "bao cao", "milestone", "chuyển khoản", "chuyen khoan"],
    },
  },
  exam_study: {
    leadIndicatorSuggestions: [
      "Đề thi thử hằng tuần",
      "Buổi luyện kỹ năng yếu nhất",
      "Review lỗi sau đề thi + spaced repetition",
    ],
    milestoneTemplates: {
      week4: "Hoàn thành 4 đề thi thử, có baseline và đã ưu tiên kỹ năng yếu nhất.",
      week8: "Điểm thử tăng 0.5 band (hoặc tương đương) so với tuần 1.",
      week12: "Đạt điểm thử ổn định ở mức mục tiêu trong 2 đề gần nhất.",
    },
    weekOneFocus: "Làm 1 đề thi thử full để biết baseline thật. Không học lan man.",
    weekOneExpectedOutput: "1 đề thi thử + danh sách lỗi + lịch spaced repetition.",
    firstAction: {
      standard: "Lên lịch làm 1 đề thi thử full trong 48h tới và in/lưu đề sẵn ngay hôm nay.",
      lowFeasibility: "Hôm nay làm 1 phần nhỏ của đề thi thử (15-20 phút) để biết baseline mỏng nhất.",
    },
    weekOneTacticLoadHint: "balanced",
    reviewPrompt: "Điểm thử tuần này so với tuần trước? Kỹ năng nào còn yếu?",
    antiPatterns: [
      "Đặt mục tiêu band/level cuối mà không có practice test cadence.",
      "Học dàn trải 4 kỹ năng cùng lúc thay vì ưu tiên yếu nhất.",
      "Không làm đề thi thử, chỉ học lý thuyết.",
    ],
    requiredSignals: {
      leadIndicatorKeywords: ["đề thi", "de thi", "đề thi thử", "de thi thu", "practice test", "mock test", "luyện", "luyen", "spaced repetition", "review lỗi", "review loi", "ôn", "on "],
      milestoneKeywords: ["đề thi", "de thi", "điểm", "diem ", "band", "practice test", "baseline", "mock"],
    },
  },
  project_completion: {
    leadIndicatorSuggestions: [
      "Build session",
      "User interview / feedback",
      "Ship review hoặc demo nội bộ",
    ],
    milestoneTemplates: {
      week4: "Ship được 50% scope MVP và có phản hồi từ user đầu tiên.",
      week8: "Đạt 80% scope MVP, đã fix dependency blocker, có 2 feedback session.",
      week12: "Ship MVP v1 công khai hoặc nội bộ với metric được đo rõ.",
    },
    weekOneFocus: "Chốt MVP scope + danh sách dependencies + lịch user feedback.",
    weekOneExpectedOutput: "Scope document + danh sách dependency + 1 build session khởi động.",
    firstAction: {
      standard: "Viết scope document 5-10 dòng cho MVP trong 24h tới (mục tiêu, in-scope, out-of-scope).",
      lowFeasibility: "Hôm nay viết 3 dòng scope: MVP làm gì, không làm gì, ai dùng đầu tiên. 10 phút là đủ.",
    },
    weekOneTacticLoadHint: "balanced",
    reviewPrompt: "Tuần này ship được gì? Có dependency nào đang block?",
    antiPatterns: [
      "Đặt launch MVP tuần 12 mà không có milestone rõ ở tuần 4 và 8.",
      "Build trong vacuum không có session feedback người dùng.",
      "Scope phình to giữa chu kỳ, mất focus.",
    ],
    requiredSignals: {
      leadIndicatorKeywords: ["build", "ship", "deliver", "demo", "feature", "user interview", "feedback", "deploy", "release", "pr ", "review"],
      milestoneKeywords: ["ship", "deliver", "mvp", "launch", "deploy", "scope", "release", "feature", "demo"],
    },
  },
  habit_building: {
    leadIndicatorSuggestions: [
      "Habit chính phiên bản 2 phút",
      "Ghi chú ngắn cuối ngày",
    ],
    milestoneTemplates: {
      week4: "Giữ streak habit chính ≥ 21 ngày phiên bản dễ.",
      week8: "Tăng cường độ habit lên mức mục tiêu, môi trường đã ổn định.",
      week12: "Habit tự chạy, không cần ý chí — môi trường + cue đã khóa.",
    },
    weekOneFocus: "Chọn habit phiên bản 2 phút, gắn cue cụ thể vào routine có sẵn.",
    weekOneExpectedOutput: "Streak 5-7 ngày phiên bản dễ + cue đã được test.",
    firstAction: {
      standard: "Đặt cue cụ thể (sau cà phê / trước đánh răng) và làm habit phiên bản 2 phút ngay hôm nay.",
      lowFeasibility: "Hôm nay làm habit phiên bản 1 phút sau 1 routine có sẵn. Quan trọng là bấm khởi động.",
    },
    weekOneTacticLoadHint: "lighter",
    reviewPrompt: "Streak còn giữ được không? Cue nào đang hoạt động tốt nhất?",
    antiPatterns: [
      "Habit tuần 1 quá khó — không xây được streak ban đầu.",
      "Nhiều habit cùng lúc — chọn 1 habit chính.",
      "Không có cue/trigger gắn với routine có sẵn.",
    ],
    requiredSignals: {
      leadIndicatorKeywords: ["habit", "cue", "2 phút", "2 phut", "routine", "streak", "môi trường", "moi truong", "ghi chú", "ghi chu", "daily", "hằng ngày", "hang ngay", "trigger"],
      milestoneKeywords: ["streak", "habit", "cue", "môi trường", "moi truong", "routine", "tự chạy", "tu chay", "21 ngày", "21 ngay"],
    },
  },
  creative_output: {
    leadIndicatorSuggestions: [
      "Buổi sáng tác / draft",
      "Buổi edit",
      "Lịch xuất bản (post / upload)",
    ],
    milestoneTemplates: {
      week4: "Xuất bản 4 tác phẩm rough, cadence đã hình thành.",
      week8: "Đã có 8 tác phẩm + 1 vòng feedback công khai.",
      week12: "Có body of work 10-12 tác phẩm, cadence ổn định.",
    },
    weekOneFocus: "Ship 1 tác phẩm rough tuần đầu. Bỏ qua tham vọng perfect.",
    weekOneExpectedOutput: "1 bài/tác phẩm đã publish + lịch xuất bản tuần kế tiếp.",
    firstAction: {
      standard: "Viết draft rough cho 1 tác phẩm trong 48h tới và đặt lịch publish cuối tuần.",
      lowFeasibility: "Hôm nay viết 100-200 chữ rough hoặc làm 1 sketch nhỏ. Chưa cần publish.",
    },
    weekOneTacticLoadHint: "balanced",
    reviewPrompt: "Tuần này publish được gì? Có bị block bởi 'chưa đủ tốt' không?",
    antiPatterns: [
      "Chỉ có metric 'viết tốt hơn' — không đếm được.",
      "Đăng dồn cuối kỳ, không có cadence xuất bản đều.",
      "Edit vô hạn, không ship.",
    ],
    requiredSignals: {
      leadIndicatorKeywords: ["viết", "viet ", "draft", "edit", "publish", "post", "upload", "bài", "bai ", "tác phẩm", "tac pham", "xuất bản", "xuat ban"],
      milestoneKeywords: ["bài", "bai ", "tác phẩm", "tac pham", "publish", "xuất bản", "xuat ban", "cadence", "body of work"],
    },
  },
  relationship_life: {
    leadIndicatorSuggestions: [
      "Thời gian chất lượng cố định trong tuần",
      "Một hành động nhỏ thể hiện quan tâm",
    ],
    milestoneTemplates: {
      week4: "Giữ được buổi cố định 4 tuần liên tiếp.",
      week8: "Cuộc trò chuyện / hành động sâu hơn đã diễn ra.",
      week12: "Nhịp quan hệ ổn định, không phụ thuộc cảm hứng.",
    },
    weekOneFocus: "Chốt 1 ngày/giờ cố định trong tuần. Một hành động nhỏ bắt đầu.",
    weekOneExpectedOutput: "1 buổi chất lượng đã diễn ra + 1 hành động nhỏ đã làm.",
    firstAction: {
      standard: "Nhắn tin chốt 1 buổi chất lượng vào ngày cố định trong tuần này.",
      lowFeasibility: "Hôm nay gửi 1 tin nhắn ngắn hỏi thăm hoặc chốt giờ cho buổi cuối tuần. 5 phút là đủ.",
    },
    weekOneTacticLoadHint: "lighter",
    reviewPrompt: "Buổi cố định tuần này còn giữ được không? Người bên cạnh cảm thấy sao?",
    antiPatterns: [
      "Đặt mục tiêu cho người khác thay vì input của mình.",
      "Không có ngày cố định trong tuần, dựa vào 'khi rảnh'.",
      "Đo bằng cảm xúc thay vì hành động.",
    ],
    requiredSignals: {
      leadIndicatorKeywords: ["buổi", "buoi", "gặp", "gap ", "gọi", "goi ", "chất lượng", "chat luong", "hành động", "hanh dong", "thời gian", "thoi gian"],
      milestoneKeywords: ["buổi", "buoi", "nhịp", "nhip", "tuần", "tuan", "cố định", "co dinh", "liên tiếp", "lien tiep"],
    },
  },
  other: {
    leadIndicatorSuggestions: [
      "1-2 việc cốt lõi đo được",
      "Một buổi nhìn lại ngắn hằng tuần",
    ],
    milestoneTemplates: {
      week4: "Giữ nhịp 4 tuần đầu và có kết quả nhỏ đo được.",
      week8: "Đạt nửa mục tiêu và có 2 bản review.",
      week12: "Đạt mục tiêu + tổng kết chu kỳ.",
    },
    weekOneFocus: "Tuần 1 giữ nhẹ. Khi metric rõ hơn, tăng tải từ tuần 2-3.",
    weekOneExpectedOutput: "Ít nhất 1 việc cốt lõi đã làm + 1 buổi nhìn lại ngắn.",
    firstAction: {
      standard: "Chọn 1 việc cốt lõi và đặt lịch làm trong 24-48h tới. Ghi rõ thời gian + địa điểm.",
      lowFeasibility: "Hôm nay làm phiên bản 10-phút của việc cốt lõi. Chỉ cần bắt đầu là đủ.",
    },
    weekOneTacticLoadHint: "balanced",
    reviewPrompt: "Tuần này làm được gì? Có cần điều chỉnh gì cho tuần sau không?",
    antiPatterns: [
      "Câu mục tiêu không có động từ kết quả rõ.",
      "Không có cách đo tiến độ hằng tuần.",
    ],
    requiredSignals: {
      leadIndicatorKeywords: [],
      milestoneKeywords: [],
    },
  },
};

export function getArchetypePlanFullDefaults(archetype: GoalArchetype): ArchetypePlanFullDefaults {
  return DEFAULTS[archetype] ?? DEFAULTS.other;
}

/**
 * Pick the appropriate first action for week 1 based on feasibility hint.
 * When `lowFeasibility` is true, returns the smaller "setup / start small"
 * variant that is doable in <30 minutes today or tomorrow.
 */
export function getArchetypeFirstAction(
  archetype: GoalArchetype,
  options: { lowFeasibility?: boolean } = {},
): string {
  const defaults = getArchetypePlanFullDefaults(archetype);
  return options.lowFeasibility ? defaults.firstAction.lowFeasibility : defaults.firstAction.standard;
}

/**
 * Return true when at least one indicator name includes any required keyword.
 * Empty keyword list (archetype `other`) is always considered a match so the
 * signal does not penalise generic plans.
 */
export function indicatorsMatchArchetype(
  indicatorNames: readonly string[],
  archetype: GoalArchetype,
): boolean {
  const { requiredSignals } = getArchetypePlanFullDefaults(archetype);
  if (requiredSignals.leadIndicatorKeywords.length === 0) return true;
  const haystack = indicatorNames.map((name) => name.toLowerCase()).join(" \n ");
  return requiredSignals.leadIndicatorKeywords.some((keyword) => haystack.includes(keyword));
}

export function milestonesMatchArchetype(
  milestones: readonly string[],
  archetype: GoalArchetype,
): boolean {
  const { requiredSignals } = getArchetypePlanFullDefaults(archetype);
  if (requiredSignals.milestoneKeywords.length === 0) return true;
  const haystack = milestones.map((milestone) => milestone.toLowerCase()).join(" \n ");
  return requiredSignals.milestoneKeywords.some((keyword) => haystack.includes(keyword));
}
