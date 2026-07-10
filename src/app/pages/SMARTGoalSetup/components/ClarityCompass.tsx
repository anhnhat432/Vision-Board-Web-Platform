import { Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/app/components/ui/utils";
import type { GoalClarityItem, SmartStepKey } from "../types";

interface ClarityCompassProps {
  clarityProgress: number;
  clarityDoneCount: number;
  totalItems: number;
  items: GoalClarityItem[];
  onJumpToStep: (stepKey: SmartStepKey) => void;
  isCompact?: boolean;
}

export function ClarityCompass({
  clarityProgress,
  clarityDoneCount,
  totalItems,
  items,
  onJumpToStep,
  isCompact = false,
}: ClarityCompassProps) {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const nextItem = items.find((item) => !item.done);

  return (
    <section
      className={cn(
        "rounded-[30px] border border-app-line bg-app-surface/90 p-4 shadow-[0_18px_60px_-52px_rgba(23,21,15,0.45)] sm:p-5",
        isCompact && "rounded-[24px] shadow-none",
      )}
      aria-label="Checklist độ rõ mục tiêu"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-extrabold text-app-ink-muted">
            Rõ đến đâu?
          </h3>
          <p className="mt-1 text-sm font-bold text-app-ink">Chỉ cần mảnh tiếp theo, không cần hoàn hảo ngay.</p>
        </div>
        <span className="rounded-full border border-app-line bg-app-bg-subtle px-2.5 py-1 text-xs font-extrabold text-app-ink-soft">
          {clarityDoneCount}/{totalItems}
        </span>
      </div>

      <div
        role="progressbar"
        aria-label="Độ rõ của mục tiêu"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clarityProgress)}
        className="mt-4 h-2 overflow-hidden rounded-full bg-app-line"
      >
        <motion.div
          className="h-full rounded-full bg-app-accent"
          initial={false}
          animate={{ width: `${clarityProgress}%` }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      {nextItem ? (
        <button
          type="button"
          onClick={() => onJumpToStep(nextItem.stepKey)}
          className="mt-4 flex w-full items-start justify-between gap-3 rounded-card border border-app-accent/15 bg-app-accent-subtle/55 p-3 text-left transition-colors hover:bg-app-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/35"
        >
          <span>
            <span className="block text-xs font-extrabold text-app-accent">Việc kế tiếp</span>
            <span className="mt-1 block text-sm font-bold text-app-ink">{nextItem.label}</span>
            <span className="mt-0.5 block text-xs leading-5 text-app-ink-soft">{nextItem.detail}</span>
          </span>
        </button>
      ) : (
        <div className="mt-4 rounded-card border border-app-accent/15 bg-app-accent-subtle/60 p-3 text-sm font-bold text-app-accent">
          Đủ rõ để chọn bước tiếp theo.
        </div>
      )}

      <ul className={cn("mt-4 grid gap-2", isCompact ? "grid-cols-1" : "grid-cols-1")}>
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onJumpToStep(item.stepKey)}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-[14px] border px-3 py-2.5 text-left text-xs font-bold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30",
                item.done
                  ? "border-app-accent/15 bg-app-accent-subtle/45 text-app-accent"
                  : "border-app-line bg-app-bg-subtle text-app-ink-muted hover:bg-app-surface hover:text-app-ink",
              )}
            >
              <span>{item.label}</span>
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                  item.done ? "border-app-accent bg-app-accent text-white" : "border-app-line bg-app-surface text-transparent",
                )}
              >
                {item.done ? <Check className="h-3 w-3" aria-hidden="true" /> : null}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}