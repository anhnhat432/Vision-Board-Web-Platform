import type { SmartGoal, SmartGoalDomain } from "./types";

/**
 * Goal archetype v1.
 *
 * Pure classifier. No external AI, no network, no analytics. Inputs are
 * either a full SmartGoal or a minimal GoalArchetypeInput slice so the
 * 12-week setup can call this before SmartGoal is fully built.
 *
 * Design rules:
 *  - Inference is rule-based and deterministic. Same input → same archetype.
 *  - Domain is the primary signal. Keywords are a secondary refinement that
 *    can split a domain (e.g. learning → skill_learning vs exam_study).
 *  - "other" is always selectable. The classifier never blocks.
 *  - All keyword text is treated as opaque user input. No raw analytics is
 *    emitted from this module — callers decide whether to log archetype.
 */

export type GoalArchetype =
  | "skill_learning"
  | "health_fitness"
  | "career_growth"
  | "financial_goal"
  | "exam_study"
  | "project_completion"
  | "habit_building"
  | "creative_output"
  | "relationship_life"
  | "other";

export interface GoalArchetypeInput {
  domain?: SmartGoalDomain;
  focusArea?: string;
  goalStatement?: string;
  metricName?: string;
  metricUnit?: string;
  goalType?: string;
}

/** Keywords are matched lower-case, substring, accent-sensitive. */
const KEYWORDS: Record<Exclude<GoalArchetype, "other">, readonly string[]> = {
  exam_study: [
    "exam",
    "ielts",
    "toefl",
    "toeic",
    "gmat",
    "sat",
    "gre",
    "hsk",
    "jlpt",
    "certificate",
    "certification",
    "cert",
    "chứng chỉ",
    "chung chi",
    "thi cử",
    "thi cu",
    "kỳ thi",
    "ky thi",
    "ôn thi",
    "on thi",
    "ôn luyện",
    "on luyen",
    "đề thi",
    "de thi",
    "đi thi",
    "di thi",
  ],
  skill_learning: [
    "học",
    "hoc ",
    "study",
    "learn",
    "khóa học",
    "khoa hoc",
    "course",
    "skill",
    "kỹ năng",
    "ky nang",
    "tutorial",
    "ngôn ngữ",
    "ngon ngu",
    "rust",
    "react",
    "python",
    "typescript",
    "go ",
  ],
  health_fitness: [
    "chạy",
    "chay",
    "run",
    "running",
    "gym",
    "tập",
    "tap ",
    "workout",
    "weight",
    "cân nặng",
    "can nang",
    "kg",
    "calorie",
    "calo",
    "fitness",
    "sức khỏe",
    "suc khoe",
    "yoga",
    "marathon",
    "5k",
    "10k",
    "pushup",
    "squat",
  ],
  financial_goal: [
    "tiết kiệm",
    "tiet kiem",
    "savings",
    "save",
    "doanh thu",
    "revenue",
    "income",
    "lương",
    "luong",
    "salary",
    "đầu tư",
    "dau tu",
    "investment",
    "budget",
    "ngân sách",
    "ngan sach",
    "vnd",
    "usd",
    "milestone tiet kiem",
    "milestone tiết kiệm",
    "quỹ",
    "quy ",
  ],
  career_growth: [
    "promotion",
    "thăng chức",
    "thang chuc",
    "senior",
    "junior",
    "lead engineer",
    "manager",
    "okr",
    "kpi",
    "performance review",
    "idp",
    "mentor program",
    "stakeholder",
    "deliverable",
  ],
  project_completion: [
    "ra mắt",
    "ra mat",
    "launch",
    "ship",
    "mvp",
    "release",
    "deploy",
    "ship",
    "dự án",
    "du an",
    "build",
    "xây dựng",
    "xay dung",
    "feature",
    "v1.0",
    "v2.0",
    "demo",
    "side project",
  ],
  habit_building: [
    "thói quen",
    "thoi quen",
    "habit",
    "duy trì",
    "duy tri",
    "daily",
    "hằng ngày",
    "hang ngay",
    "mỗi ngày",
    "moi ngay",
    "mỗi tuần",
    "moi tuan",
    "đều đặn",
    "deu dan",
    "streak",
    "routine",
  ],
  creative_output: [
    "viết",
    "viet ",
    "write",
    "writing",
    "blog",
    "post",
    "bài viết",
    "bai viet",
    "article",
    "sáng tác",
    "sang tac",
    "compose",
    "song",
    "music",
    "video",
    "podcast",
    "vẽ",
    "ve ",
    "paint",
    "design",
    "draft",
    "novel",
    "truyện",
    "truyen",
  ],
  relationship_life: [
    "gia đình",
    "gia dinh",
    "family",
    "vợ",
    "vo ",
    "chồng",
    "chong",
    "partner",
    "bạn bè",
    "ban be",
    "friend",
    "cộng đồng",
    "cong dong",
    "community",
    "tình cảm",
    "tinh cam",
    "social",
  ],
};

const DOMAIN_DEFAULT: Record<SmartGoalDomain, GoalArchetype> = {
  career: "career_growth",
  health: "health_fitness",
  finance: "financial_goal",
  learning: "skill_learning",
  relationship: "relationship_life",
  life: "habit_building",
};

const GOAL_TYPE_TO_ARCHETYPE: Record<string, GoalArchetype> = {
  // Maps the legacy 12-week setup string values from `12WeekSetup/constants.ts`.
  "Skill Learning": "skill_learning",
  "Habit Building": "habit_building",
  "Fitness / Health": "health_fitness",
  "Exam / Study": "exam_study",
  "Career / Job Search": "career_growth",
  "Finance / Saving": "financial_goal",
  "Project Completion": "project_completion",
  "Personal Growth": "habit_building",
  Other: "other",
};

const ARCHETYPE_LABELS: Record<GoalArchetype, string> = {
  skill_learning: "Học kỹ năng",
  health_fitness: "Sức khỏe & thể chất",
  career_growth: "Phát triển sự nghiệp",
  financial_goal: "Mục tiêu tài chính",
  exam_study: "Thi cử / chứng chỉ",
  project_completion: "Hoàn thành dự án",
  habit_building: "Xây thói quen",
  creative_output: "Sáng tạo / sản xuất nội dung",
  relationship_life: "Quan hệ & đời sống",
  other: "Khác",
};

function lower(value: string | undefined): string {
  return (value ?? "").toLowerCase();
}

function joinHaystack(input: GoalArchetypeInput): string {
  return [
    lower(input.focusArea),
    lower(input.goalStatement),
    lower(input.metricName),
    lower(input.metricUnit),
  ].join(" \n ");
}

function countKeywordHits(haystack: string, keywords: readonly string[]): number {
  let hits = 0;
  for (const keyword of keywords) {
    if (haystack.includes(keyword)) hits += 1;
  }
  return hits;
}

/**
 * Classify the goal. Returns `"other"` when no signal is strong enough.
 *
 * Order of precedence:
 *  1. Explicit `goalType` from 12-week setup form, if it maps to a known archetype.
 *  2. Domain default + keyword refinement (the most useful path).
 *  3. Pure keyword scan when domain is missing.
 *  4. `"other"` fallback.
 */
export function inferGoalArchetype(input: GoalArchetypeInput | SmartGoal): GoalArchetype {
  const normalized: GoalArchetypeInput = isSmartGoalShape(input)
    ? {
        domain: input.domain,
        goalStatement: input.specific?.goal_statement,
        metricName: input.measurable?.metric_name,
        metricUnit: input.measurable?.metric_unit,
      }
    : input;

  const explicitFromGoalType = normalized.goalType
    ? GOAL_TYPE_TO_ARCHETYPE[normalized.goalType]
    : undefined;
  if (explicitFromGoalType && explicitFromGoalType !== "other") {
    return explicitFromGoalType;
  }

  const haystack = joinHaystack(normalized);
  const hits = computeKeywordHits(haystack);

  if (normalized.domain) {
    const refined = refineByDomain(normalized.domain, hits);
    if (refined) return refined;
  }

  const topKeyword = pickTopArchetype(hits);
  if (topKeyword) return topKeyword;

  if (explicitFromGoalType === "other") return "other";
  return "other";
}

function isSmartGoalShape(value: unknown): value is SmartGoal {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SmartGoal>;
  return Boolean(
    candidate.specific &&
      typeof candidate.specific.goal_statement === "string" &&
      candidate.measurable &&
      typeof candidate.measurable.metric_name === "string",
  );
}

function computeKeywordHits(haystack: string): Record<Exclude<GoalArchetype, "other">, number> {
  return {
    exam_study: countKeywordHits(haystack, KEYWORDS.exam_study),
    skill_learning: countKeywordHits(haystack, KEYWORDS.skill_learning),
    health_fitness: countKeywordHits(haystack, KEYWORDS.health_fitness),
    financial_goal: countKeywordHits(haystack, KEYWORDS.financial_goal),
    career_growth: countKeywordHits(haystack, KEYWORDS.career_growth),
    project_completion: countKeywordHits(haystack, KEYWORDS.project_completion),
    habit_building: countKeywordHits(haystack, KEYWORDS.habit_building),
    creative_output: countKeywordHits(haystack, KEYWORDS.creative_output),
    relationship_life: countKeywordHits(haystack, KEYWORDS.relationship_life),
  };
}

function refineByDomain(
  domain: SmartGoalDomain,
  hits: Record<Exclude<GoalArchetype, "other">, number>,
): GoalArchetype | null {
  switch (domain) {
    case "learning":
      if (hits.exam_study > 0) return "exam_study";
      if (hits.creative_output >= 2 && hits.creative_output > hits.skill_learning) return "creative_output";
      return "skill_learning";
    case "health":
      return "health_fitness";
    case "finance":
      return "financial_goal";
    case "career":
      if (hits.project_completion > hits.career_growth) return "project_completion";
      if (hits.creative_output >= 2 && hits.creative_output > hits.career_growth) return "creative_output";
      return "career_growth";
    case "relationship":
      return "relationship_life";
    case "life":
      if (hits.creative_output >= 2) return "creative_output";
      if (hits.habit_building > 0) return "habit_building";
      if (hits.health_fitness > 0) return "health_fitness";
      if (hits.relationship_life > 0) return "relationship_life";
      return "habit_building";
    default:
      return null;
  }
}

function pickTopArchetype(
  hits: Record<Exclude<GoalArchetype, "other">, number>,
): GoalArchetype | null {
  // Order matters for tie-break: prefer more specific archetypes.
  const order: Array<Exclude<GoalArchetype, "other">> = [
    "exam_study",
    "project_completion",
    "creative_output",
    "health_fitness",
    "financial_goal",
    "habit_building",
    "relationship_life",
    "career_growth",
    "skill_learning",
  ];

  let best: { archetype: Exclude<GoalArchetype, "other">; hits: number } | null = null;
  for (const archetype of order) {
    const score = hits[archetype];
    if (score > 0 && (!best || score > best.hits)) {
      best = { archetype, hits: score };
    }
  }
  if (!best) return null;
  // Require at least 1 hit; for ambiguous domains with only 1 hit, that
  // single hit drives the decision (acceptable for a v1 classifier).
  return best.archetype;
}

export function getGoalArchetypeLabel(archetype: GoalArchetype): string {
  return ARCHETYPE_LABELS[archetype] ?? ARCHETYPE_LABELS.other;
}

// =============================================================================
// Archetype property tables
// =============================================================================

export interface ArchetypeQualityHints {
  /** What kind of metric tends to work. Free-text Vietnamese. */
  recommendedMetric: string;
  /** Patterns to avoid when writing the SMART/plan for this archetype. */
  antiPatterns: string[];
}

export interface ArchetypePlanDefaults {
  /** 2-3 typical lead indicator examples for this archetype. */
  recommendedLeadIndicators: string[];
  /** How week 1 should typically open. */
  weekOneStart: string;
}

export interface ArchetypeFeasibilityFocus {
  /** Most common bottleneck axis from FeasibilityCheck/types.ts. */
  typicalBottleneck:
    | "time"
    | "energy"
    | "resources"
    | "clarity"
    | "obstacle"
    | "routine"
    | "confidence";
  reason: string;
}

const QUALITY_HINTS: Record<GoalArchetype, ArchetypeQualityHints> = {
  skill_learning: {
    recommendedMetric:
      "Số sản phẩm thực hành làm được (dự án nhỏ, bài tập đã chấm), không phải số giờ học.",
    antiPatterns: [
      "Đặt mục tiêu là 'thành thạo' mà không có sản phẩm cụ thể.",
      "Dùng số giờ học làm chỉ số — học mà không tạo kết quả dễ ảo tưởng tiến bộ.",
      "Chọn quá nhiều khóa học song song, không có khóa nào hoàn thành.",
    ],
  },
  health_fitness: {
    recommendedMetric:
      "Chỉ số đo được hằng tuần (km chạy, số buổi tập, cân nặng), không phải cảm giác chung.",
    antiPatterns: [
      "Đặt giảm cân/lên cơ rất nhanh trong 12 tuần, dễ kiệt sức tuần 3.",
      "Lịch tập nặng tuần 1 trước khi cơ thể quen — nguy cơ chấn thương.",
      "Không có ngày nghỉ rõ trong tuần.",
    ],
  },
  career_growth: {
    recommendedMetric:
      "Số deliverable hoàn thành hoặc số 1:1/feedback session, không phải 'thăng chức' (kết quả ngoài tầm).",
    antiPatterns: [
      "Đặt mục tiêu là kết quả người khác quyết định (promotion). Đặt input thay vào.",
      "Chỉ làm việc lớn, không có việc nhỏ giữ nhịp hằng tuần.",
      "Bỏ qua stakeholder/mentor — tự làm hết một mình.",
    ],
  },
  financial_goal: {
    recommendedMetric:
      "Số cột mốc tiết kiệm/đầu tư đạt được, hoặc % tổng mục tiêu, không phải con số tuyệt đối nhạy cảm.",
    antiPatterns: [
      "Đặt mục tiêu phụ thuộc thu nhập biến động (doanh thu freelance) mà không có plan B.",
      "Không track chi tiêu hằng tuần — chỉ check cuối kỳ.",
      "Đặt số quá lớn so với capacity → bỏ cuộc tuần 4.",
    ],
  },
  exam_study: {
    recommendedMetric:
      "Số đề thi thử hoàn thành + điểm thử, không phải mức điểm cuối (điểm dạng band là chỉ số phi tuyến).",
    antiPatterns: [
      "Đặt mục tiêu là mức điểm cụ thể trong thời gian quá ngắn — kiểm tra tính khả thi sẽ báo quá tham vọng.",
      "Học dàn trải 4 kỹ năng cùng lúc — nên ưu tiên kỹ năng yếu nhất tuần đầu.",
      "Không làm đề thi thử, chỉ học lý thuyết.",
    ],
  },
  project_completion: {
    recommendedMetric:
      "Số phần việc/tính năng đã hoàn tất, hoặc số phiên góp ý từ người dùng, không phải 'hoàn thành dự án' chung chung.",
    antiPatterns: [
      "Đặt 'ra mắt MVP' tuần 12 mà không có cột mốc tuần 4 và 8.",
      "Không có session feedback người dùng — build trong vacuum.",
      "Phạm vi phình to giữa chu kỳ, mất tập trung.",
    ],
  },
  habit_building: {
    recommendedMetric:
      "Số buổi/tuần thực hiện, đo bằng frequency (3 lần/tuần), không phải cảm giác 'đều đặn'.",
    antiPatterns: [
      "Đặt thói quen quá khó tuần 1 — không xây được chuỗi ngày ban đầu.",
      "Nhiều thói quen cùng lúc — chọn 1 thói quen chính.",
      "Không có cue/trigger gắn với routine có sẵn.",
    ],
  },
  creative_output: {
    recommendedMetric:
      "Số tác phẩm/bài viết/post xuất bản, không phải 'cảm hứng' hay số giờ ngồi.",
    antiPatterns: [
      "Chỉ có chỉ số 'viết tốt hơn' — không đếm được.",
      "Không có schedule xuất bản đều — đăng dồn cuối kỳ.",
      "Sửa mãi, không đưa ra bản hoàn tất.",
    ],
  },
  relationship_life: {
    recommendedMetric:
      "Số buổi/tuần thời gian chất lượng với người liên quan, không phải 'cải thiện quan hệ' chung chung.",
    antiPatterns: [
      "Đặt mục tiêu cho người khác (ví dụ: 'làm người yêu vui hơn') — đặt input của mình thay vào.",
      "Không có ngày cố định trong tuần dành cho quan hệ.",
      "Đo bằng cảm xúc thay vì hành động.",
    ],
  },
  other: {
    recommendedMetric:
      "Chọn một con số đo được hằng tuần. Nếu không nghĩ ra chỉ số, mục tiêu có thể đang quá mơ hồ.",
    antiPatterns: [
      "Câu mục tiêu không có động từ kết quả rõ.",
      "Không có cách đo tiến độ hằng tuần.",
      "Không gắn với một lĩnh vực cuộc sống cụ thể.",
    ],
  },
};

const PLAN_DEFAULTS: Record<GoalArchetype, ArchetypePlanDefaults> = {
  skill_learning: {
    recommendedLeadIndicators: [
      "Code/làm bài tập 60 phút",
      "Đọc tài liệu chính 30 phút",
      "Review cùng người khác hoặc bản thử nhỏ",
    ],
    weekOneStart:
      "Tuần 1 chọn một dự án nhỏ làm kết quả đầu tiên. Đừng học lý thuyết tuần 1.",
  },
  health_fitness: {
    recommendedLeadIndicators: [
      "Buổi cardio chính",
      "Buổi strength",
      "Mobility/recovery ngắn",
    ],
    weekOneStart:
      "Tuần 1 nhẹ — kiểm tra form và nhịp tim. Tăng tải từ tuần 2 trở đi.",
  },
  career_growth: {
    recommendedLeadIndicators: [
      "Deep work block",
      "1:1 với stakeholder",
      "Demo prep / feedback session",
    ],
    weekOneStart:
      "Tuần 1 lock lịch deep work cố định và một buổi 1:1 với mentor/manager.",
  },
  financial_goal: {
    recommendedLeadIndicators: [
      "Track chi tiêu hằng ngày 5-10 phút",
      "Chuyển khoản tiết kiệm cố định",
      "Review tiền bạc hằng tuần",
    ],
    weekOneStart:
      "Tuần 1 set up tracking + chuyển khoản tự động. Đừng đặt số tiết kiệm lớn tuần đầu.",
  },
  exam_study: {
    recommendedLeadIndicators: [
      "Buổi luyện kỹ năng yếu nhất",
      "Đề thi thử mỗi tuần",
      "Review lỗi sau đề thi",
    ],
    weekOneStart:
      "Tuần 1 làm 1 đề thi thử để biết mốc hiện tại thật, không phải dự đoán.",
  },
  project_completion: {
    recommendedLeadIndicators: [
      "Build session",
      "User interview / feedback",
      "Hoàn tất review hoặc bản thử nội bộ",
    ],
    weekOneStart:
      "Tuần 1 xác định scope tối thiểu khả thi (MVP). Mốc tuần 4 và 8 phải rõ.",
  },
  habit_building: {
    recommendedLeadIndicators: [
      "Habit chính (ví dụ: đọc 30p)",
      "Ghi chú review cuối ngày",
    ],
    weekOneStart:
      "Tuần 1 chỉ làm thói quen dễ nhất phiên bản nhỏ nhất để xây chuỗi ngày. Tăng tải từ tuần 3.",
  },
  creative_output: {
    recommendedLeadIndicators: [
      "Buổi sáng tác/bản nháp",
      "Buổi edit",
      "Lịch xuất bản (post/upload)",
    ],
    weekOneStart:
      "Tuần 1 hoàn tất một bản thô — không sửa mãi. Mục đích là tạo nhịp xuất bản.",
  },
  relationship_life: {
    recommendedLeadIndicators: [
      "Thời gian chất lượng cố định trong tuần",
      "Một hành động nhỏ thể hiện quan tâm",
    ],
    weekOneStart:
      "Tuần 1 chốt một ngày/giờ cố định trong tuần. Không phụ thuộc 'có thời gian thì gặp'.",
  },
  other: {
    recommendedLeadIndicators: [
      "1-2 việc cốt lõi đo được",
      "Một buổi nhìn lại ngắn hằng tuần",
    ],
    weekOneStart: "Tuần 1 giữ nhẹ. Khi chỉ số rõ hơn, tăng tải từ tuần 2-3.",
  },
};

const FEASIBILITY_FOCUS: Record<GoalArchetype, ArchetypeFeasibilityFocus> = {
  skill_learning: {
    typicalBottleneck: "resources",
    reason: "Thiếu nền/skill ban đầu là rào cản phổ biến nhất khi học kỹ năng mới.",
  },
  health_fitness: {
    typicalBottleneck: "energy",
    reason: "Năng lượng và phục hồi quyết định khả năng giữ nhịp tập, hơn là thời gian.",
  },
  career_growth: {
    typicalBottleneck: "clarity",
    reason: "Thường mục tiêu nghề bị đặt ở kết quả ngoài tầm (promotion) — cần thu hẹp.",
  },
  financial_goal: {
    typicalBottleneck: "routine",
    reason: "Tiết kiệm/đầu tư chỉ chắc khi có lịch cố định, không phụ thuộc cảm hứng.",
  },
  exam_study: {
    typicalBottleneck: "time",
    reason: "Thi cử thường có deadline cứng nên thời gian là biến giới hạn nhất.",
  },
  project_completion: {
    typicalBottleneck: "clarity",
    reason: "Dự án dễ phình scope; mục tiêu rõ tuần 4/8 quan trọng hơn nỗ lực thô.",
  },
  habit_building: {
    typicalBottleneck: "routine",
    reason: "Habit phụ thuộc cue và lịch cố định nhiều hơn cường độ mỗi buổi.",
  },
  creative_output: {
    typicalBottleneck: "confidence",
    reason: "Sáng tạo thường bị chặn bởi 'chưa đủ tốt để công bố', không phải thiếu thời gian.",
  },
  relationship_life: {
    typicalBottleneck: "routine",
    reason: "Quan hệ chắc khi có lịch cố định, không phải khi 'rảnh thì gặp'.",
  },
  other: {
    typicalBottleneck: "clarity",
    reason: "Khi mục tiêu chưa thuộc archetype nào rõ, độ rõ là rủi ro chính.",
  },
};

export function getArchetypeQualityHints(archetype: GoalArchetype): ArchetypeQualityHints {
  return QUALITY_HINTS[archetype] ?? QUALITY_HINTS.other;
}

export function getArchetypePlanDefaults(archetype: GoalArchetype): ArchetypePlanDefaults {
  return PLAN_DEFAULTS[archetype] ?? PLAN_DEFAULTS.other;
}

export function getArchetypeFeasibilityFocus(
  archetype: GoalArchetype,
): ArchetypeFeasibilityFocus {
  return FEASIBILITY_FOCUS[archetype] ?? FEASIBILITY_FOCUS.other;
}

/** Re-export the SmartGoalDomain → archetype default for callers that only have a domain. */
export function getDefaultArchetypeForDomain(domain: SmartGoalDomain): GoalArchetype {
  return DOMAIN_DEFAULT[domain] ?? "other";
}
