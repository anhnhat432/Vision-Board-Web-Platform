import { memo } from "react";
import { Target } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Progress } from "@/app/components/ui/progress";

interface GoalProgressCardProps {
  goalTitle: string;
  percent: number;
  completedTasks: number;
  totalTasks: number;
}

function GoalProgressCardComponent({
  goalTitle,
  percent,
  completedTasks,
  totalTasks,
}: GoalProgressCardProps) {
  return (
    <Card className="h-full border-0 bg-gradient-to-br from-white via-white to-violet-50/70 shadow-[0_24px_48px_-34px_rgba(99,102,241,0.32)]">
      <CardHeader className="space-y-3 pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <CardDescription className="text-xs uppercase tracking-[0.16em] text-slate-500">Goal Progress</CardDescription>
            <CardTitle className="mt-1 line-clamp-1 text-base font-semibold text-slate-900">
              {goalTitle}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-1">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-3xl font-bold tracking-tight text-slate-900">{percent}%</p>
            <p className="text-xs text-slate-500">Overall completion</p>
          </div>
          <div className="rounded-xl border border-violet-200 bg-white/90 px-3 py-1.5 text-right">
            <p className="text-sm font-semibold text-slate-900">{completedTasks}/{totalTasks || 0}</p>
            <p className="text-[11px] text-slate-500">tasks</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <Progress value={percent} className="h-2.5 bg-violet-100/70" />
          <p className="text-xs text-slate-500">
            Focus on completing high-impact tasks first.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export const GoalProgressCard = memo(GoalProgressCardComponent);
