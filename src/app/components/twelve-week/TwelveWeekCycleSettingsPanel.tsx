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
  return (
    <Card
      data-tour-id="system-settings-panel"
      interactive={false}
      className="border-0 bg-[linear-gradient(180deg,_rgba(238,242,255,0.95)_0%,_rgba(224,231,255,0.84)_100%)] shadow-[0_30px_70px_-40px_rgba(99,102,241,0.22)]"
    >
      <CardHeader>
        <CardTitle className="text-slate-950">Cài đặt chu kỳ</CardTitle>
        <CardDescription className="text-slate-700">
          Chỉnh nhịp review, mức tải và thứ tự tactic để hệ thống này hợp với cách bạn làm thật ngoài đời.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-[26px] border border-slate-900/10 bg-[linear-gradient(135deg,_rgba(15,23,42,0.96)_0%,_rgba(49,46,129,0.9)_100%)] p-5 text-white shadow-[0_28px_60px_-38px_rgba(15,23,42,0.55)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/56">
                Một lần chỉnh cho cả chu kỳ
              </p>
              <p className="mt-2 text-lg font-semibold">
                Giữ nhịp tuần, thứ tự tactic và trạng thái chu kỳ trong cùng một nơi.
              </p>
            </div>
            <Badge variant="outline" className="border-white/15 bg-white/10 text-white">
              {STATUS_OPTIONS.find((option) => option.value === system.status)?.label ?? system.status}
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-[24px] border border-white/55 bg-white/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Ngày review</p>
              <p className="mt-1 text-sm text-slate-600">Ngày bạn muốn khóa tuần và tự đánh giá lại nhịp.</p>
            </div>
            <Select value={system.reviewDay} onValueChange={onReviewDayChange}>
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

          <div className="space-y-3 rounded-[24px] border border-white/55 bg-white/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Giờ nhắc</p>
              <p className="mt-1 text-sm text-slate-600">Khung giờ local để nhắc check-in và review.</p>
            </div>
            <Input
              id="reminder-time"
              value={system.dailyReminderTime || "19:00"}
              onChange={(event) => onReminderTimeChange(event.target.value)}
              type="time"
              aria-label="Chọn giờ nhắc local"
            />
          </div>

          <div className="space-y-3 rounded-[24px] border border-white/55 bg-white/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Nhịp tuần</p>
              <p className="mt-1 text-sm text-slate-600">
                Cho hệ thống biết tuần này bạn muốn cân bằng, nhẹ hơn hay đẩy mạnh.
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

          <div className="space-y-3 rounded-[24px] border border-white/55 bg-white/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Trạng thái</p>
              <p className="mt-1 text-sm text-slate-600">
                Giúp Dashboard và màn Hôm nay biết chu kỳ này đang chạy hay đã kết thúc.
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

        <div className="rounded-[26px] border border-white/55 bg-white/62 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Ưu tiên tactic</p>
              <p className="mt-1 text-sm text-slate-600">
                Tactic cốt lõi được ưu tiên trong điểm tuần. Tactic tùy chọn là phần thêm khi bạn còn sức.
              </p>
            </div>
            <Badge variant="outline" className="border-slate-300 bg-white text-slate-700">
              {system.leadIndicators.length} tactic
            </Badge>
          </div>
          <div className="mt-4 space-y-4">
            {system.leadIndicators.map((indicator, index) => (
              <div
                key={indicator.id || indicator.name}
                className={`grid gap-4 rounded-[24px] border p-5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.26)] md:grid-cols-[minmax(0,1fr)_150px_140px] ${
                  indicator.type === "optional"
                    ? "border-amber-200/70 bg-amber-50/82"
                    : "border-emerald-200/70 bg-white/88"
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
                    <SelectTrigger
                      id={`tactic-type-${index}`}
                      aria-label={`Chọn loại tactic ${indicator.name}`}
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
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[24px] border border-slate-900/10 bg-[linear-gradient(135deg,_rgba(15,23,42,0.96)_0%,_rgba(30,41,59,0.92)_100%)] p-5 text-white shadow-[0_22px_45px_-32px_rgba(15,23,42,0.5)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/56">Bắt đầu</p>
            <p className="mt-2 text-xl font-bold text-white">{formatCalendarDate(system.startDate)}</p>
          </div>
          <div className="rounded-[24px] border border-sky-200 bg-sky-50/92 p-5 shadow-[0_22px_45px_-32px_rgba(37,99,235,0.18)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Kết thúc</p>
            <p className="mt-2 text-xl font-bold text-slate-950">{formatCalendarDate(system.endDate)}</p>
          </div>
          <div className="rounded-[24px] border border-amber-200 bg-amber-50/92 p-5 shadow-[0_22px_45px_-32px_rgba(217,119,6,0.16)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Re-entry đã dùng</p>
            <p className="mt-2 text-xl font-bold text-slate-950">{system.reentryCount ?? 0} lần</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
