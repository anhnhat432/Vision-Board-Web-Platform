import { CheckCircle2 } from "lucide-react";

import type { SmartGoalStarter } from "../../../utils/smart-goal-starters";
import { getLifeAreaLabel } from "../../../utils/storage";
import { SMART_STEPS } from "../constants";
import { getStepValidationError } from "../helpers";
import type { SMARTData, SmartStepKey } from "../types";

interface SmartGoalHeroProps {
  focusArea: string;
  smartData: SMARTData;
  currentStep: number;
  completedCount: number;
  totalSteps: number;
  progressPercentage: number;
  smartGoalStarter: SmartGoalStarter;
}

const STEP_LETTERS: Record<SmartStepKey, string> = {
  specific: "S",
  measurable: "M",
  achievable: "A",
  relevant: "R",
  timeBound: "T",
};

const STEP_NAMES: Record<SmartStepKey, string> = {
  specific: "Specific",
  measurable: "Measurable",
  achievable: "Achievable",
  relevant: "Relevant",
  timeBound: "Time-bound",
};

export function SmartGoalHero({
  focusArea,
  smartData,
  currentStep,
  completedCount,
  totalSteps,
  progressPercentage,
  smartGoalStarter,
}: SmartGoalHeroProps) {
  const focusAreaLabel = getLifeAreaLabel(focusArea);

  return (
    <section aria-labelledby="smart-goal-setup-title">
      <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-app-ink-muted">
        {focusAreaLabel} · Mục tiêu mới
      </p>
      <h1
        id="smart-goal-setup-title"
        className="mt-3 font-serif text-[30px] font-medium leading-tight tracking-[-0.02em] text-app-ink sm:text-[34px]"
      >
        Viết mục tiêu SMART đầu tiên cho {focusAreaLabel}.
      </h1>
      <p className="mt-2 max-w-2xl text-[14px] leading-6 text-app-ink-soft">
        {smartGoalStarter.specificGoalStatement}
      </p>

      <ul className="mt-5 flex flex-wrap gap-2" aria-label="Tiến độ SMART">
        {SMART_STEPS.map((step, index) => {
          const stepKey = step.key as SmartStepKey;
          const done = getStepValidationError(stepKey, smartData) === null;
          const active = index === currentStep;

          return (
            <li
              key={step.key}
              className={
                active
                  ? "inline-flex items-center gap-2 rounded-full bg-app-accent-soft px-2.5 py-1 text-[11px] font-medium text-app-accent ring-2 ring-app-accent"
                  : done
                    ? "inline-flex items-center gap-2 rounded-full bg-app-accent px-2.5 py-1 text-[11px] font-medium text-white"
                    : "inline-flex items-center gap-2 rounded-full border border-app-line bg-app-bg px-2.5 py-1 text-[11px] font-medium text-app-ink-muted"
              }
              aria-current={active ? "step" : undefined}
            >
              <span className="inline-flex h-4 min-w-4 items-center justify-center" aria-hidden="true">
                {done && !active ? <CheckCircle2 className="h-3.5 w-3.5" /> : STEP_LETTERS[stepKey]}
              </span>
              <span>{STEP_NAMES[stepKey]}</span>
            </li>
          );
        })}
      </ul>

      <p className="sr-only">
        Hoàn thành {completedCount}/{totalSteps} phần, tiến độ {Math.round(progressPercentage)}%.
      </p>
      <div data-testid="smart-goal-handoff-card" className="sr-only">
        Liên kết với: {focusAreaLabel}. Chỉ số gợi ý: {smartGoalStarter.metricName}. Khung thực thi:{" "}
        {smartGoalStarter.targetWeeks} tuần.
      </div>
    </section>
  );
}
