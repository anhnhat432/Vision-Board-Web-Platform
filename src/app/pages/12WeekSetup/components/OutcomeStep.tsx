import type { PendingSMARTGoal } from "@/lib/smart-goal";
import type {
  AdaptiveTemplateRecommendation,
  AdaptiveTemplateSupport,
  TwelveWeekTemplateDefinition,
} from "@/app/utils/twelve-week-premium";
import {
  TWELVE_WEEK_TEMPLATE_CATALOG,
  getPlanLabel,
  planSatisfiesRequirement,
} from "@/app/utils/twelve-week-premium";
import type { PricingPlanCode } from "@/app/utils/storage";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";
import { GOAL_TYPES } from "../constants";
import { buildPlanRationaleReasons, getPlanLoadLabel } from "../helpers";
import type { PendingFeasibilityResult, TwelveWeekSetupDraft } from "../types";

interface OutcomeStepProps {
  feasibility: PendingFeasibilityResult;
  draft: TwelveWeekSetupDraft;
  currentPlan: PricingPlanCode;
  smartGoal: PendingSMARTGoal;
  selectedTemplate: TwelveWeekTemplateDefinition | null;
  recommendedTemplate: TwelveWeekTemplateDefinition | null;
  adaptiveTemplateRecommendation: AdaptiveTemplateRecommendation | null;
  recommendedTemplateSupport: AdaptiveTemplateSupport | null;
  onChange: <K extends keyof TwelveWeekSetupDraft>(key: K, value: TwelveWeekSetupDraft[K]) => void;
  onTemplateSelect: (template: TwelveWeekTemplateDefinition) => void;
  onTemplatePersonalizationChange: <K extends "dailyTimeBudget" | "personalConstraint">(
    key: K,
    value: TwelveWeekSetupDraft[K],
  ) => void;
  onPreferredDayToggle: (dayIndex: number) => void;
}

export function OutcomeStep({
  feasibility,
  draft,
  currentPlan,
  smartGoal,
  selectedTemplate,
  recommendedTemplate,
  adaptiveTemplateRecommendation,
  recommendedTemplateSupport,
  onChange,
  onTemplateSelect,
  onTemplatePersonalizationChange,
  onPreferredDayToggle,
}: OutcomeStepProps) {
  const planRationaleReasons = buildPlanRationaleReasons(feasibility);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="space-y-4">
        {planRationaleReasons.length > 0 && (
          <div className="rounded-[24px] border border-violet-200 bg-violet-50/72 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
                Vì sao kế hoạch này được đề xuất
              </p>
              <span className="text-xs text-violet-700/82">
                Dựa trên kết quả kiểm tra tính khả thi
              </span>
            </div>
            <ul className="mt-3 grid gap-2 md:grid-cols-2">
              {planRationaleReasons.map((reason) => (
                <li
                  key={reason.id}
                  className="rounded-[18px] border border-violet-200 bg-white/82 p-3"
                >
                  <p className="text-sm font-semibold text-slate-950">{reason.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{reason.detail}</p>
                </li>
              ))}
            </ul>
            {feasibility.smartGoalQualityNote && (
              <div className="mt-3 rounded-[18px] border border-amber-200 bg-amber-50/82 px-4 py-3">
                <p className="text-sm leading-6 text-amber-800">{feasibility.smartGoalQualityNote}</p>
              </div>
            )}
          </div>
        )}

        {(feasibility.bottleneck || feasibility.firstWeekGuidance || feasibility.scopeRecommendation) && (
          <div className="rounded-[24px] border border-amber-200 bg-amber-50/86 p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Gợi ý từ bước kiểm tra</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="rounded-[18px] border border-amber-200 bg-white/76 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Cần chú ý</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {feasibility.bottleneck?.label ?? "Chưa có"}
                </p>
                {feasibility.bottleneck?.action && (
                  <p className="mt-2 text-xs leading-5 text-slate-600">{feasibility.bottleneck.action}</p>
                )}
              </div>
              <div className="rounded-[18px] border border-amber-200 bg-white/76 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Tuần 1</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">
                  {feasibility.firstWeekGuidance ?? "Giữ tuần đầu vừa sức để tạo nhịp."}
                </p>
              </div>
              <div className="rounded-[18px] border border-amber-200 bg-white/76 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Mức tải</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{getPlanLoadLabel(feasibility.planLoad)}</p>
                <p className="mt-2 text-xs leading-5 text-slate-600">
                  {feasibility.scopeRecommendation ?? "Giữ 2-3 việc lặp lại và một buổi nhìn lại cố định."}
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="space-y-4 rounded-[24px] border border-white/70 bg-white/72 p-4 sm:p-5">
          <div>
            <p className="text-sm font-semibold text-slate-900">Chốt phần bắt buộc trước</p>
            <p className="mt-1 hidden text-sm leading-6 text-slate-500 sm:block">
              Ba mục này là đủ để đi tiếp. Khung gợi ý phía dưới chỉ dùng để thiết lập nhanh hơn, không phải việc bắt
              buộc phải chọn.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-type">Loại mục tiêu</Label>
            <Select value={draft.goalType} onValueChange={(value) => onChange("goalType", value)}>
              <SelectTrigger id="goal-type" aria-label="Chọn loại mục tiêu">
                <SelectValue placeholder="Chọn loại mục tiêu" />
              </SelectTrigger>
              <SelectContent>
                {GOAL_TYPES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vision-12-week">Tầm nhìn 12 tuần</Label>
            <Textarea
              id="vision-12-week"
              rows={3}
              value={draft.vision12Week}
              onChange={(event) => onChange("vision12Week", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="week-12-outcome">Kết quả muốn chạm tới ở tuần 12</Label>
            <Textarea
              id="week-12-outcome"
              rows={2}
              value={draft.week12Outcome}
              onChange={(event) => onChange("week12Outcome", event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3 rounded-[24px] border border-white/70 bg-white/72 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Bắt đầu nhanh bằng khung gợi ý</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Thay vì tìm một khung mẫu đúng chủ đề, bạn chỉ cần chọn kiểu vận hành phù hợp. Sau đó vẫn sửa lại toàn
                bộ cho sát mục tiêu của mình.
              </p>
            </div>
            <Badge variant="outline" className="border-slate-300 bg-white text-slate-700">
              Gói {getPlanLabel(currentPlan)}
            </Badge>
          </div>
          {recommendedTemplate && adaptiveTemplateRecommendation && (
            <div className="rounded-[24px] border border-sky-200 gradient-sky p-4 shadow-[0_18px_40px_-34px_rgba(37,99,235,0.18)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                    Gợi ý cho mục tiêu này
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{recommendedTemplate.name}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{adaptiveTemplateRecommendation.reason}</p>
                </div>
                <Badge variant="outline" className="border-sky-200 bg-white text-sky-800">
                  {recommendedTemplate.requiredPlan ? getPlanLabel(recommendedTemplate.requiredPlan) : "Miễn phí"}
                </Badge>
              </div>
              <Button
                className="mt-4"
                variant={selectedTemplate?.id === recommendedTemplate.id ? "outline" : "default"}
                onClick={() => onTemplateSelect(recommendedTemplate)}
              >
                {selectedTemplate?.id === recommendedTemplate.id ? "Đang dùng khung gợi ý" : "Dùng khung gợi ý này"}
              </Button>
              {recommendedTemplateSupport && (
                <details className="mt-4 rounded-[20px] border border-sky-200 bg-white/72 px-4 py-3">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
                    Xem gợi ý tuần 1 và nhịp giữ
                  </summary>
                  <div className="mt-3 grid gap-3">
                    <div className="rounded-[20px] border border-sky-200 bg-white/86 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                        Tuần 1 nên thắng ở đâu
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">
                        {recommendedTemplateSupport.week1Headline}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{recommendedTemplateSupport.week1Support}</p>
                    </div>
                    <div className="rounded-[20px] border border-sky-200 bg-white/86 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">Nhịp nên giữ</p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {recommendedTemplateSupport.week1CadenceHint}
                      </p>
                    </div>
                  </div>
                </details>
              )}
            </div>
          )}
          <details className="rounded-[24px] border border-dashed border-slate-200 bg-white/66 p-4">
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
              Xem tất cả khung mẫu
            </summary>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {TWELVE_WEEK_TEMPLATE_CATALOG.map((template) => {
                const isLocked = !planSatisfiesRequirement(currentPlan, template.requiredPlan);
                const isSelected = selectedTemplate?.id === template.id;

                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => onTemplateSelect(template)}
                    className={`rounded-[24px] border p-4 text-left transition-all ${
                      isSelected
                        ? "border-slate-900 bg-slate-900 text-white shadow-[0_22px_50px_-32px_rgba(15,23,42,0.48)]"
                        : isLocked
                          ? "border-violet-200 bg-violet-50/86 hover:border-violet-300"
                          : "border-white/70 bg-white/84 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={`font-semibold ${isSelected ? "text-white" : "text-slate-950"}`}>
                            {template.name}
                          </p>
                          <Badge
                            variant={template.requiredPlan ? "default" : "outline"}
                            className={
                              isSelected
                                ? "border-white/15 bg-white/10 text-white hover:bg-white/10"
                                : template.requiredPlan
                                  ? "bg-violet-600 text-white hover:bg-violet-600"
                                  : "border-slate-300 bg-white text-slate-700"
                            }
                          >
                            {template.requiredPlan ? `Khung ${getPlanLabel(template.requiredPlan)}` : "Khung miễn phí"}
                          </Badge>
                        </div>
                        <p className={`mt-1 text-sm ${isSelected ? "text-white/74" : "text-slate-600"}`}>
                          {template.subtitle}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={isSelected ? "border-white/15 bg-white/10 text-white" : "border-slate-300 bg-white text-slate-700"}
                      >
                        {isSelected ? "Đang dùng" : isLocked ? "Đang khóa" : "Sẵn sàng"}
                      </Badge>
                    </div>
                    <p className={`mt-3 text-sm leading-7 ${isSelected ? "text-white/84" : "text-slate-600"}`}>
                      {template.description}
                    </p>
                    <div
                      className={`mt-3 rounded-[20px] border px-3 py-3 text-sm leading-6 ${
                        isSelected ? "border-white/12 bg-white/8 text-white/82" : "border-white/70 bg-white/72 text-slate-600"
                      }`}
                    >
                      <p
                        className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                          isSelected ? "text-white/54" : "text-slate-400"
                        }`}
                      >
                        Hợp khi
                      </p>
                      <p className="mt-2">{template.bestFor}</p>
                    </div>
                    <div
                      className={`mt-3 rounded-[20px] border px-3 py-3 text-sm leading-6 ${
                        isSelected ? "border-white/12 bg-white/8 text-white/82" : "border-white/70 bg-white/72 text-slate-600"
                      }`}
                    >
                      <p
                        className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                          isSelected ? "text-white/54" : "text-slate-400"
                        }`}
                      >
                        Tuần 1 sẽ có gì
                      </p>
                      <p className="mt-2">{template.firstWeekWin}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {template.idealFor.map((item) => (
                        <Badge
                          key={`${template.id}_${item}`}
                          variant="outline"
                          className={isSelected ? "border-white/15 bg-white/10 text-white" : "border-slate-200 bg-slate-50 text-slate-700"}
                        >
                          {item}
                        </Badge>
                      ))}
                      {template.tactics.slice(0, 2).map((tactic) => (
                        <Badge
                          key={`${template.id}_${tactic.name}`}
                          variant="outline"
                          className={isSelected ? "border-white/15 bg-white/10 text-white" : "border-slate-200 bg-slate-50 text-slate-700"}
                        >
                          {tactic.name}
                        </Badge>
                      ))}
                    </div>
                    {isLocked && (
                      <div className="mt-4 flex items-center justify-between border-t border-violet-200/60 pt-3">
                        <span className="text-xs font-semibold text-violet-700">
                          Cần gói Plus để dùng khung này
                        </span>
                        <span className="text-xs font-semibold text-violet-600">Mở khóa →</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </details>
        </div>

        {selectedTemplate && (
          <div className="space-y-4 rounded-[28px] border border-emerald-200 gradient-emerald p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                Cá nhân hóa khung
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Trả lời nhanh 3 câu để khung tự điều chỉnh số việc và nhịp phù hợp.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="daily-time-budget">Mỗi ngày bạn có thể dành bao lâu?</Label>
              <Select
                value={draft.dailyTimeBudget}
                onValueChange={(value) => onTemplatePersonalizationChange("dailyTimeBudget", value)}
              >
                <SelectTrigger id="daily-time-budget" aria-label="Chọn ngân sách thời gian mỗi ngày">
                  <SelectValue placeholder="Chọn thời lượng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30min">30 phút</SelectItem>
                  <SelectItem value="1h">1 giờ</SelectItem>
                  <SelectItem value="1.5h">1.5 giờ</SelectItem>
                  <SelectItem value="2h+">2+ giờ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Những ngày nào bạn muốn tập trung?</Label>
              <div className="flex flex-wrap gap-2">
                {(["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const).map((dayLabel, dayIndex) => {
                  const isActive = draft.preferredDays.includes(dayIndex);
                  return (
                    <button
                      key={dayLabel}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => onPreferredDayToggle(dayIndex)}
                      className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all ${
                        isActive
                          ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                          : "border-slate-300 bg-white text-slate-700 hover:border-emerald-400"
                      }`}
                    >
                      {dayLabel}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500">
                {draft.preferredDays.length === 0
                  ? "Chưa chọn — mặc định dàn đều cả tuần."
                  : `Đã chọn ${draft.preferredDays.length} ngày.`}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="personal-constraint">Trở ngại lớn nhất hiện tại?</Label>
              <Select
                value={draft.personalConstraint}
                onValueChange={(value) =>
                  onTemplatePersonalizationChange(
                    "personalConstraint",
                    value as TwelveWeekSetupDraft["personalConstraint"],
                  )
                }
              >
                <SelectTrigger id="personal-constraint" aria-label="Chọn trở ngại lớn nhất">
                  <SelectValue placeholder="Chọn trở ngại" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="time">Thiếu thời gian</SelectItem>
                  <SelectItem value="motivation">Khó giữ động lực</SelectItem>
                  <SelectItem value="consistency">Hay bị đứt nhịp</SelectItem>
                  <SelectItem value="complexity">Mục tiêu phức tạp, chưa biết bắt đầu</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                {draft.personalConstraint === "time" && "Kế hoạch sẽ ưu tiên giữ nhẹ và tập trung."}
                {draft.personalConstraint === "motivation" && "Kế hoạch sẽ ưu tiên thắng nhỏ sớm và giảm ma sát."}
                {draft.personalConstraint === "consistency" && "Kế hoạch sẽ ưu tiên nhịp đều thay vì tải cao."}
                {draft.personalConstraint === "complexity" && "Kế hoạch sẽ giúp tách lớp rõ hơn."}
                {!draft.personalConstraint && "Chọn trở ngại để kế hoạch điều chỉnh phù hợp hơn."}
              </p>
            </div>
          </div>
        )}
      </div>
      <div className="space-y-3">
        {selectedTemplate && (
          <div className="rounded-[22px] border border-white/70 bg-white/78 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Khung đang dùng</p>
                <p className="mt-2 text-base font-semibold text-slate-950">{selectedTemplate.name}</p>
                <p className="mt-1 text-sm text-slate-500">{selectedTemplate.subtitle}</p>
              </div>
              <Badge
                variant={selectedTemplate.requiredPlan ? "default" : "outline"}
                className={
                  selectedTemplate.requiredPlan
                    ? "bg-violet-600 text-white hover:bg-violet-600"
                    : "border-slate-300 bg-white text-slate-700"
                }
              >
                {selectedTemplate.requiredPlan ? getPlanLabel(selectedTemplate.requiredPlan) : "Miễn phí"}
              </Badge>
            </div>
          </div>
        )}
        <details className="rounded-[22px] border border-dashed border-slate-200 bg-white/72 p-4">
          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
            Xem mục tiêu đã viết
          </summary>
          <div className="mt-4 space-y-3">
            <div className="rounded-[18px] border border-white/70 bg-white/86 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Mục tiêu cụ thể</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">{smartGoal.specific}</p>
            </div>
            <div className="rounded-[18px] border border-white/70 bg-white/86 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Cách đo kết quả</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">{smartGoal.measurable}</p>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
