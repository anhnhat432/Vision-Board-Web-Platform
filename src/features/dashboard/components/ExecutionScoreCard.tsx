import { memo } from "react";
import { Gauge } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Progress } from "@/app/components/ui/progress";

interface ExecutionScoreCardProps {
  weekNumber: number | null;
  executionScore: number;
  completedTasks: number;
  totalTasks: number;
}

function getScoreTone(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-rose-600";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Strong execution";
  if (score >= 50) return "On track";
  return "Needs recovery";
}

function ExecutionScoreCardComponent({
  weekNumber,
  executionScore,
  completedTasks,
  totalTasks,
}: ExecutionScoreCardProps) {
  return (
    <Card className="h-full border-0 bg-gradient-to-br from-white via-white to-sky-50/70 shadow-[0_24px_48px_-34px_rgba(2,132,199,0.32)]">
      <CardHeader className="space-y-3 pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <Gauge className="h-5 w-5" />
          </div>
          <div>
            <CardDescription className="text-xs uppercase tracking-[0.16em] text-slate-500">Execution Score</CardDescription>
            <CardTitle className="mt-1 text-base font-semibold text-slate-900">
              {weekNumber ? `Week ${weekNumber}` : "Current Week"}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-1">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className={`text-3xl font-bold tracking-tight ${getScoreTone(executionScore)}`}>{executionScore}%</p>
            <p className="text-xs text-slate-500">{getScoreLabel(executionScore)}</p>
          </div>
          <div className="rounded-xl border border-sky-200 bg-white/90 px-3 py-1.5 text-right">
            <p className="text-sm font-semibold text-slate-900">{completedTasks}/{totalTasks || 0}</p>
            <p className="text-[11px] text-slate-500">planned tasks</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <Progress value={executionScore} className="h-2.5 bg-sky-100/70" />
          <p className="text-xs text-slate-500">
            Maintain consistency to stabilize weekly results.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export const ExecutionScoreCard = memo(ExecutionScoreCardComponent);
