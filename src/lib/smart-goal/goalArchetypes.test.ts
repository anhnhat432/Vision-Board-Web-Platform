import { describe, expect, it } from "vitest";

import {
  getArchetypeFeasibilityFocus,
  getArchetypePlanDefaults,
  getArchetypeQualityHints,
  getDefaultArchetypeForDomain,
  getGoalArchetypeLabel,
  inferGoalArchetype,
  type GoalArchetype,
  type GoalArchetypeInput,
} from "./goalArchetypes";
import { buildSmartGoal } from "./helpers";
import { CORE_FUNNEL_SCENARIOS } from "@/test/fixtures/coreFunnelScenarios";

const ALL_ARCHETYPES: GoalArchetype[] = [
  "skill_learning",
  "health_fitness",
  "career_growth",
  "financial_goal",
  "exam_study",
  "project_completion",
  "habit_building",
  "creative_output",
  "relationship_life",
  "other",
];

describe("inferGoalArchetype — single signal scenarios", () => {
  it.each<[string, GoalArchetypeInput, GoalArchetype]>([
    [
      "học Rust → skill_learning",
      {
        domain: "learning",
        goalStatement: "Hoàn thành 6 dự án Rust trong 12 tuần.",
        metricName: "Du an Rust hoan thanh",
      },
      "skill_learning",
    ],
    [
      "IELTS band 7 → exam_study",
      {
        domain: "learning",
        goalStatement: "Đạt IELTS overall band 7.0 sau 12 tuần ôn luyện.",
        metricName: "IELTS overall band",
      },
      "exam_study",
    ],
    [
      "chạy 5K → health_fitness",
      {
        domain: "health",
        goalStatement: "Đạt mốc chạy 5K dưới 30 phút.",
        metricName: "Khoang cach chay duoc",
        metricUnit: "km",
      },
      "health_fitness",
    ],
    [
      "tiết kiệm milestone → financial_goal",
      {
        domain: "finance",
        goalStatement: "Hoàn thành 4 milestone tiết kiệm trong 12 tuần.",
        metricName: "Milestone tiet kiem",
      },
      "financial_goal",
    ],
    [
      "ra mắt MVP → project_completion (career domain với keyword project)",
      {
        domain: "career",
        goalStatement: "Ra mắt MVP vision board planner với 8 phiên feedback.",
        metricName: "Phien feedback nguoi dung",
      },
      "project_completion",
    ],
    [
      "promotion senior IDP → career_growth",
      {
        domain: "career",
        goalStatement: "Hoàn thành 12 deliverable thuộc IDP trước review Q3.",
        metricName: "Deliverable IDP",
      },
      "career_growth",
    ],
    [
      "đọc 3 buổi/tuần → habit_building (life domain)",
      {
        domain: "life",
        goalStatement: "Duy trì đọc sách 3 buổi mỗi tuần trong 12 tuần.",
        metricName: "Buoi doc/tuan",
      },
      "habit_building",
    ],
    [
      "viết blog định kỳ → creative_output (life domain)",
      {
        domain: "life",
        goalStatement: "Xuất bản 12 bài blog viết trong 12 tuần.",
        metricName: "Bai viet xuat ban",
      },
      "creative_output",
    ],
    [
      "thời gian gia đình → relationship_life",
      {
        domain: "relationship",
        goalStatement: "Dành 2 buổi mỗi tuần cho gia đình.",
        metricName: "Buoi voi gia dinh",
      },
      "relationship_life",
    ],
    [
      "no signal → other",
      {
        goalStatement: "Tôi muốn cải thiện tình trạng hiện tại.",
        metricName: "",
      },
      "other",
    ],
  ])("%s", (_label, input, expected) => {
    expect(inferGoalArchetype(input)).toBe(expected);
  });
});

describe("inferGoalArchetype — accepts SmartGoal directly", () => {
  it("classifies a built SmartGoal", () => {
    const goal = buildSmartGoal({
      focusArea: "health",
      specificGoalStatement: "Đạt mốc chạy 5K dưới 30 phút trong 12 tuần.",
      measurableMetricName: "Khoang cach chay duoc",
      measurableMetricUnit: "km",
      measurableTargetValue: 5,
      measurableBaselineValue: 0,
      achievableWeeklyTimeCommitmentHours: 5,
      achievableRequiredSkills: [],
      achievableSupportResources: [],
      relevantMotivationReason: "Cải thiện sức khỏe.",
      timeBoundTargetWeeks: 12,
    });
    expect(inferGoalArchetype(goal)).toBe("health_fitness");
  });
});

describe("inferGoalArchetype — explicit goalType from 12-week setup", () => {
  it("uses goalType when present and not 'Other'", () => {
    expect(
      inferGoalArchetype({
        goalType: "Skill Learning",
        goalStatement: "Đạt mốc tiết kiệm",
        metricName: "Tiet kiem",
      }),
    ).toBe("skill_learning");
  });

  it("falls through to inference when goalType = 'Other'", () => {
    expect(
      inferGoalArchetype({
        goalType: "Other",
        domain: "health",
        goalStatement: "Chạy 10K trong 12 tuần.",
        metricName: "Khoang cach chay",
      }),
    ).toBe("health_fitness");
  });
});

describe("inferGoalArchetype — coverage against existing scenarios", () => {
  it("classifies every coreFunnelScenarios fixture into a non-other archetype", () => {
    for (const scenario of CORE_FUNNEL_SCENARIOS) {
      const archetype = inferGoalArchetype({
        domain: undefined, // simulate raw form-only input
        goalStatement: scenario.smartInput.specificGoalStatement,
        metricName: scenario.smartInput.measurableMetricName,
        metricUnit: scenario.smartInput.measurableMetricUnit,
      });
      expect(archetype).not.toBe("other");
    }
  });

  it("respects domain when provided", () => {
    for (const scenario of CORE_FUNNEL_SCENARIOS) {
      const archetype = inferGoalArchetype({
        domain:
          scenario.smartInput.focusArea === "career"
            ? "career"
            : scenario.smartInput.focusArea === "health"
              ? "health"
              : scenario.smartInput.focusArea === "finance"
                ? "finance"
                : scenario.smartInput.focusArea === "learning"
                  ? "learning"
                  : "life",
        goalStatement: scenario.smartInput.specificGoalStatement,
        metricName: scenario.smartInput.measurableMetricName,
        metricUnit: scenario.smartInput.measurableMetricUnit,
      });
      expect(archetype).not.toBe("other");
    }
  });
});

describe("archetype property accessors", () => {
  it("returns a Vietnamese label for every archetype", () => {
    for (const archetype of ALL_ARCHETYPES) {
      const label = getGoalArchetypeLabel(archetype);
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it("returns quality hints with non-empty metric and antiPatterns for every archetype", () => {
    for (const archetype of ALL_ARCHETYPES) {
      const hints = getArchetypeQualityHints(archetype);
      expect(hints.recommendedMetric.length).toBeGreaterThan(0);
      expect(hints.antiPatterns.length).toBeGreaterThanOrEqual(2);
      for (const pattern of hints.antiPatterns) {
        expect(pattern.length).toBeGreaterThan(10);
      }
    }
  });

  it("returns plan defaults with at least 1 lead indicator and a week-1 hint", () => {
    for (const archetype of ALL_ARCHETYPES) {
      const defaults = getArchetypePlanDefaults(archetype);
      expect(defaults.recommendedLeadIndicators.length).toBeGreaterThanOrEqual(1);
      expect(defaults.weekOneStart.length).toBeGreaterThan(10);
    }
  });

  it("returns a feasibility focus with valid bottleneck for every archetype", () => {
    const validBottlenecks = new Set(["time", "energy", "resources", "clarity", "obstacle", "routine", "confidence"]);
    for (const archetype of ALL_ARCHETYPES) {
      const focus = getArchetypeFeasibilityFocus(archetype);
      expect(validBottlenecks.has(focus.typicalBottleneck)).toBe(true);
      expect(focus.reason.length).toBeGreaterThan(10);
    }
  });

  it("getDefaultArchetypeForDomain covers every SmartGoalDomain", () => {
    expect(getDefaultArchetypeForDomain("career")).toBe("career_growth");
    expect(getDefaultArchetypeForDomain("health")).toBe("health_fitness");
    expect(getDefaultArchetypeForDomain("finance")).toBe("financial_goal");
    expect(getDefaultArchetypeForDomain("learning")).toBe("skill_learning");
    expect(getDefaultArchetypeForDomain("relationship")).toBe("relationship_life");
    expect(getDefaultArchetypeForDomain("life")).toBe("habit_building");
  });
});

describe("inferGoalArchetype — does not block 'other'", () => {
  it("explicit 'Other' goalType + no other signal stays as other-like fallback", () => {
    const archetype = inferGoalArchetype({
      goalType: "Other",
      goalStatement: "Tôi muốn thay đổi cuộc sống.",
      metricName: "",
    });
    expect(archetype).toBe("other");
  });

  it("ambiguous text returns 'other'", () => {
    expect(
      inferGoalArchetype({
        goalStatement: "Cải thiện bản thân.",
        metricName: "Tien bo",
      }),
    ).toBe("other");
  });
});

describe("privacy guarantees", () => {
  it("does not throw or mutate input even with weird values", () => {
    const input: GoalArchetypeInput = {
      goalStatement: "<script>alert(1)</script>",
      metricName: "💰💰💰",
      metricUnit: "",
    };
    const before = JSON.stringify(input);
    const archetype = inferGoalArchetype(input);
    expect(typeof archetype).toBe("string");
    expect(JSON.stringify(input)).toBe(before);
  });
});
