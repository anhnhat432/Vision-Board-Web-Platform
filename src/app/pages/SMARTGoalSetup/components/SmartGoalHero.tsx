import { AnimatePresence, motion } from "motion/react";

import type { SmartGoalStarter } from "../../../utils/smart-goal-starters";
import { getLifeAreaLabel } from "../../../utils/storage";

interface SmartGoalHeroProps {
  focusArea: string;
  smartData: SMARTData;
  currentStep: number;
  completedCount: number;
  totalSteps: number;
  progressPercentage: number;
  smartGoalStarter: SmartGoalStarter;
}

// In order to avoid unused variable errors, keep the TypeScript interfaces, but only destructure the props we actually use.
import type { SMARTData } from "../types";

export function SmartGoalHero({
  focusArea,
  currentStep,
  completedCount,
  totalSteps,
  smartGoalStarter,
}: SmartGoalHeroProps) {
  const focusAreaLabel = getLifeAreaLabel(focusArea);
  const isCompact = currentStep > 0;

  return (
    <section aria-labelledby="smart-goal-setup-title" className="transition-all duration-300">
      <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-2 border-b border-app-line/40 pb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-accent">
            {focusAreaLabel} · Thiết lập mục tiêu mới
          </p>
          <motion.h1
            id="smart-goal-setup-title"
            layout="position"
            className={`mt-2 font-serif font-medium leading-tight tracking-[-0.01em] text-app-ink transition-all duration-300 ${
              isCompact ? "text-xl sm:text-2xl" : "text-3xl sm:text-4xl"
            }`}
          >
            {isCompact
              ? `Đang rèn luyện mục tiêu cho ${focusAreaLabel}`
              : `Viết mục tiêu SMART đầu tiên cho ${focusAreaLabel}`}
          </motion.h1>

          <AnimatePresence>
            {!isCompact && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-2 max-w-2xl text-sm leading-6 text-app-ink-soft overflow-hidden"
              >
                {smartGoalStarter.specificGoalStatement}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2 mt-2 md:mt-0 select-none">
          <span className="text-xs font-semibold text-app-ink-muted">Tiến độ thiết lập:</span>
          <span className="inline-flex rounded-full bg-app-accent/10 px-2.5 py-0.5 text-xs font-bold text-app-accent">
            {completedCount}/{totalSteps} phần
          </span>
        </div>
      </div>

      <div data-testid="smart-goal-handoff-card" className="sr-only">
        Liên kết với: {focusAreaLabel}. Chỉ số gợi ý: {smartGoalStarter.metricName}. Khung thực thi:{" "}
        {smartGoalStarter.targetWeeks} tuần.
      </div>
    </section>
  );
}
