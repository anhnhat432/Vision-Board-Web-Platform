import { ArrowRight, Compass, ShieldCheck } from "lucide-react";

import type {
  NextWeekAdjustment,
  NextWeekConfidence,
  NextWeekRecommendation,
} from "@/features/plan12week/logic";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

interface TwelveWeekNextWeekRecommendationCardProps {
  recommendation: NextWeekRecommendation;
  /**
   * Optional callback when the user explicitly accepts the recommendation.
   * The card never auto-applies anything — caller decides what "apply" means.
   */
  onAcceptRecommendation?: () => void;
  /** Optional callback to navigate to the Today tab to keep momentum. */
  onOpenTodayTab?: () => void;
}

const ADJUSTMENT_BADGE_LABEL: Record<NextWeekAdjustment, string> = {
  lighter: "Nhẹ hơn",
  same: "Giữ nguyên",
  push: "Đẩy thêm",
  reset: "Restart nhẹ",
  reduce_scope: "Thu hẹp scope",
};

const ADJUSTMENT_ACCENT: Record<NextWeekAdjustment, string> = {
  lighter: "border-amber-200 bg-amber-50/85 text-amber-900",
  same: "border-sky-200 bg-sky-50/85 text-sky-900",
  push: "border-emerald-200 bg-emerald-50/85 text-emerald-900",
  reset: "border-violet-200 bg-violet-50/85 text-violet-900",
  reduce_scope: "border-orange-200 bg-orange-50/85 text-orange-900",
};

const CONFIDENCE_LABEL: Record<NextWeekConfidence, string> = {
  high: "Tin cậy cao",
  medium: "Tin cậy vừa",
  low: "Tin cậy thấp",
};

export function TwelveWeekNextWeekRecommendationCard({
  recommendation,
  onAcceptRecommendation,
  onOpenTodayTab,
}: TwelveWeekNextWeekRecommendationCardProps) {
  const accent = ADJUSTMENT_ACCENT[recommendation.recommendation];

  return (
    <div
      data-testid="next-week-recommendation"
      data-recommendation={recommendation.recommendation}
      data-confidence={recommendation.confidence}
      className={`rounded-xl border p-4 sm:p-5 ${accent}`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/82 text-slate-700">
          <Compass className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">
              Gợi ý cho tuần sau
            </p>
            <Badge variant="outline" className="border-white/60 bg-white/85">
              {ADJUSTMENT_BADGE_LABEL[recommendation.recommendation]}
            </Badge>
            <Badge variant="outline" className="border-white/60 bg-white/85">
              {CONFIDENCE_LABEL[recommendation.confidence]}
            </Badge>
          </div>
          <p
            data-testid="next-week-recommendation-headline"
            className="mt-2 text-base font-semibold leading-7 text-slate-950"
          >
            {recommendation.headline}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-700">{recommendation.body}</p>

          <div className="mt-3 rounded-lg border border-white/82 bg-white/82 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Khung ưu tiên tuần sau
            </p>
            <p
              data-testid="next-week-recommendation-priority"
              className="mt-1 text-sm leading-6 text-slate-700"
            >
              {recommendation.suggestedNextWeekPriority}
            </p>
          </div>

          <div
            data-testid="next-week-recommendation-control-note"
            className="mt-3 flex items-start gap-2 rounded-lg border border-white/60 bg-white/72 px-3 py-2 text-xs leading-5 text-slate-600"
          >
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
            <span>
              Bạn vẫn kiểm soát kế hoạch — đây chỉ là gợi ý dựa trên tuần này, không tự đổi
              plan cho bạn.
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {onAcceptRecommendation && (
              <Button
                size="sm"
                variant="outline"
                className="bg-white"
                onClick={onAcceptRecommendation}
              >
                <ArrowRight className="mr-1 h-3.5 w-3.5" />
                Áp dụng cho tuần sau
              </Button>
            )}
            {onOpenTodayTab && (
              <Button size="sm" variant="ghost" onClick={onOpenTodayTab}>
                Mở Today
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
