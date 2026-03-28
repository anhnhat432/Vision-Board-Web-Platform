import type { ComponentProps } from "react";

import { TwelveWeekSettingsTab } from "@/app/components/twelve-week/TwelveWeekSettingsTab";

import { ExecutionFeedback } from "./ExecutionFeedback";

export type WeekEditorProps = ComponentProps<typeof TwelveWeekSettingsTab>;

export function WeekEditor(props: WeekEditorProps) {
  const currentWeekScore =
    props.system.scoreboard.find((week) => week.weekNumber === props.system.currentWeek)?.weeklyScore ??
    0;

  return (
    <div className="space-y-6">
      <ExecutionFeedback score={currentWeekScore} />
      <TwelveWeekSettingsTab {...props} />
    </div>
  );
}
