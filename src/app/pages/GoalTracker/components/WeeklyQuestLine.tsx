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
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-app-ink-muted truncate">
        Nhiệm vụ tuần: <span className="font-bold text-app-ink">{completedDays}/{targetDays} ngày đã chốt</span>
      </span>
    </div>
  );
}
