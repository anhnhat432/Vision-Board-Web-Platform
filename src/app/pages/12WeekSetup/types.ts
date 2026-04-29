import type { TacticType } from "../../utils/storage";

export type ResultType = "realistic" | "challenging" | "too_ambitious";
export type PlanLoadRecommendation = "lighter" | "balanced" | "push";
export type WeeklyCapacity = "low" | "medium" | "high";

export interface PendingFeasibilityResult {
  resultType: ResultType;
  resultTitle: string;
  resultSummary: string;
  recommendation: string;
  readinessScore: number;
  adjustedScore: number;
  wheelScore: number;
  diagnosticScore?: number;
  maxDiagnosticScore?: number;
  axisScores?: Array<{
    axis: string;
    label: string;
    score: number;
    maxScore: number;
    percent: number;
    diagnostic: string;
  }>;
  bottleneck?: {
    axis: string;
    label: string;
    score: number;
    action: string;
  };
  planLoad?: PlanLoadRecommendation;
  weeklyCapacity?: WeeklyCapacity;
  firstWeekGuidance?: string;
  scopeRecommendation?: string;
}

export interface LeadIndicatorDraft {
  id: string;
  name: string;
  target: string;
  unit: string;
  type: TacticType;
  cadence: "spread" | "frontload" | "backload";
}

export interface TwelveWeekSetupDraft {
  templateId: string;
  goalType: string;
  vision12Week: string;
  week12Outcome: string;
  lagMetricName: string;
  lagMetricTarget: string;
  lagMetricUnit: string;
  leadIndicators: LeadIndicatorDraft[];
  startDate: string;
  reviewDay: string;
  tacticLoadPreference: "balanced" | "lighter" | "push";
  week4Milestone: string;
  week8Milestone: string;
  successEvidence: string;
  dailyTimeBudget: string;
  preferredDays: number[];
  personalConstraint: "time" | "motivation" | "consistency" | "complexity" | "";
}
