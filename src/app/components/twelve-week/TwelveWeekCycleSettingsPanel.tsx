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
      <Card
        data-tour-id="system-settings-panel"
        className="border border-slate-200/80 bg-white/92 shadow-sm"
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-950">
            <SlidersHorizontal className="h-5 w-5 text-sky-700" />
            Cài đặt chu kỳ
          </CardTitle>
          <CardDescription className="text-slate-700">
            Chỉnh nhịp review, mức tải và thứ tự việc lặp lại để hợp với cách bạn làm thật ngoài đời.
          </CardDescription>
        </CardHeader>
        <CardContent className="stack-section">
          <div className="rounded-[var(--r-control)] border border-sky-200 bg-sky-50 p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                  Một lần chỉnh cho cả chu kỳ
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  Nhịp tuần, thứ tự việc và trạng thái chu kỳ trong cùng một nơi.
                </p>
              </div>
              <Badge variant="outline" className="border-sky-200 bg-white text-sky-800">
                {STATUS_OPTIONS.find((option) => option.value === system.status)?.label ?? system.status}
              </Badge>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="stack-tight rounded-[var(--r-control)] border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Ngày review
                </p>
                <p className="mt-1 text-sm text-slate-600">Ngày bạn muốn khóa tuần và tự đánh giá lại nhịp.</p>
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

            <div className="stack-tight rounded-[var(--r-control)] border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <Clock3 className="h-3.5 w-3.5" />
                  Giờ nhắc
                </p>
                <p className="mt-1 text-sm text-slate-600">Khung giờ trên thiết bị để nhắc check-in và review.</p>
              </div>
              <Input
                id="reminder-time"
                value={system.dailyReminderTime || "19:00"}
                onChange={(event) => onReminderTimeChange(event.target.value)}
                type="time"
                aria-label="Chọn giờ nhắc"
              />
            </div>

            <div className="stack-tight rounded-[var(--r-control)] border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <ListChecks className="h-3.5 w-3.5" />
                  Nhịp tuần
                </p>
                <p className="mt-1 text-sm text-slate-600">
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

            <div className="stack-tight rounded-[var(--r-control)] border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <Flag className="h-3.5 w-3.5" />
                  Trạng thái
                </p>
                <p className="mt-1 text-sm text-slate-600">
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

          <div className="rounded-[var(--r-control)] border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Thứ tự việc lặp lại</p>
                <p className="mt-1 text-sm text-slate-600">
                  Việc cốt lõi được ưu tiên trong điểm tuần. Việc tùy chọn là phần thêm khi bạn còn sức.
                </p>
              </div>
              <Badge variant="outline" className="border-slate-300 bg-white text-slate-700">
                {system.leadIndicators.length} việc
              </Badge>
            </div>
            <div className="mt-4 stack-stack">
              {system.leadIndicators.map((indicator, index) => (
                <div
                  key={indicator.id || indicator.name}
                  className={`grid gap-4 rounded-[var(--r-control)] border p-5 shadow-sm md:grid-cols-[minmax(0,1fr)_150px_140px] ${
                    indicator.type === "optional" ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-white"
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-950">{indicator.name}</p>
                      <Badge
                        variant="outline"
                        className={
                          indicator.type === "optional"
                            ? "border-amber-200 bg-amber-50 text-amber-800"
                            : "border-emerald-200 bg-emerald-50 text-emerald-800"
                        }
                      >
                        {indicator.type === "optional" ? "Tùy chọn" : "Cốt lõi"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
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
            <div className="rounded-[var(--r-control)] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Bắt đầu</p>
              <p className="mt-2 text-xl font-bold text-white">{formatCalendarDate(system.startDate)}</p>
            </div>
            <div className="rounded-[var(--r-control)] border border-sky-200 bg-sky-50 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">Kết thúc</p>
              <p className="mt-2 text-xl font-bold text-slate-950">{formatCalendarDate(system.endDate)}</p>
            </div>
            <div className="rounded-[var(--r-control)] border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Số lần quay lại nhịp</p>
              <p className="mt-2 text-xl font-bold text-slate-950">{system.reentryCount ?? 0} lần</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
