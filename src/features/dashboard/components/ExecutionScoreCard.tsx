import { memo } from "react";
import { Gauge } from "lucide-react";

import { Progress } from "@/app/components/ui/progress";
import { DashboardInsightCard } from "./DashboardInsightCard";

interface ExecutionScoreCardProps {
  weekNumber: number | null;
  executionScore: number;
  completedTasks: number;
  totalTasks: number;
}

function getScoreTone(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-rose-600";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Thực thi tốt";
  if (score >= 50) return "Đúng nhịp";
  return "Cần phục hồi nhịp";
}

function ExecutionScoreCardComponent({
  weekNumber,
  executionScore,
  completedTasks,
  totalTasks,
}: ExecutionScoreCardProps) {
  return (
    <DashboardInsightCard
      contentClassName="space-y-4"
      eyebrow="Điểm thực thi"
      icon={Gauge}
      title={weekNumber ? `Tuần ${weekNumber}` : "Tuần hiện tại"}
      tone="sky"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className={`text-3xl font-bold tracking-tight ${getScoreTone(executionScore)}`}>{executionScore}%</p>
          <p className="text-xs text-slate-500">{getScoreLabel(executionScore)}</p>
        </div>
        <div className="rounded-[var(--r-tile)] border border-sky-200/80 bg-white/90 px-3 py-1.5 text-right shadow-sm">
          <p className="text-sm font-semibold text-slate-900">
            {completedTasks}/{totalTasks || 0}
          </p>
          <p className="text-[11px] text-slate-500">việc đã lên kế hoạch</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <Progress value={executionScore} className="h-2.5 bg-sky-100/70" />
        <p className="text-xs text-slate-500">Giữ nhịp đều để kết quả tuần ổn định hơn.</p>
      </div>
    </DashboardInsightCard>
  );
}

export const ExecutionScoreCard = memo(ExecutionScoreCardComponent);
