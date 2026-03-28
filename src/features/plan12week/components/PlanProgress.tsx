import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Progress } from "@/app/components/ui/progress";

export interface PlanProgressWeek {
  weekNumber: number;
  executionScore: number;
  completed: boolean;
}

interface PlanProgressProps {
  weeks: PlanProgressWeek[];
  totalWeeks?: number;
}

function getWeekToneClass(score: number): string {
  if (score >= 80) return "bg-emerald-500 text-emerald-950";
  if (score >= 50) return "bg-amber-400 text-amber-950";
  return "bg-rose-500 text-rose-950";
}

function buildWeekSlots(weeks: PlanProgressWeek[], totalWeeks: number): PlanProgressWeek[] {
  return Array.from({ length: totalWeeks }, (_, index) => {
    const weekNumber = index + 1;
    const week = weeks.find((item) => item.weekNumber === weekNumber);

    if (week) {
      return week;
    }

    return {
      weekNumber,
      executionScore: 0,
      completed: false,
    };
  });
}

export function PlanProgress({ weeks, totalWeeks = 12 }: PlanProgressProps) {
  const weekSlots = buildWeekSlots(weeks, totalWeeks);
  const completedWeeks = weekSlots.filter((week) => week.completed).length;
  const progress = Math.round((completedWeeks / totalWeeks) * 100);

  return (
    <Card className="border-0 bg-white/85 shadow-[0_24px_54px_-34px_rgba(15,23,42,0.32)]">
      <CardHeader className="space-y-2 pb-3">
        <CardTitle className="text-lg text-slate-900">12 Week Progress</CardTitle>
        <p className="text-sm text-slate-600">
          {completedWeeks}/{totalWeeks} weeks reviewed
        </p>
        <Progress value={progress} className="h-2.5" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-12">
          {weekSlots.map((week) => (
            <div
              key={week.weekNumber}
              className={`rounded-xl px-2 py-2 text-center ${getWeekToneClass(week.executionScore)} ${
                week.completed ? "opacity-100" : "opacity-45"
              }`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">
                Week {week.weekNumber}
              </p>
              <p className="mt-1 text-sm font-semibold">{week.executionScore}%</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
