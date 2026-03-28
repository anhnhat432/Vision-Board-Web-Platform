import { memo } from "react";
import { Flame } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";

interface StreakCardProps {
  streak: number;
  threshold?: number;
}

function StreakCardComponent({ streak, threshold = 70 }: StreakCardProps) {
  return (
    <Card className="h-full border-0 bg-gradient-to-br from-white via-white to-amber-50/80 shadow-[0_24px_48px_-34px_rgba(217,119,6,0.35)]">
      <CardHeader className="space-y-3 pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <CardDescription className="text-xs uppercase tracking-[0.16em] text-slate-500">Weekly Streak</CardDescription>
            <CardTitle className="mt-1 text-base font-semibold text-slate-900">Consistency Streak</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-1">
        <div className="flex items-end justify-between">
          <p className="text-3xl font-bold tracking-tight text-slate-900">{streak}</p>
          <span className="rounded-full border border-amber-200 bg-white/90 px-2.5 py-1 text-xs font-medium text-amber-700">
            Threshold {threshold}%
          </span>
        </div>
        <p className="text-sm text-slate-600">
          Longest run of weeks with healthy execution.
        </p>
      </CardContent>
    </Card>
  );
}

export const StreakCard = memo(StreakCardComponent);
