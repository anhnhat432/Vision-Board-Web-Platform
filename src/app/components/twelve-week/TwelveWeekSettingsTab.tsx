import { AlertTriangle, CalendarClock, RotateCcw, SlidersHorizontal } from "lucide-react";
import { SectionBlock } from "@/app/components/layout/SectionBlock";
import { Button } from "../ui/button";
import { TwelveWeekCycleSettingsPanel } from "./TwelveWeekCycleSettingsPanel";
import type { TwelveWeekSettingsTabProps } from "./TwelveWeekSettingsShared";
import { WeeklyTimeBlocksPanel } from "./WeeklyTimeBlocksPanel";

export function TwelveWeekSettingsTab(props: TwelveWeekSettingsTabProps) {
  return (
    <div className="stack-section pt-4 space-y-8 pb-12">
      <SectionBlock
        title={
          <span className="flex items-center gap-2 text-app-ink">
            <SlidersHorizontal className="h-5 w-5 text-app-accent" />
            Cài đặt chu kỳ
            <span className="sr-only">Cài đặt mục tiêu</span>
          </span>
        }
        description="Chỉ các tuỳ chỉnh ảnh hưởng trực tiếp đến chu kỳ 12 tuần hiện tại: nhịp review, mức tải, tactics và lịch tuần."
      >
        <TwelveWeekCycleSettingsPanel
          system={props.system}
          onReviewDayChange={props.onReviewDayChange}
          onReminderTimeChange={props.onReminderTimeChange}
          onLoadPreferenceChange={props.onLoadPreferenceChange}
          onStatusChange={props.onStatusChange}
          onTacticPriorityChange={props.onTacticPriorityChange}
          onTacticTypeChange={props.onTacticTypeChange}
        />
        <div className="mt-6 border-t border-app-line pt-6">
          <p className="text-sm font-semibold text-app-ink mb-3 flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-app-status-info" />
            Lịch tuần tham chiếu
          </p>
          <WeeklyTimeBlocksPanel value={props.system.weeklyTimeBlocks ?? []} onChange={props.onTimeBlocksChange} />
        </div>
      </SectionBlock>

      <SectionBlock
        title={
          <span className="flex items-center gap-2 text-app-ink">
            <AlertTriangle className="h-5 w-5 text-app-warm" />
            Hành động chu kỳ
          </span>
        }
        description="Các thao tác chỉ tác động đến chu kỳ 12 tuần hiện tại."
      >
        <div className="rounded-xl border border-app-warm/25 bg-app-warm-soft p-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-app-surface text-app-warm">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-app-warm">Làm mới chu kỳ hiện tại</p>
                <p className="mt-1 text-sm leading-6 text-app-warm">
                  Bắt đầu lại tuần 1 từ tuần hiện tại, làm mới việc/check-in/review nhưng giữ mục tiêu và tactics.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="border-app-warm/30 bg-app-surface text-app-warm hover:bg-app-warm-soft"
              onClick={props.onOpenResetDialog}
            >
              <RotateCcw className="h-4 w-4" />
              Làm mới chu kỳ
            </Button>
          </div>
        </div>
      </SectionBlock>
    </div>
  );
}
