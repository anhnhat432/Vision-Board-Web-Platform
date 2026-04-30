import type { PricingPlanCode, TacticType, UniversalWeeklyReview } from "../storage-types";

export type PremiumFeatureContext = "template" | "review" | "reminder" | "plan";

export interface PricingPlanDefinition {
  code: PricingPlanCode;
  name: string;
  shortLabel: string;
  priceLabel: string;
  description: string;
  highlights: string[];
}

export interface TemplateTacticPreset {
  name: string;
  target: string;
  unit: string;
  type: TacticType;
  cadence: "spread" | "frontload" | "backload";
}

export interface TwelveWeekTemplateDefinition {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  bestFor: string;
  whyItWorks: string;
  firstWeekWin: string;
  idealFor: string[];
  goalType: string;
  reviewDay: string;
  requiredPlan: PricingPlanCode | null;
  accent: "slate" | "sky" | "emerald" | "amber" | "violet";
  vision12Week: string;
  week12Outcome: string;
  lagMetricName: string;
  lagMetricTarget: string;
  lagMetricUnit: string;
  week4Milestone: string;
  week8Milestone: string;
  successEvidence: string;
  tactics: TemplateTacticPreset[];
}

export interface WeeklyReviewPremiumInsight {
  status: "strong" | "watch" | "at_risk";
  badgeLabel: string;
  headline: string;
  summary: string;
  recommendedAdjustment: string;
  coachNote: string;
}

export interface SuggestedNextWeekPlan {
  focus: string;
  workloadDecision: UniversalWeeklyReview["workloadDecision"];
  rationale: string;
  protectTactics: string[];
  secondaryTrackLabel: string;
  secondaryTrackItems: string[];
  firstMove: string;
}

export interface AdaptiveTemplateRecommendation {
  templateId: string;
  reason: string;
}

export interface AdaptiveTemplateSupport {
  personalizedTactics: TemplateTacticPreset[];
  weekPlanFocuses: string[];
  week1Headline: string;
  week1Support: string;
  week1CadenceHint: string;
  recommendedReviewDay: string;
  recommendedReviewReason: string;
  recommendedLoadPreference: "balanced" | "lighter" | "push";
  recommendedLoadReason: string;
  week4MilestoneSuggestion: string;
  week8MilestoneSuggestion: string;
}
