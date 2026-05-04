import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";

import type { GoalArchetype } from "@/lib/smart-goal";

import { GoalArchetypeExamples } from "@/app/components/GoalArchetypeExamples";
import {
  getArchetypeForIntent,
  getUserIntentId,
  hasActionableArchetypeHint,
} from "@/app/utils/user-intent";
import type { TacticType } from "@/app/utils/storage";
import type { AdaptiveTemplateSupport, TwelveWeekTemplateDefinition } from "@/app/utils/twelve-week-premium";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { formatScheduleDayLabels, validateLeadIndicatorDraft } from "../helpers";
import type { IndicatorPreviewGroup } from "../helpers";
import type { LeadIndicatorDraft, TwelveWeekSetupDraft } from "../types";

interface LeadIndicatorsStepProps {
  draft: TwelveWeekSetupDraft;
  coreCount: number;
  optionalCount: number;
  setupGuideSupport: AdaptiveTemplateSupport | null;
  setupGuideTemplate: TwelveWeekTemplateDefinition | null;
  selectedTemplate: TwelveWeekTemplateDefinition | null;
  weekOneTaskPreview: string[];
  weekOneTaskWarning: string | null;
  weekOneTaskGroups: IndicatorPreviewGroup[];
  onAddIndicator: () => void;
  onRemoveIndicator: (index: number) => void;
  onIndicatorChange: <K extends keyof LeadIndicatorDraft>(
    index: number,
    key: K,
    value: LeadIndicatorDraft[K],
  ) => void;
}

export function LeadIndicatorsStep({
  draft,
  coreCount,
  optionalCount,
  setupGuideSupport,
  setupGuideTemplate,
  selectedTemplate,
  weekOneTaskPreview,
  weekOneTaskWarning,
  weekOneTaskGroups,
  onAddIndicator,
  onRemoveIndicator,
  onIndicatorChange,
}: LeadIndicatorsStepProps) {
  const validationOptions = {
    tacticLoadPreference: draft.tacticLoadPreference,
    dailyTimeBudget: draft.dailyTimeBudget,
  };
  const indicatorWarnings = draft.leadIndicators.map((indicator) =>
    validateLeadIndicatorDraft(indicator, validationOptions).warnings,
  );
  // Read the stored onboarding intent once on mount. The component does not
  // mutate intent, only consumes it for the example panel; storage is the
  // single source of truth.
  const intentArchetype: GoalArchetype | null = useMemo(() => {
    const intent = getUserIntentId();
    if (!intent || !hasActionableArchetypeHint(intent)) return null;
    return getArchetypeForIntent(intent);
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 p-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Giữ 2-4 việc lặp lại cho cả chu kỳ</p>
            <p className="mt-1 text-sm text-slate-500">
              Việc chính được ưu tiên trong điểm tuần. Việc tùy chọn là phần thêm khi bạn còn sức.
            </p>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              Việc lặp lại là <strong>hành động bạn kiểm soát được</strong> — không phải kết quả cuối. Mỗi tuần, việc
              hôm nay sẽ được tạo từ các việc này.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={onAddIndicator} disabled={draft.leadIndicators.length >= 4}>
            Thêm việc
          </Button>
        </div>

        <details className="rounded-[24px] border border-sky-200 bg-sky-50/72 p-4">
          <summary className="cursor-pointer list-none text-sm font-semibold text-sky-900">
            Việc lặp lại là gì? Khác kết quả cuối thế nào?
          </summary>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200 bg-white/82 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Ví dụ tốt (kiểm soát được)</p>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-700">
                <li>• Viết draft 800 từ</li>
                <li>• Tập gym 45 phút</li>
                <li>• Gửi 5 email outreach</li>
                <li>• Học flashcard tiếng Anh 30 phút</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-white/82 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Ví dụ chưa hợp (kết quả cuối)</p>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-700">
                <li>• Tăng 100 followers</li>
                <li>• Giảm 5kg</li>
                <li>• Có job mới</li>
                <li>• Đạt IELTS 7.0</li>
              </ul>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Đây là kết quả cuối — đo ở chỉ số chính, không phải việc tuần.
              </p>
            </div>
          </div>
        </details>

        <GoalArchetypeExamples archetype={intentArchetype} variant="lead_indicator" />

        {draft.leadIndicators.map((indicator, index) => (
          <div
            key={indicator.id}
            className={`rounded-[24px] border p-5 ${
              indicator.type === "optional"
                ? "border-slate-200 bg-slate-50/72"
                : "border-emerald-200 bg-white/72 shadow-[0_14px_30px_-28px_rgba(16,185,129,0.32)]"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">Việc {index + 1}</p>
              <div className="flex items-center gap-2">
                <Badge variant={indicator.type === "optional" ? "outline" : "default"}>
                  {indicator.type === "optional" ? "Tùy chọn" : "Cốt lõi"}
                </Badge>
                {draft.leadIndicators.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveIndicator(index)}
                    aria-label={`Xóa việc ${index + 1}${indicator.name ? `: ${indicator.name}` : ""}`}
                  >
                    Xóa
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              <div className="space-y-2">
                <Label htmlFor={`tactic-name-${index}`}>Tên việc</Label>
                <Input
                  id={`tactic-name-${index}`}
                  value={indicator.name}
                  onChange={(event) => onIndicatorChange(index, "name", event.target.value)}
                  placeholder="Ví dụ: viết 3 bài, tập 2 buổi, gửi 5 outreach..."
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`tactic-type-${index}`}>Loại</Label>
                  <Select
                    value={indicator.type}
                    onValueChange={(value) => onIndicatorChange(index, "type", value as TacticType)}
                  >
                    <SelectTrigger id={`tactic-type-${index}`} aria-label={`Chọn loại cho việc ${index + 1}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="core">Cốt lõi</SelectItem>
                      <SelectItem value="optional">Tùy chọn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`tactic-target-${index}`}>Tần suất / tuần</Label>
                  <Input
                    id={`tactic-target-${index}`}
                    value={indicator.target}
                    onChange={(event) => onIndicatorChange(index, "target", event.target.value)}
                    placeholder="Ví dụ: 2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`tactic-unit-${index}`}>Đơn vị</Label>
                  <Input
                    id={`tactic-unit-${index}`}
                    value={indicator.unit}
                    onChange={(event) => onIndicatorChange(index, "unit", event.target.value)}
                    placeholder="buổi, bài, lần..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`tactic-cadence-${index}`}>Nhịp</Label>
                  <Select
                    value={indicator.cadence}
                    onValueChange={(value) =>
                      onIndicatorChange(index, "cadence", value as LeadIndicatorDraft["cadence"])
                    }
                  >
                    <SelectTrigger id={`tactic-cadence-${index}`} aria-label={`Chọn nhịp cho việc ${index + 1}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spread">Trải đều</SelectItem>
                      <SelectItem value="frontload">Đầu tuần</SelectItem>
                      <SelectItem value="backload">Cuối tuần</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            {indicatorWarnings[index]?.length > 0 && (
              <ul
                className="mt-3 space-y-1 rounded-2xl border border-amber-200 bg-amber-50/82 px-3 py-2 text-xs leading-5 text-amber-800"
                aria-label={`Cảnh báo cho việc ${index + 1}`}
              >
                {indicatorWarnings[index].map((warning) => (
                  <li key={warning}>• {warning}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-4 rounded-[28px] border border-white/70 bg-white/72 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Xem trước tuần 1</p>
        <div className="rounded-[22px] border border-white/70 bg-white/78 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Cốt lõi / Tùy chọn</p>
          <p className="mt-2 text-sm text-slate-600">
            {coreCount} cốt lõi • {optionalCount} tùy chọn
          </p>
        </div>
        {setupGuideSupport && setupGuideTemplate && (
          <div className="rounded-[22px] border border-slate-900 bg-slate-950 p-4 text-white">
            <p className="text-xs uppercase tracking-[0.16em] text-white/54">
              {selectedTemplate ? "Tuần 1 theo khung đang dùng" : "Nếu đi theo khung gợi ý này"}
            </p>
            <p className="mt-2 text-base font-semibold">{setupGuideSupport.week1Headline}</p>
            <p className="mt-2 text-sm leading-7 text-white/78">{setupGuideSupport.week1Support}</p>
            <p className="mt-3 rounded-2xl border border-white/12 bg-white/8 px-3 py-3 text-sm text-white/74">
              {setupGuideSupport.week1CadenceHint}
            </p>
          </div>
        )}
        <p className="text-xs leading-5 text-slate-500">
          Từ mỗi việc lặp lại bên trên, việc hôm nay sẽ được tạo vào các ngày sau:
        </p>
        <div className="space-y-3">
          {weekOneTaskGroups.length === 0 ? (
            <p className="text-sm text-slate-500">Thêm việc để thấy tuần đầu tiên sẽ trông như thế nào.</p>
          ) : (
            weekOneTaskGroups.map((group) => (
              <div
                key={group.id}
                className="rounded-2xl border border-white/70 bg-slate-50/80 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{group.name}</p>
                  <Badge variant={group.type === "optional" ? "outline" : "default"} className="text-xs">
                    {group.type === "optional" ? "Tùy chọn" : "Cốt lõi"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {group.taskTitles.length} việc / tuần • Lịch: {formatScheduleDayLabels(group.scheduleDays)}
                </p>
                {group.taskTitles.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-600">
                    {group.taskTitles.map((title) => (
                      <li key={title}>→ {title}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}
        </div>
        {weekOneTaskWarning ? (
          <p
            role="status"
            className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-amber-700"
          >
            <AlertTriangle className="mt-[1px] h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              <span className="font-semibold">Cảnh báo:</span> {weekOneTaskWarning}
            </span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
