import { useState } from "react";
import { ChevronDown, Crown } from "lucide-react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import {
  getPlanLabel,
  type SuggestedNextWeekPlan,
  type WeeklyReviewPremiumInsight,
} from "../../utils/twelve-week-premium";
import type { PricingPlanCode } from "../../utils/storage-types";
import { getWorkloadDecisionLabel } from "../../utils/twelve-week-system-ui";

interface TwelveWeekPremiumInsightSectionProps {
  currentPlanCode: PricingPlanCode;
  hasPremiumInsights: boolean;
  premiumInsight: WeeklyReviewPremiumInsight;
  suggestedNextWeekPlan: SuggestedNextWeekPlan;
  onApplySuggestedPlan: () => void;
  onOpenPremiumInsights: () => void;
}

export function TwelveWeekPremiumInsightSection({
  currentPlanCode,
  hasPremiumInsights,
  premiumInsight,
  suggestedNextWeekPlan,
  onApplySuggestedPlan,
  onOpenPremiumInsights,
}: TwelveWeekPremiumInsightSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={`rounded-[var(--r-control)] border shadow-sm ${
        hasPremiumInsights ? "border-sky-200 bg-sky-50" : "border-violet-200 bg-violet-50"
      }`}
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left motion-safe:transition-colors hover:bg-white/50"
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Phân tích ôn lại Plus
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-950">{premiumInsight.headline}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge
              variant="outline"
              className={
                hasPremiumInsights
                  ? "border-sky-200 bg-white/90 text-sky-800"
                  : "border-violet-200 bg-white/90 text-violet-800"
              }
            >
              {premiumInsight.badgeLabel}
            </Badge>
            <ChevronDown
              className={`h-4 w-4 text-slate-500 motion-safe:transition-transform ${isOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-t border-white/70 pt-4">
          <div>
            <p className="text-sm leading-7 text-slate-600">{premiumInsight.summary}</p>
          </div>
          <Badge variant="outline" className="border-slate-300 bg-white text-slate-700">
            {getPlanLabel(currentPlanCode)}
          </Badge>
        </div>

        {hasPremiumInsights ? (
          <div className="mt-4 stack-tight">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[var(--r-control)] border border-sky-100 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Gợi ý chỉnh tải</p>
                <p className="mt-2 text-sm leading-7 text-slate-800">{premiumInsight.recommendedAdjustment}</p>
              </div>
              <div className="rounded-[var(--r-control)] border border-sky-100 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Gợi ý ngắn</p>
                <p className="mt-2 text-sm leading-7 text-slate-800">{premiumInsight.coachNote}</p>
              </div>
            </div>
            <div className="rounded-[var(--r-control)] border border-sky-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Kế hoạch gợi ý cho tuần sau
                  </p>
                  <p className="mt-2 text-base font-semibold leading-7 text-slate-950">{suggestedNextWeekPlan.focus}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{suggestedNextWeekPlan.rationale}</p>
                </div>
                <Badge className="bg-sky-700 text-white hover:bg-sky-700">
                  {getWorkloadDecisionLabel(suggestedNextWeekPlan.workloadDecision)}
                </Badge>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-[var(--r-control)] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Giữ chắc</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {suggestedNextWeekPlan.protectTactics.map((item) => (
                      <Badge key={item} variant="outline" className="border-slate-200 bg-white text-slate-700">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="rounded-[var(--r-control)] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {suggestedNextWeekPlan.secondaryTrackLabel}
                  </p>
                  <div className="mt-2 stack-tight">
                    {suggestedNextWeekPlan.secondaryTrackItems.map((item) => (
                      <p key={item} className="text-sm leading-6 text-slate-700">
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Bước đầu tuần nên làm: {suggestedNextWeekPlan.firstMove}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button className="w-full sm:w-auto" onClick={onApplySuggestedPlan}>
                  Dùng gợi ý này cho tuần sau
                </Button>
                <p className="text-sm text-slate-500">Bạn vẫn có thể sửa lại trước khi chốt review.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 stack-tight">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-control)] border border-violet-100 bg-white px-4 py-3">
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-[var(--r-pill)] ${
                    premiumInsight.status === "strong"
                      ? "bg-emerald-500"
                      : premiumInsight.status === "at_risk"
                        ? "bg-amber-400"
                        : "bg-amber-400"
                  }`}
                />
                <span className="text-sm font-semibold text-slate-800">Đã đọc được nhịp tuần này</span>
              </div>
              <Badge
                variant="outline"
                className={
                  premiumInsight.status === "strong"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : premiumInsight.status === "at_risk"
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                }
              >
                {premiumInsight.badgeLabel}
              </Badge>
            </div>
            <div className="relative overflow-hidden rounded-[var(--r-control)] border border-violet-200 bg-white p-4">
              <div className="pointer-events-none select-none blur-[3px] opacity-60">
                <p className="text-sm font-semibold text-slate-900">{premiumInsight.headline}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 line-clamp-2">{premiumInsight.summary}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Gợi ý chỉnh tải: {premiumInsight.recommendedAdjustment}
                </p>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[var(--r-control)] bg-white/50">
                <Crown className="h-5 w-5 text-violet-500" />
                <p className="mt-1 text-xs font-semibold text-violet-700">Chỉ dành cho Plus</p>
              </div>
            </div>
            <div className="rounded-[var(--r-control)] border border-violet-200/70 bg-white p-4">
              <p className="text-sm font-semibold text-slate-950">
                Mở Plus để đọc phân tích đầy đủ và ra ngay kế hoạch tuần sau đủ gọn để làm.
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Plus chốt luôn ưu tiên tuần sau, mức tải nên giữ và phần nào nên buông bớt - không chỉ là phân tích để
                đọc.
              </p>
              <Button className="mt-4 w-full sm:w-auto" onClick={onOpenPremiumInsights}>
                Mở ôn lại Plus ngay
              </Button>
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
