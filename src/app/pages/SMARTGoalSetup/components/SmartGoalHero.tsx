import { CheckCircle2, Compass, Sparkles, Target } from "lucide-react";

import { ConstellationAccent, HeroSmartGoalScene, SmartGoalIllustration } from "../../../components/illustrations";
import { MotionParallaxLayer } from "../../../components/motion";
import { Badge } from "../../../components/ui/badge";
import { PrimaryActionCard } from "../../../components/layout/PrimaryActionCard";
import { Progress } from "../../../components/ui/progress";
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
    <PrimaryActionCard
      hero
      tone="violet"
      eyebrow="Viết mục tiêu rõ"
      icon={<Compass className="h-4 w-4" />}
      eyebrowClassName="text-white/72"
      title="Biến trọng tâm thành mục tiêu rõ, đo được, đủ thực tế."
      titleAs="h1"
      description="5 câu hỏi: kết quả, chỉ số, điều kiện, lý do và mốc thời gian. Sau đó sang kiểm tra tính thực tế."
      className="surface-aurora ring-soft-glow page-enter overflow-hidden text-white glass-surface-gradient-border ambient-glow"
      titleClassName="gradient-text max-w-3xl text-3xl font-semibold leading-[1.15] tracking-tight sm:text-4xl md:text-5xl"
      descriptionClassName="max-w-2xl text-base leading-8 text-white/82 lg:text-lg"
      contentClassName="relative grid gap-[var(--space-stack)] lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start"
    >
          <MotionParallaxLayer
            depth={0.24}
            className="pointer-events-none absolute -right-16 top-0 hidden w-[520px] text-white opacity-18 lg:block"
            aria-hidden="true"
          >
            <HeroSmartGoalScene className="w-full" />
          </MotionParallaxLayer>
          <ConstellationAccent className="pointer-events-none absolute right-3 top-0 w-28 text-white opacity-35 sm:w-36" />
          <SmartGoalIllustration className="pointer-events-none absolute -right-8 bottom-2 hidden w-56 text-white opacity-25 lg:block" />
          <div className="relative z-10 stack-stack">
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline" className="rounded-[var(--r-pill)] border-white/18 bg-white/12 px-4 py-2 text-white">
                <Target className="mr-1 h-3.5 w-3.5" />
                Liên kết với: {focusAreaLabel}
              </Badge>
              <Badge variant="outline" className="rounded-[var(--r-pill)] border-white/18 bg-white/12 px-4 py-2 text-white">
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                Hoàn thành: {completedCount}/{totalSteps}
              </Badge>
            </div>
          </div>

          <div
            data-testid="smart-goal-handoff-card"
            className="relative z-10 rounded-[var(--r-control)] border border-white/18 bg-white/12 p-4 text-white shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/62">
              Góc nhìn cuộc sống đã chọn
            </p>
            <p className="mt-2 text-2xl font-bold">{focusAreaLabel}</p>
            <p className="mt-2 text-sm leading-6 text-white/78">
              Bắt đầu từ góc nhìn này, rồi biến nó thành một kết quả đo được trong {smartGoalStarter.targetWeeks} tuần.
            </p>
            <div className="mt-4 stack-tight">
              <div className="rounded-[var(--r-control)] border border-white/14 bg-black/10 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/52">Chỉ số gợi ý</p>
                <p className="mt-1 text-sm font-semibold text-white">{smartGoalStarter.metricName}</p>
              </div>
              <div className="rounded-[var(--r-control)] border border-white/14 bg-black/10 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/52">Khung thực thi</p>
                <p className="mt-1 text-sm font-semibold text-white">{smartGoalStarter.targetWeeks} tuần</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 hidden flow-panel p-5 sm:p-6">
            <div className="flex items-center justify-between text-sm text-white/72">
              <span>
                Bước {currentStep + 1} / {totalSteps}
              </span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="mt-[var(--space-inline)] h-2.5 bg-white/20" />

            <div className="mt-6 stack-tight">
              {SMART_STEPS.map((step, index) => {
                const done = getStepValidationError(step.key as SmartStepKey, smartData) === null;
                const active = index === currentStep;

                return (
                  <div
                    key={step.key}
                    className={`rounded-[var(--r-card)] border px-4 py-3 transition-colors transition-shadow duration-150 ${
                      active
                        ? "border-slate-300 bg-slate-100"
                        : done
                          ? "border-slate-200 bg-white"
                          : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-[var(--r-pill)] text-sm font-semibold ${
                          active
                            ? "hero-cta bg-white text-slate-900"
                            : done
                              ? "bg-white/18 text-white"
                              : "bg-white/8 text-white/60"
                        }`}
                      >
                        {done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{step.label}</p>
                        <p className="text-xs text-white/62">{step.title}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
    </PrimaryActionCard>
  );
}
