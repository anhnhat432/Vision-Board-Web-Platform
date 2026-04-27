import type { ComponentProps } from "react";

import { TwelveWeekWeekTab } from "@/app/components/twelve-week/TwelveWeekWeekTab";

export interface WeeklyReviewProps extends ComponentProps<typeof TwelveWeekWeekTab> {
  currentWeekNumber?: number;
}

export function WeeklyReview(props: WeeklyReviewProps) {
  return <TwelveWeekWeekTab {...props} />;
}
