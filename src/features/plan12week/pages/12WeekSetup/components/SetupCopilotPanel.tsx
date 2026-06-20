import { Award, Check, Compass, Lightbulb, ShieldAlert, Sparkles, Target, X } from "lucide-react";
import { cn } from "@/app/components/ui/utils";
import { getLifeAreaLabel } from "@/app/utils/storage";
import type { AdaptiveTemplateSupport, TwelveWeekTemplateDefinition } from "@/app/utils/twelve-week-premium";
import type { PendingSMARTGoal } from "@/lib/smart-goal";
import type { PendingFeasibilityResult } from "../types";

interface SetupCopilotPanelProps {
  smartGoal: PendingSMARTGoal;
  feasibility: PendingFeasibilityResult;
  focusArea: string;
  setupGuideSupport: AdaptiveTemplateSupport | null;
  setupGuideTemplate: TwelveWeekTemplateDefinition | null;
  className?: string;
}

export function SetupCopilotPanel({
  smartGoal,
  feasibility,
  focusArea,
  setupGuideSupport,
  setupGuideTemplate,
  className,
}: SetupCopilotPanelProps) {
  return (
    <section
      className={cn(
        "flex flex-col rounded-2xl border border-app-line bg-app-surface p-5 sm:p-6 space-y-6 select-none shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-app-line pb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-app-accent-soft text-app-accent">
          <Sparkles className="h-5 w-5 animate-pulse" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-app-ink">Trợ lý thiết lập 12 tuần</h3>
          <p className="text-[10px] text-app-ink-muted uppercase tracking-wider font-semibold">Setup AI Copilot</p>
        </div>
      </div>

      {/* 1. MỤC TIÊU SMART GỐC */}
      <section className="space-y-3" aria-labelledby="copilot-goal-title">
        <h4
          id="copilot-goal-title"
          className="text-xs font-bold uppercase tracking-wider text-app-ink-muted flex items-center gap-1.5"
        >
          <Target className="h-4 w-4 text-app-accent" />
          <span>Mục tiêu SMART của bạn</span>
        </h4>
        <div className="rounded-xl border border-app-line bg-app-surface p-4 space-y-3 shadow-sm">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-app-ink-muted">Mục tiêu cụ thể</p>
            <p className="mt-1 text-xs font-medium text-app-ink leading-relaxed">{smartGoal.specific}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-app-ink-muted">Đo lường kết quả</p>
            <p className="mt-1 text-xs text-app-ink-soft leading-relaxed">{smartGoal.measurable}</p>
          </div>
          <div className="flex items-center justify-between border-t border-app-line/60 pt-2.5 text-[10px] text-app-ink-muted">
            <span>
              Lĩnh vực: <strong className="text-app-ink font-semibold">{getLifeAreaLabel(focusArea)}</strong>
            </span>
          </div>
        </div>
      </section>

      {/* 2. BÁO CÁO KHẢ THI (FEASIBILITY REPORT) */}
      <section className="space-y-3" aria-labelledby="copilot-feasibility-title">
        <h4
          id="copilot-feasibility-title"
          className="text-xs font-bold uppercase tracking-wider text-app-ink-muted flex items-center gap-1.5"
        >
          <Compass className="h-4 w-4 text-app-accent" />
          <span>Đánh giá tính khả thi</span>
        </h4>
        <div className="rounded-xl border border-app-line bg-app-surface p-4 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-app-ink-soft">Điểm sẵn sàng:</span>
            <span className="rounded-full bg-app-accent-soft px-2.5 py-1 text-xs font-bold text-app-accent">
              {feasibility.adjustedScore}/20
            </span>
          </div>

          {feasibility.bottleneck && (
            <div className="rounded-lg border border-app-status-warning/20 bg-app-status-warning/5 p-3 flex gap-2">
              <ShieldAlert className="h-4 w-4 text-app-status-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold text-app-status-warning uppercase tracking-wide">
                  Điểm cần chú ý (Bottleneck)
                </p>
                <p className="mt-0.5 text-xs text-app-ink-soft leading-relaxed">
                  {feasibility.bottleneck.label}
                </p>
              </div>
            </div>
          )}

          {feasibility.firstWeekGuidance && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-app-ink-muted">Lời khuyên tuần 1</p>
              <p className="mt-1 text-xs text-app-ink-soft leading-relaxed">{feasibility.firstWeekGuidance}</p>
            </div>
          )}

          {feasibility.smartGoalQualityNote && (
            <div className="border-t border-app-line/60 pt-2.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-app-ink-muted">Chẩn đoán SMART</p>
              <p className="mt-1 text-xs text-app-ink-soft leading-relaxed italic">
                "{feasibility.smartGoalQualityNote}"
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 3. GỢI Ý GIỮ NHỊP CHIẾN THẮNG (AI RECOMMENDATIONS) */}
      {setupGuideSupport && (
        <section className="space-y-3" aria-labelledby="copilot-guide-title">
          <h4
            id="copilot-guide-title"
            className="text-xs font-bold uppercase tracking-wider text-app-ink-muted flex items-center gap-1.5"
          >
            <Award className="h-4 w-4 text-app-accent" />
            <span>Đề xuất từ chuyên gia 12 tuần</span>
          </h4>
          <div className="rounded-xl border border-app-line bg-app-surface p-4 space-y-3.5 shadow-sm">
            {setupGuideTemplate && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-app-ink-muted">Khung mẫu đề xuất</p>
                <p className="mt-1 text-xs font-bold text-app-ink">{setupGuideTemplate.name}</p>
                <p className="mt-0.5 text-[11px] text-app-ink-soft leading-relaxed">{setupGuideTemplate.subtitle}</p>
              </div>
            )}

            <div className="border-t border-app-line/60 pt-3">
              <p className="text-[9px] font-bold uppercase tracking-wider text-app-ink-muted flex items-center gap-1">
                <Check className="h-3.5 w-3.5 text-app-accent" />
                <span>Chiến thắng Tuần 1</span>
              </p>
              <p className="mt-1.5 text-xs font-bold text-app-ink leading-snug">{setupGuideSupport.week1Headline}</p>
              <p className="mt-1 text-xs text-app-ink-soft leading-relaxed">{setupGuideSupport.week1Support}</p>
            </div>

            <div className="rounded-lg bg-app-bg border border-app-line/60 p-3 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-app-accent uppercase tracking-wide">
                <Lightbulb className="h-3.5 w-3.5" />
                <span>Nhịp độ hành động tối ưu</span>
              </div>
              <p className="text-app-ink-soft leading-relaxed">{setupGuideSupport.week1CadenceHint}</p>
            </div>
          </div>
        </section>
      )}

      {/* 4. CẨM NANG HÀNH ĐỘNG (GUIDEBOOK) */}
      <section className="space-y-3 border-t border-app-line/60 pt-4" aria-labelledby="copilot-handbook-title">
        <h4
          id="copilot-handbook-title"
          className="text-xs font-bold uppercase tracking-wider text-app-ink-muted flex items-center gap-1.5"
        >
          <Lightbulb className="h-4 w-4 text-app-accent" />
          <span>Cách đặt hành động tốt nhất</span>
        </h4>

        {/* So sánh trực quan */}
        <div className="rounded-xl border border-app-line bg-app-surface p-4 space-y-3.5 shadow-sm text-xs">
          <p className="text-[10px] text-app-ink-muted leading-relaxed">
            Đặt hành động lặp lại hằng tuần (Lead Indicators) là mấu chốt để thành công. Hãy tập trung chọn việc nhỏ bạn
            hoàn toàn kiểm soát được:
          </p>

          <div className="grid gap-2.5">
            <div className="rounded-lg border border-app-status-error/20 bg-app-status-error/5 p-3">
              <p className="font-bold text-app-status-error flex items-center gap-1 text-[11px] uppercase tracking-wide">
                <X className="h-3.5 w-3.5 shrink-0" />
                <span>Chỉ số Kết quả (Lag) - Tránh ghi</span>
              </p>
              <ul className="mt-1.5 space-y-1 text-app-ink-soft list-disc list-inside leading-snug">
                <li>Đạt mốc 100 người dùng</li>
                <li>Hoàn thiện hoàn toàn ứng dụng</li>
                <li>Giảm được 5kg cân nặng</li>
              </ul>
            </div>

            <div className="rounded-lg border border-app-accent/30 bg-app-accent-soft/20 p-3">
              <p className="font-bold text-app-accent flex items-center gap-1 text-[11px] uppercase tracking-wide">
                <Check className="h-3.5 w-3.5 shrink-0" />
                <span>Hành động Lặp lại (Lead) - Nên ghi</span>
              </p>
              <ul className="mt-1.5 space-y-1 text-app-ink-soft list-disc list-inside leading-snug">
                <li>Trình diễn sản phẩm cho 5 người / tuần</li>
                <li>Lập trình core tính năng 5 buổi / tuần</li>
                <li>Tập thể dục bền bỉ 3 buổi / tuần</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
