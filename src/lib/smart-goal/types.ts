export type SmartGoalDomain =
  | "career"
  | "health"
  | "finance"
  | "learning"
  | "relationship"
  | "life";

export interface SmartGoalSummary {
  goal: string;
  metric: string;
  metric_unit?: string;
  target: number;
  weekly_commitment: number;
  timeline_weeks?: number;
  difficulty?: "easy" | "medium" | "hard";
}

export interface SmartGoal {
  id: string;
  domain: SmartGoalDomain;
  specific: {
    goal_statement: string;
  };
  measurable: {
    metric_name: string;
    metric_unit?: string;
    baseline_value?: number;
    target_value: number;
  };
  achievable: {
    weekly_time_commitment_hours: number;
    required_skills: string[];
    support_resources: string[];
  };
  relevant: {
    motivation_reason: string;
    life_dimension_alignment?: string;
  };
  time_bound: {
    target_date?: string;
    target_weeks?: number;
  };
  goal_summary?: SmartGoalSummary;
  created_at: string;
}

export interface PendingSMARTGoal {
  focusArea: string;
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timeBound: string;
}
