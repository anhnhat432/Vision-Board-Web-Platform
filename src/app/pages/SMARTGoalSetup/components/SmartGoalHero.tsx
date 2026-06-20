import type { SmartGoalStarter } from "../../../utils/smart-goal-starters";
import { getLifeAreaLabel } from "../../../utils/storage";
import type { SMARTData } from "../types";

interface SmartGoalHeroProps {
  focusArea: string;
  smartData: SMARTData;
  currentStep: number;
  completedCount: number;
  totalSteps: number;
  progressPercentage: number;
  smartGoalStarter: SmartGoalStarter;
}

export function SmartGoalHero({
  focusArea,
  currentStep,
  completedCount,
  totalSteps,
  smartGoalStarter,
}: SmartGoalHeroProps) {
  const focusAreaLabel = getLifeAreaLabel(focusArea);
  const headerTitle =
    currentStep > 0
      ? `Đang rèn luyện mục tiêu cho ${focusAreaLabel}`
      : `Mục tiêu SMART đầu tiên cho ${focusAreaLabel}`;

  return (
    <section
      aria-labelledby="smart-goal-setup-title"
      className="rounded-[20px] border border-[rgba(23,21,15,0.08)] dark:border-app-line bg-white dark:bg-app-surface p-6 sm:p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-5"
      data-testid="smart-goal-hero-section"
    >
      <div className="min-w-0 space-y-2">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#0C5E3A]">Thiết lập mục tiêu</span>
        <h1
          id="smart-goal-setup-title"
          className="text-[clamp(22px,2.4vw,30px)] font-extrabold leading-[1.08] tracking-[-0.02em] text-[#17150F] dark:text-app-ink"
          style={{ fontFamily: "'Bricolage Grotesque', serif" }}
        >
          {headerTitle}
        </h1>
        <p className="text-[13px] leading-[1.5] text-[#7A6E5E]" data-testid="smart-goal-handoff-card">
          Lĩnh vực: <strong className="text-[#17150F] dark:text-app-ink font-semibold">{focusAreaLabel}</strong> · Đo lường gợi ý:{" "}
          <strong className="text-[#17150F] dark:text-app-ink font-semibold">{smartGoalStarter.metricName}</strong> · Lộ trình:{" "}
          <strong className="text-[#17150F] dark:text-app-ink font-semibold">{smartGoalStarter.targetWeeks} tuần</strong>.
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-center gap-1 bg-[#FAF8F3] dark:bg-app-bg-subtle border border-[rgba(23,21,15,0.08)] dark:border-app-line rounded-[14px] px-5 py-3">
        <span className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#A8A296]">Tiến độ</span>
        <span className="text-2xl font-extrabold text-[#17150F] dark:text-app-ink leading-none" style={{ fontFamily: "'Bricolage Grotesque', serif" }}>
          {completedCount}
          <span className="text-[15px] text-[#A8A296] font-semibold"> / {totalSteps}</span>
        </span>
      </div>
    </section>
  );
}
