export interface LeadMetricLog {
  id: string;
  metricId: string;
  date: string;
  value: number;
  completed: boolean;
  createdAt: string;
}

export interface LeadMetric {
  id: string;
  weekId: string;
  name: string;
  weeklyTarget: number;
  logs: LeadMetricLog[];
  createdAt: string;
  updatedAt: string;
}
