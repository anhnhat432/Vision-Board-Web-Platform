import { memo } from "react";
import { Flame } from "lucide-react";

import { DashboardInsightCard } from "./DashboardInsightCard";

interface StreakCardProps {
  streak: number;
  threshold?: number;
}

function StreakCardComponent({ streak, threshold = 70 }: StreakCardProps) {
  return (
    <DashboardInsightCard
      contentClassName="space-y-3"
      eyebrow="Chuỗi tuần đều"
      icon={Flame}
      title="Nhịp nhất quán"
      tone="amber"
    >
      <div className="flex items-end justify-between gap-3">
        <p className="text-3xl font-bold tracking-tight text-slate-950">{streak}</p>
        <span className="rounded-full border border-amber-200/80 bg-white/90 px-2.5 py-1 text-xs font-medium text-amber-700 shadow-sm">
          Ngưỡng {threshold}%
        </span>
      </div>
      <p className="text-sm leading-6 text-slate-600">Chuỗi tuần dài nhất giữ được mức thực thi khỏe.</p>
    </DashboardInsightCard>
  );
}

export const StreakCard = memo(StreakCardComponent);
