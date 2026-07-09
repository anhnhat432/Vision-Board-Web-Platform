import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/app/components/ui/utils";
import type { SmartStepDefinition, SmartStepKey } from "../types";

interface StepProgressBarProps {
  steps: SmartStepDefinition[];
  stepIndex: number;
  onJump: (index: number) => void;
}

const STEP_LETTERS: Record<SmartStepKey, string> = {
  specific: "S",
  measurable: "M",
  achievable: "A",
  relevant: "R",
  timeBound: "T",
};

export function StepProgressBar({ steps, stepIndex, onJump }: StepProgressBarProps) {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const totalSteps = steps.length;
  const progress = totalSteps > 1 ? (stepIndex / (totalSteps - 1)) * 100 : 0;

  return (
    <nav className="relative" aria-label="SMART goal progress">
      <div
        className="absolute left-[10%] right-[10%] top-[16px] z-0 h-1 overflow-hidden rounded-full bg-app-line/70"
        aria-hidden="true"
      >
        <motion.div
          className="h-full rounded-full bg-app-accent"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.6,
            ease: [0.16, 1, 0.3, 1],
          }}
        />
      </div>

      <ol
        aria-label={`Bước ${stepIndex + 1} trên ${totalSteps}`}
        className="relative z-10 grid grid-cols-5 gap-1.5"
      >
        {steps.map((smartStep, index) => {
          const isActive = index === stepIndex;
          const isDone = index < stepIndex;
          const canJump = index <= stepIndex;
          const stepLabel = canJump
            ? `Đi tới bước ${index + 1}: ${smartStep.label}`
            : `Bước ${index + 1}: ${smartStep.label} chưa khả dụng`;

          return (
            <li key={smartStep.key} aria-current={isActive ? "step" : undefined}>
              <motion.button
                type="button"
                aria-label={stepLabel}
                disabled={!canJump}
                onClick={() => onJump(index)}
                animate={
                  isActive && !shouldReduceMotion
                    ? { scale: [1, 1.04, 1] }
                    : undefined
                }
                transition={{ duration: 0.35, ease: "easeOut" }}
                className={cn(
                  "flex h-full w-full flex-col items-center gap-1 rounded-[16px] px-1 py-1.5 text-center transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 enabled:cursor-pointer enabled:hover:bg-app-bg-subtle disabled:cursor-not-allowed disabled:opacity-65 sm:px-2 sm:py-2",
                  isActive
                    ? "bg-app-accent-subtle text-app-accent"
                    : isDone
                      ? "text-app-accent"
                      : "text-app-ink-muted"
                )}
              >
                <motion.span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border text-[12px] font-extrabold transition-all duration-300",
                    isActive
                      ? "border-app-accent bg-app-surface text-app-accent ring-4 ring-app-accent/10"
                      : isDone
                        ? "border-app-accent bg-app-accent text-white"
                        : "border-app-line bg-app-surface text-app-ink-muted"
                  )}
                  animate={
                    isActive && !shouldReduceMotion
                      ? { y: [0, -2, 0] }
                      : undefined
                  }
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                >
                  {STEP_LETTERS[smartStep.key]}
                </motion.span>
                <span
                  className={cn(
                    "hidden min-h-[1.25rem] break-words text-center text-[10.5px] font-bold leading-tight sm:block",
                    isActive || isDone ? "text-app-accent" : "text-app-ink-muted"
                  )}
                >
                  {smartStep.label}
                </span>
                {isDone ? <span className="sr-only">đã hoàn thành</span> : null}
              </motion.button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
