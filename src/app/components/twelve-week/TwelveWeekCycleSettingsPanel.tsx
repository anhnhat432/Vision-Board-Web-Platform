import { useState } from "react";
import { CalendarDays, Clock3, Flag, ListChecks, SlidersHorizontal, PlayCircle, Calendar, RotateCcw } from "lucide-react";

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
      <Card data-tour-id="system-settings-panel" className="border border-app-line bg-app-surface shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-app-ink text-xl font-bold">
            <SlidersHorizontal className="h-5 w-5 text-app-accent animate-pulse" />
            Cài đặt chu kỳ
          </CardTitle>
          <CardDescription className="text-app-ink-soft mt-1.5 text-sm">
            Chỉnh nhịp review, mức tải và thứ tự việc lặp lại để hợp với cách bạn làm thật ngoài đời.
          </CardDescription>
        </CardHeader>
        <CardContent className="stack-section">
          {/* Glassmorphism Hero Panel */}
          <div className="rounded-xl border border-emerald-300/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent backdrop-blur-md p-6 shadow-md transition-all duration-300 hover:shadow-lg">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Một lần chỉnh cho cả chu kỳ
                </p>
                <p className="mt-2.5 font-serif text-lg font-medium text-app-ink leading-relaxed">
                  Nhịp tuần, thứ tự việc và trạng thái chu kỳ trong cùng một nơi.
                </p>
              </div>
              <Badge variant="outline" className="border-emerald-300/50 bg-app-surface/80 text-emerald-700 dark:text-emerald-400 font-bold px-3 py-1 text-xs tracking-wide shadow-sm rounded-full">
                {STATUS_OPTIONS.find((option) => option.value === system.status)?.label ?? system.status}
              </Badge>
            </div>
          </div>

          {/* Grid Settings Inputs V2 */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="stack-tight rounded-xl border border-app-line bg-app-surface/50 p-5 shadow-sm hover:shadow-md hover:border-app-line-strong transition-all duration-300">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-app-ink-muted">
                  <CalendarDays className="h-4 w-4 text-app-accent" />
                  Ngày review
                </p>
                <p className="mt-1 text-sm text-app-ink-soft">Ngày bạn muốn khóa tuần và tự đánh giá lại nhịp.</p>
              </div>
              <div className="mt-3">
                <Select value={system.reviewDay} onValueChange={handleReviewDayChange}>
                  <SelectTrigger id="review-day" aria-label="Chọn ngày review" className="border-app-line hover:border-app-line-strong transition-colors duration-200">
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
            </div>

            <div className="stack-tight rounded-xl border border-app-line bg-app-surface/50 p-5 shadow-sm hover:shadow-md hover:border-app-line-strong transition-all duration-300">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-app-ink-muted">
                  <Clock3 className="h-4 w-4 text-app-accent" />
                  Giờ nhắc
                </p>
                <p className="mt-1 text-sm text-app-ink-soft">
                  Khung giờ trên thiết bị để nhắc check-in và review.
                </p>
              </div>
              <div className="mt-3">
                <Input
                  id="reminder-time"
                  value={system.dailyReminderTime || "19:00"}
                  onChange={(event) => onReminderTimeChange(event.target.value)}
                  type="time"
                  aria-label="Chọn giờ nhắc"
                  className="border-app-line hover:border-app-line-strong transition-colors duration-200"
                />
              </div>
            </div>

            <div className="stack-tight rounded-xl border border-app-line bg-app-surface/50 p-5 shadow-sm hover:shadow-md hover:border-app-line-strong transition-all duration-300">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-app-ink-muted">
                  <ListChecks className="h-4 w-4 text-app-accent" />
                  Nhịp tuần
                </p>
                <p className="mt-1 text-sm text-app-ink-soft">
                  Cho biết tuần này bạn muốn cân bằng, nhẹ hơn hay đẩy mạnh.
                </p>
              </div>
              <div className="mt-3">
                <Select value={system.tacticLoadPreference || "balanced"} onValueChange={onLoadPreferenceChange}>
                  <SelectTrigger id="week-load" aria-label="Chọn nhịp tuần" className="border-app-line hover:border-app-line-strong transition-colors duration-200">
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
            </div>

            <div className="stack-tight rounded-xl border border-app-line bg-app-surface/50 p-5 shadow-sm hover:shadow-md hover:border-app-line-strong transition-all duration-300">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-app-ink-muted">
                  <Flag className="h-4 w-4 text-app-accent" />
                  Trạng thái
                </p>
                <p className="mt-1 text-sm text-app-ink-soft">
                  Giúp Trang chính và màn Hôm nay biết chu kỳ này đang chạy hay đã kết thúc.
                </p>
              </div>
              <div className="mt-3">
                <Select value={system.status} onValueChange={onStatusChange}>
                  <SelectTrigger id="cycle-status" aria-label="Chọn trạng thái chu kỳ" className="border-app-line hover:border-app-line-strong transition-colors duration-200">
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
          </div>

          {/* Repeat Tactics List V2 */}
          <div className="rounded-xl border border-app-line bg-app-surface/40 p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-app-ink-muted">
                  Thứ tự việc lặp lại (Tactics)
                </p>
                <p className="mt-1.5 text-sm text-app-ink-soft">
                  Việc cốt lõi được ưu tiên trong điểm tuần. Việc tùy chọn là phần thêm khi bạn còn sức.
                </p>
              </div>
              <Badge variant="outline" className="border-app-line bg-app-bg text-app-ink font-bold px-3 py-1 shadow-sm rounded-full">
                {system.leadIndicators.length} việc
              </Badge>
            </div>
            <div className="mt-5 space-y-4">
              {system.leadIndicators.map((indicator, index) => {
                const isOptional = indicator.type === "optional";
                return (
                  <div
                    key={indicator.id || indicator.name}
                    className={`grid gap-4 rounded-xl border p-5 md:grid-cols-[minmax(0,1fr)_150px_140px] items-center hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 ${
                      isOptional
                        ? "border-amber-200 bg-amber-50/30 dark:border-amber-950/20 dark:bg-amber-950/10"
                        : "border-emerald-200 bg-emerald-50/30 dark:border-emerald-950/20 dark:bg-emerald-950/10"
                    }`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <p className="font-bold text-app-ink text-base">{indicator.name}</p>
                        <Badge
                          variant="outline"
                          className={
                            isOptional
                              ? "border-amber-300 bg-amber-50/80 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400 font-bold px-2.5 py-0.5 rounded-full text-xs shadow-sm"
                              : "border-emerald-300 bg-emerald-50/80 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 font-bold px-2.5 py-0.5 rounded-full text-xs shadow-sm"
                          }
                        >
                          {isOptional ? "Tùy chọn" : "Cốt lõi"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-app-ink-muted">
                        Mục tiêu: <span className="text-app-ink font-bold">{indicator.target || "1"}</span> {indicator.unit || "lần/tuần"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`tactic-priority-${index}`} className="text-xs font-bold text-app-ink-soft">Ưu tiên</Label>
                      <Select
                        value={String(indicator.priority ?? index + 1)}
                        onValueChange={(value) => onTacticPriorityChange(indicator.id, value)}
                      >
                        <SelectTrigger
                          id={`tactic-priority-${index}`}
                          aria-label={`Chọn độ ưu tiên cho tactic ${indicator.name}`}
                          className="bg-app-surface border-app-line hover:border-app-line-strong transition-colors duration-200"
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
                      <Label htmlFor={`tactic-type-${index}`} className="text-xs font-bold text-app-ink-soft">Loại việc</Label>
                      <Select
                        value={indicator.type === "optional" ? "optional" : "core"}
                        onValueChange={(value) => onTacticTypeChange(indicator.id, value)}
                      >
                        <SelectTrigger id={`tactic-type-${index}`} aria-label={`Chọn loại tactic ${indicator.name}`} className="bg-app-surface border-app-line hover:border-app-line-strong transition-colors duration-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="core">Cốt lõi</SelectItem>
                          <SelectItem value="optional">Tùy chọn</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cycle Info Cards V2 */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-indigo-200/50 bg-gradient-to-br from-indigo-500/5 to-transparent p-5 hover:shadow-md transition-all duration-300 flex items-start gap-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400">
                <PlayCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">Bắt đầu</p>
                <p className="mt-1 font-serif text-2xl font-bold text-app-ink tracking-tight">{formatCalendarDate(system.startDate)}</p>
              </div>
            </div>
            <div className="rounded-xl border border-emerald-200/50 bg-gradient-to-br from-emerald-500/5 to-transparent p-5 hover:shadow-md transition-all duration-300 flex items-start gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">Kết thúc</p>
                <p className="mt-1 font-serif text-2xl font-bold text-app-ink tracking-tight">{formatCalendarDate(system.endDate)}</p>
              </div>
            </div>
            <div className="rounded-xl border border-amber-200/50 bg-gradient-to-br from-amber-500/5 to-transparent p-5 hover:shadow-md transition-all duration-300 flex items-start gap-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400">
                <RotateCcw className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-600 dark:text-amber-400">Quay lại nhịp</p>
                <p className="mt-1 font-serif text-2xl font-bold text-app-ink tracking-tight">{system.reentryCount ?? 0} <span className="text-sm font-sans font-medium text-app-ink-soft">lần</span></p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
