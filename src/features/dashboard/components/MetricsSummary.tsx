import { memo } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import type { MetricSummaryItem } from "@/features/dashboard/helpers/dashboardInsights";

interface MetricsSummaryProps {
  items: MetricSummaryItem[];
}

function TrendIcon({ trend }: { trend: MetricSummaryItem["trend"] }) {
  if (trend === "up") {
    return <ArrowUpRight className="h-4 w-4 text-emerald-600" />;
  }

  if (trend === "down") {
    return <ArrowDownRight className="h-4 w-4 text-rose-600" />;
  }

  return <Minus className="h-4 w-4 text-slate-400" />;
}

function getTrendPill(trend: MetricSummaryItem["trend"]): string {
  if (trend === "up") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (trend === "down") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function MetricsSummaryComponent({ items }: MetricsSummaryProps) {
  return (
    <Card className="h-full border-0 bg-gradient-to-br from-white via-white to-emerald-50/70 shadow-[0_24px_48px_-34px_rgba(22,163,74,0.28)]">
      <CardHeader className="space-y-3 pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <CardDescription className="text-xs uppercase tracking-[0.16em] text-slate-500">Lead Metrics Summary</CardDescription>
            <CardTitle className="mt-1 text-base font-semibold text-slate-900">Metric Performance</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        {items.length === 0 ? (
          <div className="rounded-xl border border-slate-200/80 bg-white/80 p-4">
            <p className="text-sm text-slate-500">No metric logs available for this cycle yet.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white/85 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-500">
                    This week {item.currentWeekValue} · Prev {item.previousWeekValue}
                  </p>
                </div>
                <div className="ml-3 flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">{item.totalValue}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${getTrendPill(item.trend)}`}>
                    <TrendIcon trend={item.trend} />
                    {item.trend}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const MetricsSummary = memo(MetricsSummaryComponent);
