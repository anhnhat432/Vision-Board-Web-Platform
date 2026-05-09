import { memo } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import type { MetricSummaryItem } from "@/features/dashboard/helpers/dashboardInsights";
import { DashboardInsightCard } from "./DashboardInsightCard";

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

function getTrendLabel(trend: MetricSummaryItem["trend"]): string {
  if (trend === "up") return "Tăng";
  if (trend === "down") return "Giảm";
  return "Ổn định";
}

function MetricsSummaryComponent({ items }: MetricsSummaryProps) {
  return (
    <DashboardInsightCard
      eyebrow="Tóm tắt chỉ số dẫn"
      icon={Activity}
      title="Hiệu suất tactic"
      tone="emerald"
    >
      {items.length === 0 ? (
        <div className="rounded-[var(--r-tile)] border border-slate-200/80 bg-white/80 p-4 shadow-sm">
          <p className="text-sm text-slate-500">Chưa có log chỉ số cho chu kỳ này.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between gap-3 rounded-[var(--r-tile)] border border-slate-200/80 bg-white/85 px-3 py-2.5 shadow-sm"
            >
              <div className="min-w-0">
                <p className="line-clamp-2 break-words text-sm font-semibold leading-5 text-slate-900">
                  {item.name}
                </p>
                <p className="text-xs text-slate-500">
                  Tuần này {item.currentWeekValue} · Trước đó {item.previousWeekValue}
                </p>
              </div>
              <div className="ml-3 flex shrink-0 items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">{item.totalValue}</span>
                <span className={`inline-flex items-center gap-1 rounded-[var(--r-pill)] border px-2 py-0.5 text-xs font-medium ${getTrendPill(item.trend)}`}>
                  <TrendIcon trend={item.trend} />
                  {getTrendLabel(item.trend)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardInsightCard>
  );
}

export const MetricsSummary = memo(MetricsSummaryComponent);
