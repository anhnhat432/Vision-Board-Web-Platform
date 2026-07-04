import { useMemo } from "react";
import type { TwelveWeekSystem } from "@/app/utils/storage";
import { getWeeklyQuestDetails } from "./helpers";

interface WeeklyQuestLineProps {
  system: TwelveWeekSystem;
}

export function WeeklyQuestLine({ system }: WeeklyQuestLineProps) {
  const quest = useMemo(() => getWeeklyQuestDetails(system), [system]);

  if (!quest.hasSchedule) {
    return (
      <div className="bg-app-bg-subtle/20 rounded-lg p-2.5 border border-app-line/20 text-[11px] text-app-ink-muted/80 italic">
        Không có lịch trình tuần này.
      </div>
    );
  }

  const { completedDays, targetDays } = quest;

  return (
    <div className="bg-app-bg-subtle/30 rounded-lg p-2.5 border border-app-line/30 text-xs flex justify-between items-center transition-all duration-300">
      <div className="min-w-0 flex-1 truncate">
        <span className="font-bold text-app-ink-soft">Nhiệm vụ tuần:</span>{" "}
        <span className="text-app-ink-muted">Hoàn thành {targetDays} ngày hành động</span>
      </div>
      <div className="font-bold text-app-accent shrink-0 pl-2 tabular-nums">
        {completedDays}/{targetDays} ngày đã chốt
      </div>
    </div>
  );
}
