import { ChevronDown, Crown } from "lucide-react";
import { useState } from "react";
import type { PricingPlanCode } from "../../utils/storage-types";
import {
  getPlanLabel,
  type SuggestedNextWeekPlan,
  type WeeklyReviewPremiumInsight,
} from "../../utils/twelve-week-premium";
import { getWorkloadDecisionLabel } from "../../utils/twelve-week-system-ui";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";

interface TwelveWeekPremiumInsightSectionProps {
  currentPlanCode: PricingPlanCode;
  hasPremiumInsights: boolean;
  premiumInsight: WeeklyReviewPremiumInsight | null;
  suggestedNextWeekPlan: SuggestedNextWeekPlan | null;
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

  if (!premiumInsight) return null;

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={`rounded-card border ${
        hasPremiumInsights ? "border-app-warm-border/20 bg-app-warm-soft" : "border-app-line bg-app-bg"
      }`}
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left motion-safe:transition-colors hover:bg-app-surface/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">
              Phân tích ôn lại Plus
            </p>
            <p className="mt-1 break-words text-sm font-semibold leading-6 text-app-ink">{premiumInsight.headline}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <Badge
              variant="outline"
              className={
                hasPremiumInsights
                  ? "border-app-warm-border/20 bg-app-surface/90 text-app-warm"
                  : "border-app-line bg-app-surface/90 text-app-ink-soft"
              }
            >
              {premiumInsight.badgeLabel}
            </Badge>
            <ChevronDown
              className={`h-4 w-4 text-app-ink-muted motion-safe:transition-transform ${isOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-t border-white/70 pt-4">
          <div>
            <p className="text-sm leading-7 text-app-ink-soft">{premiumInsight.summary}</p>
          </div>
          <Badge variant="outline" className="border-app-line bg-app-surface text-app-ink-soft">
            {getPlanLabel(currentPlanCode)}
          </Badge>
        </div>

        {hasPremiumInsights ? (
          <div className="mt-4 stack-tight">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-app-line bg-app-surface p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-muted">Gợi ý chỉnh tải</p>
                <p className="mt-2 text-sm leading-7 text-app-ink">{premiumInsight.recommendedAdjustment}</p>
              </div>
              <div className="rounded-lg border border-app-line bg-app-surface p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-muted">Gợi ý ngắn</p>
                <p className="mt-2 text-sm leading-7 text-app-ink">{premiumInsight.coachNote}</p>
              </div>
            </div>
            <div className="rounded-lg border border-app-warm-border/20 bg-app-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-muted">
                    Kế hoạch gợi ý cho tuần sau
                  </p>
                  <p className="mt-2 text-base font-semibold leading-7 text-app-ink">{suggestedNextWeekPlan?.focus}</p>
                  <p className="mt-2 text-sm leading-7 text-app-ink-soft">{suggestedNextWeekPlan?.rationale}</p>
                </div>
                <Badge className="bg-app-warm text-white hover:bg-app-warm">
                  {getWorkloadDecisionLabel(suggestedNextWeekPlan?.workloadDecision ?? "keep same")}
                </Badge>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-app-line bg-app-bg p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-muted">Giữ chắc</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(suggestedNextWeekPlan?.protectTactics ?? []).map((item) => (
                      <Badge key={item} variant="outline" className="border-app-line bg-app-surface text-app-ink-soft">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-app-line bg-app-bg p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-muted">
                    {suggestedNextWeekPlan?.secondaryTrackLabel}
                  </p>
                  <div className="mt-2 stack-tight">
                    {(suggestedNextWeekPlan?.secondaryTrackItems ?? []).map((item) => (
                      <p key={item} className="text-sm leading-6 text-app-ink-soft">
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-app-ink-soft">
                Bước đầu tuần nên làm: {suggestedNextWeekPlan?.firstMove}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  className="w-full sm:w-auto bg-app-warm text-white hover:bg-app-warm/90"
                  onClick={onApplySuggestedPlan}
                >
                  Đưa gợi ý vào câu trả lời
                </Button>
                <p className="text-sm text-app-ink-muted">
                  Chỉ điền trước câu trả lời; kế hoạch chưa đổi cho đến bước xác nhận.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 stack-tight">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-app-line bg-app-surface px-4 py-3">
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    premiumInsight.status === "strong" ? "bg-app-warm" : "bg-app-warm"
                  }`}
                />
                <span className="text-sm font-semibold text-app-ink">Đã đọc được nhịp tuần này</span>
              </div>
              <Badge
                variant="outline"
                className={
                  premiumInsight.status === "strong"
                    ? "border-app-warm-border bg-app-warm-soft text-app-warm"
                    : "border-app-warm-border bg-app-warm-soft text-app-warm"
                }
              >
                {premiumInsight.badgeLabel}
              </Badge>
            </div>
            <div className="relative overflow-hidden rounded-lg border border-app-line bg-app-surface p-4">
              <div className="pointer-events-none select-none blur-[3px] opacity-60">
                <p className="text-sm font-semibold text-app-ink">{premiumInsight.headline}</p>
                <p className="mt-2 break-words text-sm leading-6 text-app-ink-soft">{premiumInsight.summary}</p>
                <p className="mt-2 text-xs text-app-ink-muted">
                  Gợi ý chỉnh tải: {premiumInsight.recommendedAdjustment}
                </p>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-app-surface/50">
                <Crown className="h-5 w-5 text-app-warm" />
                <p className="mt-1 text-xs font-semibold text-app-warm">Chỉ dành cho Plus</p>
              </div>
            </div>
            <div className="rounded-lg border border-app-line bg-app-surface p-4">
              <p className="text-sm font-semibold text-app-ink">
                Mở Plus để đọc phân tích đầy đủ và ra ngay kế hoạch tuần sau đủ gọn để làm.
              </p>
              <p className="mt-1 text-sm text-app-ink-soft">
                Plus chốt luôn ưu tiên tuần sau, mức tải nên giữ và phần nào nên buông bớt - không chỉ là phân tích để
                đọc.
              </p>
              <Button
                className="mt-4 w-full sm:w-auto bg-app-warm text-white hover:bg-app-warm/90"
                onClick={onOpenPremiumInsights}
              >
                Mở ôn lại Plus ngay
              </Button>
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
