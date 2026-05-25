import { AlertCircle, Info, TrendingUp } from "lucide-react";

import { evaluateTwelveWeekPlanQuality } from "../logic/planQuality";
import type { PlanQualityInput, PlanQualityContext } from "../logic/planQuality";

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

function getBucketBadgeClass(level: string): string {
  if (level === "strong") return "bg-app-accent-soft text-app-accent";
  if (level === "okay") return "bg-app-bg text-app-ink-soft border border-app-line";
  return "bg-app-warm-soft text-app-warm";
}

function getLevelLabel(level: string): string {
  if (level === "strong") return "Tốt";
  if (level === "okay") return "Khá";
  return "Cần cải thiện";
}

function getDimensionFillClass(status: string): string {
  if (status === "strong") return "bg-app-accent";
  if (status === "okay") return "bg-app-ink-soft";
  return "bg-app-warm";
}

function getDimensionRowClass(status: string): string {
  if (status === "strong") return "bg-app-accent-soft";
  if (status === "okay") return "bg-app-bg";
  return "bg-app-warm-soft";
}

export function PlanQualityPanel({ plan, context, className = "" }: PlanQualityPanelProps) {
  const week12 = plan.weeks.find((w) => w.weekNumber === 12);
  const week4 = plan.weeks.find((w) => w.weekNumber === 4);
  const week8 = plan.weeks.find((w) => w.weekNumber === 8);

  const input: PlanQualityInput = {
    vision12Week: plan.vision,
    week12Outcome: week12?.expectedOutput ?? "",
    lagMetric: { name: "Kết quả chính", target: "", unit: "lần" },
    leadIndicators:
      plan.weeks[0]?.leadMetrics.map((lm) => ({
        name: lm.name,
        target: lm.weeklyTarget.toString(),
        schedule: [],
        type: "core" as const,
      })) ?? [],
    milestones: {
      week4: week4?.expectedOutput ?? "",
      week8: week8?.expectedOutput ?? "",
      week12: week12?.expectedOutput ?? "",
    },
  };

  const quality = evaluateTwelveWeekPlanQuality(input, context);

  return (
    <div className={`surface-raised rounded-xl border border-app-line bg-app-surface p-5 md:p-6 ${className}`}>
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-app-accent" />
        <h3 className="text-base font-semibold text-app-ink">Đánh giá nhanh kế hoạch</h3>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-serif text-3xl font-medium text-app-ink">{quality.overallScore}</span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getBucketBadgeClass(quality.level)}`}
          >
            {getLevelLabel(quality.level)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {quality.dimensions.map((dim) => (
            <div key={dim.id} className="flex flex-col items-center gap-0.5" title={dim.label}>
              <div className="h-2 w-6 overflow-hidden rounded-full bg-app-line">
                <div
                  className={`h-full ${getDimensionFillClass(dim.status)}`}
                  style={{ width: `${(dim.score / dim.maxScore) * 100}%` }}
                />
              </div>
              <span className="text-xs text-app-ink-muted">
                {dim.score}/{dim.maxScore}
              </span>
            </div>
          ))}
        </div>
      </div>

      {quality.warnings.length > 0 && (
        <div className="mt-4 rounded-lg border border-app-warm/30 bg-app-warm-soft p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-app-warm" />
            <ul className="space-y-1 text-sm leading-6 text-app-warm">
              {quality.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {quality.suggestions.length > 0 && (
        <div className="mt-3 rounded-lg border border-app-line bg-app-bg p-3">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" />
            <ul className="space-y-1 text-sm leading-6 text-app-ink-soft">
              {quality.suggestions.map((suggestion) => (
                <li key={suggestion}>{suggestion}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-lg border border-app-line p-3">
        <h4 className="mb-2 text-sm font-medium text-app-ink">Chi tiết từng tiêu chí</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {quality.dimensions.map((dim) => (
            <div
              key={dim.id}
              className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-app-ink-soft ${getDimensionRowClass(dim.status)}`}
            >
              <span>{dim.label}</span>
              <span className="font-medium">
                {dim.score}/{dim.maxScore}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
