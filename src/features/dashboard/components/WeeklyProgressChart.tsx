import { memo } from "react";
import { BarChart3 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Progress } from "@/app/components/ui/progress";
import type { WeeklyProgressPoint } from "@/features/dashboard/helpers/dashboardInsights";

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
    <Card className="h-full border-0 bg-gradient-to-br from-white via-white to-blue-50/70 shadow-[0_24px_48px_-34px_rgba(59,130,246,0.3)]">
      <CardHeader className="space-y-3 pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <CardDescription className="text-xs uppercase tracking-[0.16em] text-slate-500">Weekly Progress</CardDescription>
            <CardTitle className="mt-1 text-base font-semibold text-slate-900">
              Execution By Week
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-1">
        {points.length === 0 ? (
          <div className="rounded-xl border border-slate-200/80 bg-white/80 p-4">
            <p className="text-sm text-slate-500">No weekly execution data yet.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {points.map((point) => (
              <div
                key={point.weekNumber}
                className="rounded-xl border border-slate-200/80 bg-white/85 px-3 py-2.5"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-800">Week {point.weekNumber}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                      {point.completedTasks}/{point.totalTasks || 0}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getProgressTone(point.executionScore)}`}>
                      {point.executionScore}%
                    </span>
                  </div>
                </div>
                <Progress value={point.executionScore} className="h-2.5 bg-slate-100" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const WeeklyProgressChart = memo(WeeklyProgressChartComponent);
