import { useState } from "react";
import { CalendarDays, Clock3, Flag, ListChecks, SlidersHorizontal } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { formatCalendarDate } from "../../utils/storage";
import { LOAD_OPTIONS, REVIEW_DAYS, STATUS_OPTIONS } from "../../utils/twelve-week-system-ui";
import type { TwelveWeekSettingsTabProps } from "./TwelveWeekSettingsShared";

type TwelveWeekCycleSettingsPanelProps = Pick<
  TwelveWeekSettingsTabProps,
  | "system"
  | "onReviewDayChange"
  | "onReminderTimeChange"
  | "onLoadPreferenceChange"
  | "onStatusChange"
  | "onTacticPriorityChange"
  | "onTacticTypeChange"
>;

export function TwelveWeekCycleSettingsPanel({
  system,
  onReviewDayChange,
  onReminderTimeChange,
  onLoadPreferenceChange,
  onStatusChange,
  onTacticPriorityChange,
  onTacticTypeChange,
}: TwelveWeekCycleSettingsPanelProps) {
  const [pendingReviewDay, setPendingReviewDay] = useState<string | null>(null);

  const handleReviewDayChange = (value: string) => {
    if (value === system.reviewDay) return;
    setPendingReviewDay(value);
  };

  const handleConfirmReviewDayChange = () => {
    if (!pendingReviewDay) return;
    onReviewDayChange(pendingReviewDay);
    setPendingReviewDay(null);
  };

  return (
    <>
      <AlertDialog open={pendingReviewDay !== null} onOpenChange={(open) => !open && setPendingReviewDay(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Đổi ngày review?</AlertDialogTitle>
            <AlertDialogDescription>
              Đổi ngày review sẽ điều chỉnh lịch việc các tuần còn lại (tuần đã review không đổi). Tiếp tục?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReviewDayChange}>Đồng ý đổi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Card data-tour-id="system-settings-panel" className="border border-app-line bg-app-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-app-ink">
            <SlidersHorizontal className="h-5 w-5 text-app-accent" />
            Cài đặt chu kỳ
          </CardTitle>
          <CardDescription className="text-app-ink-soft">
            Chỉnh nhịp review, mức tải và thứ tự việc lặp lại để hợp với cách bạn làm thật ngoài đời.
          </CardDescription>
        </CardHeader>
        <CardContent className="stack-section">
          <div className="rounded-lg border border-app-accent/20 bg-app-accent-soft p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-accent">
                  Một lần chỉnh cho cả chu kỳ
                </p>
                <p className="mt-2 font-serif text-lg font-medium text-app-ink">
                  Nhịp tuần, thứ tự việc và trạng thái chu kỳ trong cùng một nơi.
                </p>
              </div>
              <Badge variant="outline" className="border-app-accent/30 bg-app-surface text-app-accent">
                {STATUS_OPTIONS.find((option) => option.value === system.status)?.label ?? system.status}
              </Badge>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="stack-tight rounded-lg border border-app-line bg-app-bg p-4">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-muted">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Ngày review
                </p>
                <p className="mt-1 text-sm text-app-ink-soft">Ngày bạn muốn khóa tuần và tự đánh giá lại nhịp.</p>
              </div>
              <Select value={system.reviewDay} onValueChange={handleReviewDayChange}>
                <SelectTrigger id="review-day" aria-label="Chọn ngày review">
                  <SelectValue placeholder="Chọn ngày review" />
                </SelectTrigger>
                <SelectContent>
                  {REVIEW_DAYS.map((day) => (
                    <SelectItem key={day.value} value={day.value}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="stack-tight rounded-lg border border-app-line bg-app-bg p-4">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-muted">
                  <Clock3 className="h-3.5 w-3.5" />
                  Giờ nhắc
                </p>
                <p className="mt-1 text-sm text-app-ink-soft">
                  Khung giờ trên thiết bị để nhắc check-in và review.
                </p>
              </div>
              <Input
                id="reminder-time"
                value={system.dailyReminderTime || "19:00"}
                onChange={(event) => onReminderTimeChange(event.target.value)}
                type="time"
                aria-label="Chọn giờ nhắc"
              />
            </div>

            <div className="stack-tight rounded-lg border border-app-line bg-app-bg p-4">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-muted">
                  <ListChecks className="h-3.5 w-3.5" />
                  Nhịp tuần
                </p>
                <p className="mt-1 text-sm text-app-ink-soft">
                  Cho biết tuần này bạn muốn cân bằng, nhẹ hơn hay đẩy mạnh.
                </p>
              </div>
              <Select value={system.tacticLoadPreference || "balanced"} onValueChange={onLoadPreferenceChange}>
                <SelectTrigger id="week-load" aria-label="Chọn nhịp tuần">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOAD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="stack-tight rounded-lg border border-app-line bg-app-bg p-4">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-muted">
                  <Flag className="h-3.5 w-3.5" />
                  Trạng thái
                </p>
                <p className="mt-1 text-sm text-app-ink-soft">
                  Giúp Trang chính và màn Hôm nay biết chu kỳ này đang chạy hay đã kết thúc.
                </p>
              </div>
              <Select value={system.status} onValueChange={onStatusChange}>
                <SelectTrigger id="cycle-status" aria-label="Chọn trạng thái chu kỳ">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border border-app-line bg-app-bg p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-muted">
                  Thứ tự việc lặp lại
                </p>
                <p className="mt-1 text-sm text-app-ink-soft">
                  Việc cốt lõi được ưu tiên trong điểm tuần. Việc tùy chọn là phần thêm khi bạn còn sức.
                </p>
              </div>
              <Badge variant="outline" className="border-app-line bg-app-surface text-app-ink-soft">
                {system.leadIndicators.length} việc
              </Badge>
            </div>
            <div className="mt-4 stack-stack">
              {system.leadIndicators.map((indicator, index) => (
                <div
                  key={indicator.id || indicator.name}
                  className={`grid gap-4 rounded-lg border p-5 md:grid-cols-[minmax(0,1fr)_150px_140px] ${
                    indicator.type === "optional"
                      ? "border-app-warm/30 bg-app-warm-soft"
                      : "border-app-accent/20 bg-app-surface"
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-app-ink">{indicator.name}</p>
                      <Badge
                        variant="outline"
                        className={
                          indicator.type === "optional"
                            ? "border-app-warm/30 bg-app-warm-soft text-app-warm"
                            : "border-app-accent/20 bg-app-accent-soft text-app-accent"
                        }
                      >
                        {indicator.type === "optional" ? "Tùy chọn" : "Cốt lõi"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-app-ink-soft">
                      {indicator.target || "1"} {indicator.unit || "lần/tuần"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`tactic-priority-${index}`}>Ưu tiên</Label>
                    <Select
                      value={String(indicator.priority ?? index + 1)}
                      onValueChange={(value) => onTacticPriorityChange(indicator.id, value)}
                    >
                      <SelectTrigger
                        id={`tactic-priority-${index}`}
                        aria-label={`Chọn độ ưu tiên cho tactic ${indicator.name}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: system.leadIndicators.length }, (_, optionIndex) => optionIndex + 1).map(
                          (priority) => (
                            <SelectItem key={priority} value={String(priority)}>
                              {priority}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`tactic-type-${index}`}>Loại</Label>
                    <Select
                      value={indicator.type === "optional" ? "optional" : "core"}
                      onValueChange={(value) => onTacticTypeChange(indicator.id, value)}
                    >
                      <SelectTrigger id={`tactic-type-${index}`} aria-label={`Chọn loại tactic ${indicator.name}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="core">Cốt lõi</SelectItem>
                        <SelectItem value="optional">Tùy chọn</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-app-ink bg-app-ink p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Bắt đầu</p>
              <p className="mt-2 font-serif text-xl font-medium text-white">{formatCalendarDate(system.startDate)}</p>
            </div>
            <div className="rounded-lg border border-app-accent/20 bg-app-accent-soft p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-accent">Kết thúc</p>
              <p className="mt-2 font-serif text-xl font-medium text-app-ink">{formatCalendarDate(system.endDate)}</p>
            </div>
            <div className="rounded-lg border border-app-warm/30 bg-app-warm-soft p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-warm">
                Số lần quay lại nhịp
              </p>
              <p className="mt-2 font-serif text-xl font-medium text-app-ink">{system.reentryCount ?? 0} lần</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
