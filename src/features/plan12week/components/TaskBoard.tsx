import type { ComponentProps } from "react";

import { TwelveWeekTodayTab } from "@/app/components/twelve-week/TwelveWeekTodayTab";

export type TaskBoardProps = ComponentProps<typeof TwelveWeekTodayTab>;

export function TaskBoard(props: TaskBoardProps) {
  return <TwelveWeekTodayTab {...props} />;
}

