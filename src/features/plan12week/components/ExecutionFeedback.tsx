import { Card, CardContent } from "@/app/components/ui/card";

import {
  generateExecutionSuggestion,
  interpretExecutionScore,
} from "../logic/executionFeedback";

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

export function ExecutionFeedback({ score }: ExecutionFeedbackProps) {
  const status = interpretExecutionScore(score);
  const suggestion = generateExecutionSuggestion(score);

  return (
    <Card className="border border-slate-200 bg-white/88 shadow-sm">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Phản hồi thực hiện</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">{getStatusLabel(status)}</p>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">{suggestion}</p>
      </CardContent>
    </Card>
  );
}
