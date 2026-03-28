import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";

interface ExecutionInsightsProps {
  averageExecutionScore: number;
  longestStreak: number;
  bestPerformingWeek: number | null;
  adaptiveSuggestion: string;
}

export function ExecutionInsights({
  averageExecutionScore,
  longestStreak,
  bestPerformingWeek,
  adaptiveSuggestion,
}: ExecutionInsightsProps) {
  return (
    <Card className="border-0 bg-white/85 shadow-[0_24px_54px_-34px_rgba(15,23,42,0.32)]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-slate-900">Execution Insights</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
        <p>
          <span className="font-semibold">Average execution score:</span> {averageExecutionScore}
        </p>
        <p>
          <span className="font-semibold">Longest streak:</span> {longestStreak} days
        </p>
        <p>
          <span className="font-semibold">Best performing week:</span>{" "}
          {bestPerformingWeek ? `Week ${bestPerformingWeek}` : "N/A"}
        </p>
        <p>
          <span className="font-semibold">Adaptive suggestion:</span> {adaptiveSuggestion}
        </p>
      </CardContent>
    </Card>
  );
}
