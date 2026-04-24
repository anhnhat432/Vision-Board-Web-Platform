import type { ComponentProps } from "react";

import { TwelveWeekProgressTab } from "@/app/components/twelve-week/TwelveWeekProgressTab";

export type PlanOverviewProps = ComponentProps<typeof TwelveWeekProgressTab>;

export function PlanOverview(props: PlanOverviewProps) {
  return <TwelveWeekProgressTab {...props} />;
}
