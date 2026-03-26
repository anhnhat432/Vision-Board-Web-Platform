import {
  buildAdaptiveTemplateRecommendation,
  buildAdaptiveTemplateSupport,
  buildSuggestedNextWeekPlan,
  buildWeeklyReviewPremiumInsight,
  TWELVE_WEEK_TEMPLATE_CATALOG,
  planSatisfiesRequirement,
} from "./twelve-week-premium";

describe("twelve-week-premium helpers", () => {
  it("checks plan requirements in the expected order", () => {
    expect(planSatisfiesRequirement("FREE", null)).toBe(true);
    expect(planSatisfiesRequirement("FREE", "PLUS")).toBe(false);
    expect(planSatisfiesRequirement("PLUS", "PLUS")).toBe(true);
    expect(planSatisfiesRequirement("PRO", "PLUS")).toBe(true);
    expect(planSatisfiesRequirement("PLUS", "PRO")).toBe(true);
  });

  it("builds an at-risk review insight when missed work stacks up", () => {
    const insight = buildWeeklyReviewPremiumInsight({
      weekCompletionPercent: 32,
      currentScore: 38,
      currentLagMetricValue: "",
      missedTasksCount: 4,
      coreTacticCount: 3,
      optionalTacticCount: 1,
      reviewDueToday: true,
    });

    expect(insight.status).toBe("at_risk");
    expect(insight.headline).toContain("nhịp bị đứt");
    expect(insight.recommendedAdjustment).toContain("tactic cốt lõi");
  });

  it("builds a strong review insight when the week is healthy", () => {
    const insight = buildWeeklyReviewPremiumInsight({
      weekCompletionPercent: 88,
      currentScore: 84,
      currentLagMetricValue: "7/8 phiên",
      missedTasksCount: 0,
      coreTacticCount: 2,
      optionalTacticCount: 1,
      reviewDueToday: false,
    });

    expect(insight.status).toBe("strong");
    expect(insight.summary).toContain("7/8 phiên");
    expect(insight.coachNote).toContain("review tuần");
  });

  it("recommends a more adaptive planning mode from readiness and goal shape", () => {
    const recommendation = buildAdaptiveTemplateRecommendation({
      readinessScore: 9,
      goalStatement: "Muốn lấy lại nhịp và không bị quá tải",
      measurableText: "Giữ được nhịp 5 ngày mỗi tuần",
    });

    expect(recommendation.templateId).toBe("steady-focus-reset");
  });

  it("builds adaptive setup defaults for review day, load and mid-cycle milestones", () => {
    const template = TWELVE_WEEK_TEMPLATE_CATALOG.find(
      (item) => item.id === "creator-publishing-engine",
    );

    expect(template).toBeDefined();

    const support = buildAdaptiveTemplateSupport({
      template: template!,
      goalStatement: "Ra mắt khóa học đầu tiên",
      measurableText: "Chốt 12 bài và mở bán thử",
      readinessScore: 17,
    });

    expect(support.recommendedReviewDay).toBe("Friday");
    expect(support.recommendedLoadPreference).toBe("push");
    expect(support.week4MilestoneSuggestion).toContain("Chốt 12 bài");
    expect(support.week8MilestoneSuggestion.length).toBeGreaterThan(10);
  });

  it("builds a suggested next-week plan that narrows focus when the week is at risk", () => {
    const suggestedPlan = buildSuggestedNextWeekPlan({
      insight: buildWeeklyReviewPremiumInsight({
        weekCompletionPercent: 35,
        currentScore: 42,
        currentLagMetricValue: "",
        missedTasksCount: 3,
        coreTacticCount: 3,
        optionalTacticCount: 1,
        reviewDueToday: true,
      }),
      currentPlanFocus: "Giữ pipeline ứng tuyển đều mỗi tuần.",
      currentPlanMilestone: "Có phản hồi thật mỗi tuần",
      weekCompletionPercent: 35,
      currentScore: 42,
      missedTasksCount: 3,
      coreIndicators: [
        {
          id: "core_1",
          name: "Gửi hồ sơ có chọn lọc",
          target: "5",
          unit: "job",
          type: "core",
          priority: 1,
        },
        {
          id: "core_2",
          name: "Follow-up pipeline",
          target: "2",
          unit: "lần",
          type: "core",
          priority: 2,
        },
      ],
      optionalIndicators: [
        {
          id: "optional_1",
          name: "Nâng cấp portfolio",
          target: "1",
          unit: "lần",
          type: "optional",
          priority: 3,
        },
      ],
    });

    expect(suggestedPlan.workloadDecision).toBe("reduce slightly");
    expect(suggestedPlan.focus).toContain("Gửi hồ sơ");
    expect(suggestedPlan.secondaryTrackLabel).toBe("Tạm buông");
  });
});
