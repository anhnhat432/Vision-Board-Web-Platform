import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";

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
      return "Excellent Execution";
    case "on_track":
      return "On Track";
    case "at_risk":
      return "At Risk";
    case "critical":
    default:
      return "Critical";
  }
}

export function ExecutionFeedback({ score }: ExecutionFeedbackProps) {
  const status = interpretExecutionScore(score);
  const suggestion = generateExecutionSuggestion(score);

  return (
    <Card className="border-0 bg-white/85 shadow-[0_24px_54px_-34px_rgba(15,23,42,0.32)]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-slate-900">Execution Feedback</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-slate-700">
          <span className="font-semibold">Status:</span> {getStatusLabel(status)}
        </p>
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-700">Suggestion:</span> {suggestion}
        </p>
      </CardContent>
    </Card>
  );
}
