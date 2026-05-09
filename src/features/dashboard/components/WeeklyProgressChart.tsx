import { memo } from "react";
import { BarChart3 } from "lucide-react";

import { Progress } from "@/app/components/ui/progress";
import type { WeeklyProgressPoint } from "@/features/dashboard/helpers/dashboardInsights";
import { DashboardInsightCard } from "./DashboardInsightCard";

interface WeeklyProgressChartProps {
  points: WeeklyProgressPoint[];
}

function getProgressTone(score: number): string {
  if (score >= 80) return "bg-emerald-100 text-emerald-700";
  if (score >= 50) return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

function WeeklyProgressChartComponent({ points }: WeeklyProgressChartProps) {
  return (
    <DashboardInsightCard
      contentClassName="space-y-3"
      eyebrow="Tiến độ theo tuần"
      icon={BarChart3}
      title="Thực thi từng tuần"
      tone="blue"
    >
      {points.length === 0 ? (
        <div className="rounded-[var(--r-tile)] border border-slate-200/80 bg-white/80 p-4 shadow-sm">
          <p className="text-sm text-slate-500">Chưa có dữ liệu thực thi theo tuần.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {points.map((point) => (
            <div
              key={point.weekNumber}
              className="rounded-[var(--r-tile)] border border-slate-200/80 bg-white/85 px-3 py-2.5 shadow-sm"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-800">Tuần {point.weekNumber}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    {point.completedTasks}/{point.totalTasks || 0}
                  </span>
                  <span className={`rounded-[var(--r-pill)] px-2 py-0.5 text-xs font-semibold ${getProgressTone(point.executionScore)}`}>
                    {point.executionScore}%
                  </span>
                </div>
              </div>
              <Progress value={point.executionScore} className="h-2.5 bg-slate-100" />
            </div>
          ))}
        </div>
      )}
    </DashboardInsightCard>
  );
}

export const WeeklyProgressChart = memo(WeeklyProgressChartComponent);
