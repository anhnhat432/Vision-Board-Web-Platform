import { memo } from "react";
import { Target } from "lucide-react";

import { Progress } from "@/app/components/ui/progress";
import { DashboardInsightCard } from "./DashboardInsightCard";

interface GoalProgressCardProps {
  goalTitle: string;
  percent: number;
  completedTasks: number;
  totalTasks: number;
}

function GoalProgressCardComponent({
  goalTitle,
  percent,
  completedTasks,
  totalTasks,
}: GoalProgressCardProps) {
  return (
    <DashboardInsightCard
      contentClassName="space-y-4"
      eyebrow="Tiến độ mục tiêu"
      icon={Target}
      title={<span className="line-clamp-2 leading-6">{goalTitle}</span>}
      tone="violet"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-bold tracking-tight text-slate-950">{percent}%</p>
          <p className="text-xs text-slate-500">Tiến độ tổng thể</p>
        </div>
        <div className="rounded-[var(--r-tile)] border border-violet-200/80 bg-white/90 px-3 py-1.5 text-right shadow-sm">
          <p className="text-sm font-semibold text-slate-900">
            {completedTasks}/{totalTasks || 0}
          </p>
          <p className="text-[11px] text-slate-500">việc</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <Progress value={percent} className="h-2.5 bg-violet-100/70" />
        <p className="text-xs text-slate-500">Ưu tiên hoàn thành các việc có tác động cao trước.</p>
      </div>
    </DashboardInsightCard>
  );
}

export const GoalProgressCard = memo(GoalProgressCardComponent);
