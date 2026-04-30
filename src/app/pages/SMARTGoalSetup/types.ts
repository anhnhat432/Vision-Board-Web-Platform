export interface SMARTData {
  specific: {
    goal_statement: string;
  };
  measurable: {
    metric_name: string;
    baseline_value: string;
    target_value: string;
  };
  achievable: {
    weekly_time_commitment_hours: string;
    required_skills: string;
    support_resources: string;
  };
  relevant: {
    motivation_reason: string;
    life_dimension_alignment: string;
  };
  timeBound: {
    mode: "date" | "weeks";
    target_date: string;
    target_weeks: string;
  };
}

export type SmartStepKey = keyof SMARTData;

export interface SmartStepDefinition {
  key: SmartStepKey;
  label: string;
  title: string;
  placeholder: string;
  description: string;
  coaching: string;
  completionHint: string;
}

export interface GoalClarityItem {
  id: string;
  label: string;
  detail: string;
  done: boolean;
  stepKey: SmartStepKey;
}

export interface SmartGoalSummaryRow {
  key: SmartStepKey;
  label: string;
  value: string;
}
