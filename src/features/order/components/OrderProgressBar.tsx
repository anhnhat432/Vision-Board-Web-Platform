import { Check } from "lucide-react";

import { cn } from "@/app/components/ui/utils";

const STEPS = [
  { num: 1, label: "Khung" },
  { num: 2, label: "Theme" },
  { num: 3, label: "Sticker" },
  { num: 4, label: "Giao hàng" },
  { num: 5, label: "Ghi chú" },
] as const;

export interface OrderProgressBarProps {
  currentStep: number;
  completedSteps: number[];
  /** 0-100, percent fill for the mobile progress bar. Distinct from completedSteps which may include optional steps for status purposes. */
  progressPercent: number;
  onStepClick: (step: number) => void;
}

export function OrderProgressBar({
  currentStep,
  completedSteps,
  progressPercent,
  onStepClick,
}: OrderProgressBarProps) {
  function statusOf(num: number): "done" | "current" | "pending" {
    if (completedSteps.includes(num)) return "done";
    if (num === currentStep) return "current";
    return "pending";
  }

  const currentLabel = STEPS.find((s) => s.num === currentStep)?.label ?? "";

  return (
    <div className="sticky top-14 z-20 -mx-4 mb-6 border-b border-[var(--order-border)] bg-[var(--order-bg)]/95 px-4 py-3 backdrop-blur lg:top-0">
      <div className="mx-auto max-w-6xl">
        <div className="hidden gap-2 sm:flex">
          {STEPS.map((s) => {
            const status = statusOf(s.num);
            return (
              <button
                key={s.num}
                type="button"
                data-status={status}
                onClick={() => onStepClick(s.num)}
                className="group flex flex-1 flex-col items-start gap-1.5 text-left"
              >
                <div
                  className={cn(
                    "flex h-1.5 w-full rounded-full transition-colors",
                    status === "done" && "bg-[var(--order-accent)]",
                    status === "current" && "bg-[var(--order-accent-soft)]",
                    status === "pending" && "bg-[var(--order-border)]",
                  )}
                />
                <div className="flex items-center gap-1.5 text-xs">
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold",
                      status === "done" &&
                        "bg-[var(--order-accent)] text-white",
                      status === "current" &&
                        "border border-[var(--order-accent)] text-[var(--order-accent)]",
                      status === "pending" &&
                        "bg-[var(--order-border)] text-[var(--order-text-muted)]",
                    )}
                  >
                    {status === "done" ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      s.num
                    )}
                  </span>
                  <span
                    className={cn(
                      status === "current" &&
                        "font-medium text-[var(--order-accent)]",
                      status !== "current" && "text-[var(--order-text-muted)]",
                    )}
                  >
                    {s.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        <div className="sm:hidden">
          <div className="mb-2 text-xs font-medium text-[var(--order-text-muted)]">
            Bước {currentStep}/5 — {currentLabel}
          </div>
          <div className="flex h-1.5 overflow-hidden rounded-full bg-[var(--order-border)]">
            <div
              className="bg-[var(--order-accent)] transition-all"
              style={{
                width: `${progressPercent}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
