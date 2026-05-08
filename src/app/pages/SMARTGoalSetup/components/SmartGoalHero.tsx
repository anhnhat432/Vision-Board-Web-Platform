import { CheckCircle2, Compass, Sparkles, Target } from "lucide-react";

import { Badge } from "../../../components/ui/badge";
import { Card, CardContent } from "../../../components/ui/card";
import { Progress } from "../../../components/ui/progress";
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
}

export function SmartGoalHero({
  focusArea,
  smartData,
  currentStep,
  completedCount,
  totalSteps,
  progressPercentage,
}: SmartGoalHeroProps) {
  return (
    <Card className="hero-surface overflow-hidden border-0 text-white glass-surface-gradient-border ambient-glow">
      <CardContent className="relative p-5 sm:p-6 lg:p-7">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),_transparent_24%)] opacity-90" />

        <div className="relative max-w-4xl">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
              <Compass className="h-4 w-4" />
              Viết mục tiêu rõ
            </div>

            <div className="space-y-4">
              <h1 className="gradient-text max-w-3xl text-3xl font-bold tracking-normal lg:text-4xl">
                Biến trọng tâm thành mục tiêu rõ, đo được, đủ thực tế.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-white/82 lg:text-lg">
                5 câu hỏi: kết quả, chỉ số, điều kiện, lý do và mốc thời gian. Sau đó sang kiểm tra tính thực
                tế.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Badge variant="outline" className="rounded-full border-white/18 bg-white/12 px-4 py-2 text-white">
                <Target className="mr-1 h-3.5 w-3.5" />
                Liên kết với: {getLifeAreaLabel(focusArea)}
              </Badge>
              <Badge variant="outline" className="rounded-full border-white/18 bg-white/12 px-4 py-2 text-white">
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                Hoàn thành: {completedCount}/{totalSteps}
              </Badge>
            </div>
          </div>

          <div className="hidden flow-panel p-5 sm:p-6">
            <div className="flex items-center justify-between text-sm text-white/72">
              <span>
                Bước {currentStep + 1} / {totalSteps}
              </span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="mt-3 h-2.5 bg-white/20" />

            <div className="mt-6 space-y-3">
              {SMART_STEPS.map((step, index) => {
                const done = getStepValidationError(step.key as SmartStepKey, smartData) === null;
                const active = index === currentStep;

                return (
                  <div
                    key={step.key}
                    className={`rounded-2xl border px-4 py-3 transition-colors transition-shadow duration-150 ${
                      active
                        ? "border-slate-300 bg-slate-100"
                        : done
                          ? "border-slate-200 bg-white"
                          : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
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
        </div>
      </CardContent>
    </Card>
  );
}
