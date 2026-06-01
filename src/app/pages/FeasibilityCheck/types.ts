export type FeasibilityAxis = "time" | "energy" | "resources" | "clarity" | "obstacle" | "routine" | "confidence";
export type PlanLoadRecommendation = "lighter" | "balanced" | "push";
export type WeeklyCapacity = "low" | "medium" | "high";

export interface Question {
  id: number;
  axis: FeasibilityAxis;
  axisLabel: string;
  question: string;
  helper: string;
  options: {
    value: string;
    label: string;
    score: number;
    diagnostic: string;
    impact?: string;
    example?: string;
  }[];
}

export type ResultType = "realistic" | "challenging" | "too_ambitious";

export interface AxisScore {
  axis: FeasibilityAxis;
  label: string;
  score: number;
  maxScore: number;
  percent: number;
  diagnostic: string;
}

export interface FeasibilityBottleneck {
  axis: FeasibilityAxis | "wheel";
  label: string;
  score: number;
  action: string;
}

export type SmartGoalQualityBridge = "weak" | "okay" | "strong";

export interface ResultData {
  type: ResultType;
  title: string;
  summary: string;
  recommendation: string;
  readinessScore: number;
  adjustedScore: number;
  wheelScore: number;
  diagnosticScore: number;
  maxDiagnosticScore: number;
  axisScores: AxisScore[];
  bottleneck: FeasibilityBottleneck;
  planLoad: PlanLoadRecommendation;
  weeklyCapacity: WeeklyCapacity;
  firstWeekGuidance: string;
  scopeRecommendation: string;
  smartGoalQualityLevel?: SmartGoalQualityBridge;
  smartGoalQualityNote?: string;
  savedAt?: string;
}

export interface PendingFeasibilityResult {
  resultType: ResultType;
  resultTitle: string;
  resultSummary: string;
  recommendation: string;
  readinessScore: number;
  adjustedScore: number;
  wheelScore: number;
  diagnosticScore: number;
  maxDiagnosticScore: number;
  axisScores: AxisScore[];
  bottleneck: FeasibilityBottleneck;
  planLoad: PlanLoadRecommendation;
  weeklyCapacity: WeeklyCapacity;
  firstWeekGuidance: string;
  scopeRecommendation: string;
  smartGoalQualityLevel?: SmartGoalQualityBridge;
  smartGoalQualityNote?: string;
  savedAt?: string;
}
