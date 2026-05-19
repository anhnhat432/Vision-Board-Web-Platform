import { Lightbulb } from "lucide-react";

interface ExecutionInsightsProps {
  averageExecutionScore: number;
  longestStreak: number;
  bestPerformingWeek: number | null;
  adaptiveSuggestion: string;
}

interface InsightItem {
  title: string;
  description: string;
}

export function ExecutionInsights({
  averageExecutionScore,
  longestStreak,
  bestPerformingWeek,
  adaptiveSuggestion,
}: ExecutionInsightsProps) {
  const insights: InsightItem[] = [
    {
      title: "Điểm thực hiện trung bình",
      description: `${averageExecutionScore} điểm trên thang 100.`,
    },
    {
      title: "Chuỗi ngày dài nhất",
      description: `${longestStreak} ngày liên tục giữ nhịp.`,
    },
    {
      title: "Tuần làm tốt nhất",
      description: bestPerformingWeek ? `Tuần ${bestPerformingWeek}.` : "Chưa có tuần nào nổi bật.",
    },
    {
      title: "Gợi ý điều chỉnh",
      description: adaptiveSuggestion,
    },
  ];

  return (
    <div className="rounded-card border border-app-line bg-app-surface p-5 md:p-6">
      <h3 className="text-[16px] font-semibold text-app-ink">Góc nhìn thực hiện</h3>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {insights.map((insight) => (
          <div key={insight.title} className="flex items-start gap-3 rounded-lg border border-app-line bg-app-bg p-3">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" />
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-app-ink">{insight.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-app-ink-muted">{insight.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
