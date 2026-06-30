import type { ComponentProps } from "react";

import { TwelveWeekSettingsTab } from "@/app/components/twelve-week/TwelveWeekSettingsTab";

export type WeekEditorProps = ComponentProps<typeof TwelveWeekSettingsTab>;

export function WeekEditor(props: WeekEditorProps) {
  return <TwelveWeekSettingsTab {...props} />;
}
