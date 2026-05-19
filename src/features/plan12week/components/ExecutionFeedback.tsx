import { generateExecutionSuggestion, interpretExecutionScore } from "../logic/executionFeedback";

interface ExecutionFeedbackProps {
  score: number;
}

function getStatusLabel(status: ReturnType<typeof interpretExecutionScore>): string {
  switch (status) {
    case "excellent_execution":
      return "Thực hiện rất tốt";
    case "on_track":
      return "Đang đúng nhịp";
    case "at_risk":
      return "Cần chú ý";
    default:
      return "Cần cứu nhịp";
  }
}

function getBucketBadgeClass(score: number): string {
  if (score >= 80) return "bg-app-accent-soft text-app-accent";
  if (score >= 50) return "bg-app-bg text-app-ink-soft border border-app-line";
  return "bg-app-warm-soft text-app-warm";
}

function getBucketLabel(score: number): string {
  if (score >= 80) return "Tốt";
  if (score >= 50) return "Khá";
  return "Cần cải thiện";
}

export function ExecutionFeedback({ score }: ExecutionFeedbackProps) {
  const status = interpretExecutionScore(score);
  const suggestion = generateExecutionSuggestion(score);

  return (
    <div className="rounded-card border border-app-line bg-app-surface p-5 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-app-ink-muted">Phản hồi thực hiện</p>
          <p className="mt-1 text-[16px] font-semibold text-app-ink">{getStatusLabel(status)}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-serif text-3xl font-medium text-app-ink">{score}</span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getBucketBadgeClass(score)}`}
          >
            {getBucketLabel(score)}
          </span>
        </div>
      </div>
      <p className="mt-3 text-[14px] leading-6 text-app-ink-soft">{suggestion}</p>
    </div>
  );
}
