import { useState, type ReactNode } from "react";
import { LOAD_OPTIONS, REVIEW_DAYS, STATUS_OPTIONS } from "../../utils/twelve-week-system-ui";
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
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
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

function SettingsControlRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(180px,260px)] sm:items-center sm:p-5">
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-app-ink">{label}</p>
        <p className="mt-1 text-sm leading-relaxed text-app-ink-soft">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

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

      <div data-tour-id="system-settings-panel" className="min-w-0 space-y-5">
        <div className="divide-y divide-app-line rounded-control border border-app-line bg-app-surface">
          <SettingsControlRow label="Ngày review" description="Ngày bạn khóa tuần và tự đánh giá lại nhịp thực thi.">
            <Select value={system.reviewDay} onValueChange={handleReviewDayChange}>
              <SelectTrigger
                id="review-day"
                aria-label="Chọn ngày review"
                className="min-h-11 border-app-line text-base hover:border-app-line-strong sm:text-sm"
              >
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
          </SettingsControlRow>

          <SettingsControlRow label="Giờ nhắc" description="Khung giờ trên thiết bị để nhắc check-in và review.">
            <Input
              id="reminder-time"
              value={system.dailyReminderTime || "19:00"}
              onChange={(event) => onReminderTimeChange(event.target.value)}
              type="time"
              aria-label="Chọn giờ nhắc"
              className="min-h-11 border-app-line text-base hover:border-app-line-strong sm:text-sm"
            />
          </SettingsControlRow>

          <SettingsControlRow
            label="Nhịp tuần"
            description="Chọn tuần cân bằng, nhẹ hơn hoặc đẩy mạnh theo năng lực hiện tại."
          >
            <Select value={system.tacticLoadPreference || "balanced"} onValueChange={onLoadPreferenceChange}>
              <SelectTrigger
                id="week-load"
                aria-label="Chọn nhịp tuần"
                className="min-h-11 border-app-line text-base hover:border-app-line-strong sm:text-sm"
              >
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
          </SettingsControlRow>

          <SettingsControlRow
            label="Trạng thái chu kỳ"
            description="Cho các màn thực thi biết chu kỳ đang chạy, tạm dừng hay đã hoàn tất."
          >
            <Select value={system.status} onValueChange={onStatusChange}>
              <SelectTrigger
                id="cycle-status"
                aria-label="Chọn trạng thái chu kỳ"
                className="min-h-11 border-app-line text-base hover:border-app-line-strong sm:text-sm"
              >
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
          </SettingsControlRow>
        </div>

        <section aria-labelledby="tactic-order-heading" className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 id="tactic-order-heading" className="text-[15px] font-semibold text-app-ink">
                Thứ tự việc lặp lại
              </h3>
              <p className="mt-1 max-w-[65ch] text-sm leading-relaxed text-app-ink-soft">
                Việc cốt lõi được ưu tiên trong điểm tuần; việc tùy chọn chỉ thêm vào khi còn sức.
              </p>
            </div>
            <span className="rounded-full border border-app-line bg-app-bg px-3 py-1 text-xs font-semibold text-app-ink-soft">
              {system.leadIndicators.length} việc
            </span>
          </div>

          <div className="mt-4 divide-y divide-app-line rounded-control border border-app-line">
            {system.leadIndicators.length > 0 ? (
              system.leadIndicators.map((indicator, index) => {
                const isOptional = indicator.type === "optional";

                return (
                  <div
                    key={indicator.id || indicator.name}
                    className="grid min-w-0 gap-4 p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_140px_150px] md:items-end"
                  >
                    <div className="grid min-w-0 grid-cols-[32px_minmax(0,1fr)] gap-3">
                      <span
                        aria-hidden="true"
                        className={`flex h-8 w-8 items-center justify-center rounded-full font-mono text-xs font-bold ${
                          isOptional
                            ? "bg-app-status-warning/10 text-app-status-warning"
                            : "bg-app-accent-soft text-app-accent"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="break-words text-[15px] font-semibold text-app-ink">{indicator.name}</p>
                        <p className="mt-1 text-sm text-app-ink-soft">
                          Mục tiêu: {indicator.target || "1"} {indicator.unit || "lần/tuần"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`tactic-priority-${index}`} className="text-xs font-bold text-app-ink-soft">
                        Ưu tiên
                      </Label>
                      <Select
                        value={String(indicator.priority ?? index + 1)}
                        onValueChange={(value) => onTacticPriorityChange(indicator.id, value)}
                      >
                        <SelectTrigger
                          id={`tactic-priority-${index}`}
                          aria-label={`Chọn độ ưu tiên cho tactic ${indicator.name}`}
                          className="min-h-11 border-app-line bg-app-surface text-base hover:border-app-line-strong sm:text-sm"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from(
                            { length: system.leadIndicators.length },
                            (_, optionIndex) => optionIndex + 1,
                          ).map((priority) => (
                            <SelectItem key={priority} value={String(priority)}>
                              {priority}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`tactic-type-${index}`} className="text-xs font-bold text-app-ink-soft">
                        Loại việc
                      </Label>
                      <Select
                        value={isOptional ? "optional" : "core"}
                        onValueChange={(value) => onTacticTypeChange(indicator.id, value)}
                      >
                        <SelectTrigger
                          id={`tactic-type-${index}`}
                          aria-label={`Chọn loại tactic ${indicator.name}`}
                          className="min-h-11 border-app-line bg-app-surface text-base hover:border-app-line-strong sm:text-sm"
                        >
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
              })
            ) : (
              <p className="p-4 text-sm leading-relaxed text-app-ink-soft sm:p-5">
                Chưa có việc lặp lại. Thêm tactic trong setup để sắp xếp ưu tiên tại đây.
              </p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
