

/**
 * Generated tactic - actionable, measurable, time-bound recurring task
 */
export interface GeneratedTactic {
  id: string;
  name: string;           // Actionable: "Write 500 words every weekday"
  target: number;         // Times per week: 1-7
  schedule: number[];     // [0,1,2,3,4] = Mon-Fri (0 = Monday)
  type: "core" | "optional";
  priority: number;       // 1-7 (1 = highest)
  unit: string;           // e.g., "lần", "giờ", "từ"
}

export interface WeekOneTask {
  id: string;
  title: string;
  scheduledDate: string;  // ISO date string
  tacticId: string;
  isCore: boolean;
}

/**
 * Configuration for tactic generation
 */
export interface TacticGenerationOptions {
  /** Desired number of tactics: 2-4 */
  tacticCount?: number;
  /** Daily time budget from user (e.g., "30 phút", "2 giờ") */
  dailyTimeBudget?: string;
  /** Feasibility hint affects target intensity */
  feasibilityHint?: "low" | "medium" | "high";
}

/**
 * Map from archetype to default tactic suggestions
 */
export const ARCHETYPE_TACTIC_SUGGESTIONS: Record<
  string,
  Array<{ name: string; target: number; unit: string }>
> = {
  skill_learning: [
    { name: "Học [kỹ năng] qua video/khóa học", target: 3, unit: "buổi" },
    { name: "Thực hành [kỹ năng] với bài tập nhỏ", target: 4, unit: "lần" },
    { name: "Ghi chú và tóm tắt những gì học được", target: 2, unit: "lần" },
    { name: "Nhận feedback từ mentor/bạn bè", target: 1, unit: "lần" },
  ],
  health_fitness: [
    { name: "Tập luyện cardio", target: 3, unit: "buổi" },
    { name: "Tập luyện sức mạnh", target: 2, unit: "buổi" },
    { name: "Chuẩn bị và ăn healthy meals", target: 5, unit: "bữa" },
    { name: "Ngủ đủ 7-8 tiếng mỗi đêm", target: 7, unit: "đêm" },
    { name: "Thiền/giãn cơ/relax", target: 1, unit: "lần" },
  ],
  project_completion: [
    { name: "Làm việc trên [dự án] với focus block", target: 4, unit: "buổi" },
    { name: "Plan và review tiến độ dự án", target: 2, unit: "lần" },
    { name: "Giao tiếp với stakeholder/team", target: 2, unit: "lần" },
    { name: "Test và iterate trên deliverable", target: 3, unit: "lần" },
  ],
  exam_study: [
    { name: "Đọc và tóm tắt chương sách", target: 2, unit: "chương" },
    { name: "Làm bài tập/luyện đề", target: 4, unit: "bài" },
    { name: "Ghi nhớ từ vựng/key concepts", target: 3, unit: "lần" },
    { name: "Review lại những phần khó", target: 2, unit: "lần" },
  ],
  habit_building: [
    { name: "Thực hành thói quen mới [thói quen]", target: 5, unit: "lần" },
    { name: "Track và ghi nhật ký tiến độ", target: 1, unit: "lần" },
    { name: "Review và điều chỉnh approach", target: 1, unit: "lần" },
  ],
  business_growth: [
    { name: "Call/email khách hàng tiềm năng", target: 3, unit: "lần" },
    { name: "Phát triển sản phẩm/dịch vụ", target: 4, unit: "buổi" },
    { name: "Marketing và outreach", target: 3, unit: "lần" },
    { name: "Track metrics và phân tích dữ liệu", target: 2, unit: "lần" },
  ],
  career_advancement: [
    { name: "Network với colleagues/mentors", target: 2, unit: "lần" },
    { name: "Học skill liên quan đến promotion", target: 3, unit: "buổi" },
    { name: "Document achievements", target: 1, unit: "lần" },
    { name: "Chuẩn bị cho review meeting", target: 1, unit: "lần" },
  ],
  creative_pursuits: [
    { name: "Thực hành skill sáng tạo [skill]", target: 5, unit: "buổi" },
    { name: "Tìm cảm hứng và research", target: 2, unit: "lần" },
    { name: "Hoàn thành một piece nhỏ", target: 3, unit: "lần" },
    { name: "Share và nhận feedback", target: 1, unit: "lần" },
  ],
  relationship_building: [
    { name: "Quality time với người thân", target: 4, unit: "lần" },
    { name: "Giao tiếp có ý thức", target: 3, unit: "lần" },
    { name: "Lập kế hoạch cùng nhau", target: 1, unit: "lần" },
  ],
  financial_goal: [
    { name: "Track chi tiêu hàng ngày", target: 7, unit: "ngày" },
    { name: "Review budget và điều chỉnh", target: 1, unit: "lần" },
    { name: "Học về đầu tư/tài chính", target: 2, unit: "buổi" },
  ],
};

/**
 * Default suggestions for unknown archetypes
 */
const DEFAULT_SUGGESTIONS = [
  { name: "Làm việc trên mục tiêu chính", target: 4, unit: "lần" },
  { name: "Track và review tiến độ", target: 2, unit: "lần" },
  { name: "Học hỏi và cải thiện", target: 3, unit: "buổi" },
];

/**
 * Get suggestions for a given archetype
 */
export function getSuggestionsForArchetype(archetype: string) {
  return ARCHETYPE_TACTIC_SUGGESTIONS[archetype] || DEFAULT_SUGGESTIONS;
}

/**
 * Adjust target based on feasibility
 */
export function adjustTargetForFeasibility(
  baseTarget: number,
  feasibilityHint?: "low" | "medium" | "high"
): number {
  if (!feasibilityHint) return baseTarget;

  switch (feasibilityHint) {
    case "low":
      return Math.max(1, Math.floor(baseTarget * 0.6));
    case "medium":
      return Math.max(1, Math.floor(baseTarget * 0.8));
    case "high":
      return Math.min(7, Math.ceil(baseTarget * 1.2));
    default:
      return baseTarget;
  }
}

/**
 * Generate a unique ID for a tactic
 */
export function generateTacticId(index: number): string {
  return `tactic_${index}_${Date.now()}`;
}

/**
 * Generate a schedule array from target count
 * Distributes days as evenly as possible
 */
export function generateSchedule(target: number): number[] {
  const schedule: number[] = [];
  const daysPerWeek = 7;

  if (target <= 0) return schedule;
  if (target >= daysPerWeek) return [0, 1, 2, 3, 4, 5, 6];

  // Distribute evenly
  const step = daysPerWeek / target;
  for (let i = 0; i < target; i++) {
    const day = Math.round(i * step) % daysPerWeek;
    if (!schedule.includes(day)) {
      schedule.push(day);
    }
  }

  // If we didn't get enough days, fill remaining with first available
  while (schedule.length < target) {
    const firstMissing = [0, 1, 2, 3, 4, 5, 6].find(d => !schedule.includes(d));
    if (firstMissing !== undefined) {
      schedule.push(firstMissing);
    } else {
      break;
    }
  }

  return schedule.sort((a, b) => a - b).slice(0, target);
}

/**
 * Make name actionable by adding verb and time-bound context
 * Template: "[Verb] [measure] [timeframe]"
 */
export function makeActionable(
  baseName: string,
  target: number,
  unit: string
): string {
  const verbs = ["Thực hiện", "Hoàn thành", "Làm", "Tham gia", "Tập"];
  const verb = verbs[Math.floor(Math.random() * verbs.length)];

  if (target === 1) {
    return `${verb} 1 ${unit}: ${baseName}`;
  }

  const timeframe = getTimeframeFromTarget(target);
  return `${verb} ${target} ${unit} mỗi ${timeframe}: ${baseName}`;
}

/**
 * Get timeframe string based on target frequency
 */
function getTimeframeFromTarget(target: number): string {
  if (target >= 5) return "ngày";
  if (target >= 3) return "tuần";
  return "tuần";
}

/**
 * Generate tactics from archetype suggestions
 *
 * - Selects 2-4 tactics from archetype suggestions
 * - Adjusts targets based on feasibility
 * - Generates schedule for each tactic
 * - Assigns core/optional type and priority
 */
export function generateTacticsFromArchetype(
  archetype: string,
  options?: TacticGenerationOptions
): GeneratedTactic[] {
  const suggestions = getSuggestionsForArchetype(archetype);
  const tacticCount = options?.tacticCount
    ? clampTacticCount(options.tacticCount)
    : randomTacticCount();

  // Keep the archetype's highest-signal tactics first so seeded plans are stable.
  const selected = suggestions.slice(0, tacticCount);

  return selected.map((suggestion, index) => {
    const adjustedTarget = adjustTargetForFeasibility(
      suggestion.target,
      options?.feasibilityHint
    );

    const schedule = generateSchedule(adjustedTarget);

    return {
      id: generateTacticId(index),
      name: makeActionable(suggestion.name, adjustedTarget, suggestion.unit),
      target: adjustedTarget,
      schedule,
      type: index < 1 ? "core" : index === 1 ? "core" : "optional",
      priority: index + 1,
      unit: suggestion.unit,
    };
  });
}

/**
 * Clamp tactic count to valid range [2, 4]
 */
function clampTacticCount(count: number): number {
  return Math.max(2, Math.min(4, count));
}

/**
 * Random tactic count (biased toward 3)
 */
function randomTacticCount(): number {
  const rand = Math.random();
  if (rand < 0.45) return 3;  // 45% chance
  if (rand < 0.75) return 2;  // 30% chance
  if (rand < 0.95) return 4;  // 20% chance
  return 2;                   // 5% chance
}
