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

  return (
    <section
      aria-labelledby="smart-goal-setup-title"
      className="rounded-[18px] border border-app-line bg-app-surface p-5 sm:p-6 shadow-app-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      data-testid="smart-goal-hero-section"
    >
      <div className="space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-app-accent">Thiết lập mục tiêu</span>
        <h1
          id="smart-goal-setup-title"
          className="font-serif text-2xl sm:text-3xl font-medium leading-tight text-app-ink"
        >
          {currentStep > 0
            ? `Đang rèn luyện mục tiêu cho ${focusAreaLabel}`
            : `Mục tiêu SMART đầu tiên cho ${focusAreaLabel}`}
        </h1>
        <p className="text-xs text-app-ink-soft" data-testid="smart-goal-handoff-card">
          Lĩnh vực: <span className="font-semibold text-app-ink">{focusAreaLabel}</span> · Đo lường gợi ý:{" "}
          <span className="font-semibold text-app-ink">{smartGoalStarter.metricName}</span> · Lộ trình:{" "}
          <span className="font-semibold text-app-ink">{smartGoalStarter.targetWeeks} tuần</span>.
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0 bg-app-bg-subtle/80 border border-app-line rounded-2xl px-4 py-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-app-ink-muted">Tiến độ</span>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-extrabold text-app-accent">{completedCount}</span>
          <span className="text-xs text-app-ink-muted">/</span>
          <span className="text-xs font-bold text-app-ink-muted">{totalSteps}</span>
        </div>
      </div>
    </section>
  );
}
