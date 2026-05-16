import { evaluateTwelveWeekPlanQuality } from "../logic/planQuality";
import type { PlanQualityInput, PlanQualityContext } from "../logic/planQuality";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { AlertCircle, Info, TrendingUp } from "lucide-react";

interface PlanQualityPanelProps {
  plan: {
    vision: string;
    weeks: Array<{
      weekNumber: number;
      expectedOutput: string;
      leadMetrics: Array<{ name: string; weeklyTarget: number }>;
      tasks: Array<{ title: string }>;
    }>;
  };
  context?: PlanQualityContext;
  className?: string;
}

export function PlanQualityPanel({ plan, context, className = "" }: PlanQualityPanelProps) {
  const week12 = plan.weeks.find((w) => w.weekNumber === 12);
  const week4 = plan.weeks.find((w) => w.weekNumber === 4);
  const week8 = plan.weeks.find((w) => w.weekNumber === 8);

  const input: PlanQualityInput = {
    vision12Week: plan.vision,
    week12Outcome: week12?.expectedOutput ?? "",
    lagMetric: { name: "Kết quả chính", target: "", unit: "lần" },
    leadIndicators: plan.weeks[0]?.leadMetrics.map((lm) => ({
      name: lm.name,
      target: lm.weeklyTarget.toString(),
      schedule: [], // Not available in preview
      type: "core" as const,
    })) ?? [],
    milestones: {
      week4: week4?.expectedOutput ?? "",
      week8: week8?.expectedOutput ?? "",
      week12: week12?.expectedOutput ?? "",
    },
  };

  const quality = evaluateTwelveWeekPlanQuality(input, context);

  const getLevelColor = (level: string) => {
    switch (level) {
      case "strong":
        return "bg-green-100 text-green-800 border-green-300";
      case "okay":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      default:
        return "bg-red-100 text-red-800 border-red-300";
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case "strong":
        return "Tốt";
      case "okay":
        return "Khá";
      default:
        return "Cần cải thiện";
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-5 w-5" />
          Đánh giá chất lượng kế hoạch
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Chất lượng tổng thể:</span>
            <Badge className={`${getLevelColor(quality.level)} border`}>
              {getLevelLabel(quality.level)} ({quality.overallScore}/100)
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {quality.dimensions.map((dim) => (
              <div
                key={dim.id}
                className="flex flex-col items-center gap-0.5"
                title={dim.label}
              >
                <div className="h-2 w-6 rounded-[var(--r-pill)] bg-gray-200 overflow-hidden">
                  <div
                    className={`h-full ${
                      dim.status === "strong"
                        ? "bg-green-500"
                        : dim.status === "okay"
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${(dim.score / dim.maxScore) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {dim.score}/{dim.maxScore}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Warnings */}
        {quality.warnings.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="ml-4 list-disc space-y-1 text-sm">
                {quality.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Suggestions */}
        {quality.suggestions.length > 0 && (
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              <ul className="ml-4 list-disc space-y-1 text-sm text-blue-900">
                {quality.suggestions.map((suggestion) => (
                  <li key={suggestion}>{suggestion}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Dimension details (optional) */}
        <div className="rounded-[var(--r-control)] border p-3">
          <h4 className="mb-2 text-sm font-medium">Chi tiết điểm từng tiêu chí:</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {quality.dimensions.map((dim) => (
              <div
                key={dim.id}
                className={`flex items-center justify-between rounded-[var(--r-control)] px-2 py-1 ${
                  dim.status === "strong"
                    ? "bg-green-50"
                    : dim.status === "okay"
                    ? "bg-yellow-50"
                    : "bg-red-50"
                }`}
              >
                <span>{dim.label}</span>
                <span className="font-medium">
                  {dim.score}/{dim.maxScore}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
