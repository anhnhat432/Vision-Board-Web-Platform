import { CheckCircle2, Compass, Sparkles, Target } from "lucide-react";

import { Badge } from "../../../components/ui/badge";
import { Card, CardContent } from "../../../components/ui/card";
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
    <Card className="page-enter">
      <CardContent className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:p-8">
        <div className="stack-stack min-w-0">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <Compass className="h-3.5 w-3.5 text-[color:var(--tone-shell-secondary)]" aria-hidden="true" />
            Viết mục tiêu rõ
          </p>

          <div className="space-y-3">
            <h1 className="max-w-3xl text-3xl font-bold leading-[1.1] tracking-[-0.018em] text-foreground sm:text-4xl">
              Biến trọng tâm thành{" "}
              <span className="text-gradient-vibrant">mục tiêu rõ, đo được, đủ thực tế</span>.
            </h1>
            <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
              5 câu hỏi: kết quả, chỉ số, điều kiện, lý do và mốc thời gian. Sau đó sang kiểm tra tính thực tế.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="brand">
              <Target className="mr-1 h-3.5 w-3.5" />
              Liên kết với: {focusAreaLabel}
            </Badge>
            <Badge variant="neutral">
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              Hoàn thành: {completedCount}/{totalSteps}
            </Badge>
          </div>

          <div className="rounded-[var(--r-control)] border border-[color:var(--border)] bg-[color:var(--muted)] p-4">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>
                Bước {currentStep + 1} / {totalSteps}
              </span>
              <span className="font-semibold text-foreground">{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="mt-2 h-2" />
            <ol className="mt-3 grid gap-2 sm:grid-cols-5">
              {SMART_STEPS.map((step, index) => {
                const done = getStepValidationError(step.key as SmartStepKey, smartData) === null;
                const active = index === currentStep;

                return (
                  <li
                    key={step.key}
                    className={`flex items-center gap-2 rounded-[var(--r-control)] border px-2.5 py-2 text-xs ${
                      active
                        ? "border-[color:var(--ring)] bg-card text-foreground shadow-[var(--shadow-1)]"
                        : done
                          ? "border-[color:var(--color-success-border)] bg-[color:var(--color-success-bg)] text-[color:var(--color-success-fg)]"
                          : "border-[color:var(--border)] bg-card text-muted-foreground"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--r-pill)] text-[11px] font-bold ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : done
                            ? "bg-[color:var(--color-success-fg)] text-[color:var(--color-success-bg)]"
                            : "bg-[color:var(--muted)] text-muted-foreground"
                      }`}
                      aria-hidden="true"
                    >
                      {done ? <CheckCircle2 className="h-3 w-3" /> : index + 1}
                    </span>
                    <span className="truncate font-semibold">{step.label}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        <div
          data-testid="smart-goal-handoff-card"
          className="rounded-[var(--r-card)] border border-[color:var(--border)] bg-[color:var(--muted)] p-5"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Góc nhìn cuộc sống đã chọn
          </p>
          <p className="mt-2 text-2xl font-bold tracking-[-0.014em] text-foreground">{focusAreaLabel}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Bắt đầu từ góc nhìn này, rồi biến nó thành một kết quả đo được trong {smartGoalStarter.targetWeeks} tuần.
          </p>
          <div className="mt-4 space-y-2">
            <div className="rounded-[var(--r-control)] border border-[color:var(--border)] bg-card px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Chỉ số gợi ý
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{smartGoalStarter.metricName}</p>
            </div>
            <div className="rounded-[var(--r-control)] border border-[color:var(--border)] bg-card px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Khung thực thi
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{smartGoalStarter.targetWeeks} tuần</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
