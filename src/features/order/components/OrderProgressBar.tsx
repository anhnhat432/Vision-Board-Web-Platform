import { Check } from "lucide-react";

import { cn } from "@/app/components/ui/utils";

const STEPS = [
  { num: 1, label: "Khung" },
  { num: 2, label: "Set ảnh" },
  { num: 3, label: "Sticker" },
  { num: 4, label: "Giao hàng" },
  { num: 5, label: "Ghi chú" },
] as const;

export interface OrderProgressBarProps {
  currentStep: number;
  completedSteps: number[];
  /** 0-100, percent fill for the mobile progress bar. */
  progressPercent: number;
  onStepClick: (step: number) => void;
}

export function OrderProgressBar({ currentStep, completedSteps, progressPercent, onStepClick }: OrderProgressBarProps) {
  function statusOf(num: number): "done" | "current" | "pending" {
    if (completedSteps.includes(num)) return "done";
    if (num === currentStep) return "current";
    return "pending";
  }

  const currentLabel = STEPS.find((s) => s.num === currentStep)?.label ?? "";

  return (
    <div>
      {/* Desktop stepper */}
      <div className="hidden sm:grid grid-cols-5 gap-[10px]">
        {STEPS.map((s) => {
          const status = statusOf(s.num);
          return (
            <button
              key={s.num}
              type="button"
              onClick={() => onStepClick(s.num)}
              className="text-left"
            >
              <div
                className={cn(
                  "h-[3px] rounded-full mb-[10px] transition-colors",
                  status === "done" && "bg-[var(--order-accent)]",
                  status === "current" && "bg-[var(--order-accent)]",
                  status === "pending" && "bg-[var(--order-border)]",
                )}
              />
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold font-mono",
                    status === "done" && "bg-[var(--order-accent)] text-white",
                    status === "current" && "border-[1.5px] border-[var(--order-accent)] text-[var(--order-accent)]",
                    status === "pending" && "bg-[var(--order-border)] text-[var(--order-text-muted)]",
                  )}
                >
                  {status === "done" ? <Check className="h-3 w-3" /> : s.num}
                </span>
                <span
                  className={cn(
                    "text-[12.5px] font-semibold",
                    status === "current" && "text-[var(--order-accent)]",
                    status === "done" && "text-[var(--order-text)]",
                    status === "pending" && "text-[var(--order-text-muted)]",
                  )}
                >
                  {s.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Mobile progress bar */}
      <div className="sm:hidden">
        <div className="mb-2 text-xs font-medium text-[var(--order-text-muted)]">
          Bước {currentStep}/5 — {currentLabel}
        </div>
        <div className="flex h-[3px] overflow-hidden rounded-full bg-[var(--order-border)]">
          <div
            className="bg-[var(--order-accent)] transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
