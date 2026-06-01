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
    <section aria-labelledby="smart-goal-setup-title" className="sr-only" data-testid="smart-goal-hero-section">
      <h1 id="smart-goal-setup-title">
        {currentStep > 0
          ? `Đang rèn luyện mục tiêu cho ${focusAreaLabel}`
          : `Viết mục tiêu SMART đầu tiên cho ${focusAreaLabel}`}
      </h1>
      <div data-testid="smart-goal-handoff-card">
        Liên kết với: {focusAreaLabel}. Chỉ số gợi ý: {smartGoalStarter.metricName}. Khung thực thi:{" "}
        {smartGoalStarter.targetWeeks} tuần.
      </div>
      <div className="sr-only-progress">
        Tiến độ: {completedCount}/{totalSteps}
      </div>
    </section>
  );
}

