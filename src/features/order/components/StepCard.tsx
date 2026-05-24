import type { ReactNode } from "react";
import { Check } from "lucide-react";

import { cn } from "@/app/components/ui/utils";

export interface StepCardProps {
  step: number;
  title: string;
  status?: "pending" | "current" | "done";
  hint?: string;
  errorText?: string;
  children: ReactNode;
  id?: string;
}

export function StepCard({
  step,
  title,
  status = "pending",
  hint,
  errorText,
  children,
  id,
}: StepCardProps) {
  return (
    <section
      id={id}
      className="rounded-[var(--r-card)] border border-[var(--order-border)] bg-[var(--order-card)] p-5 shadow-sm sm:p-6"
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
              status === "done" && "bg-[var(--order-accent)] text-white",
              status === "current" &&
                "border-2 border-[var(--order-accent)] text-[var(--order-accent)]",
              status === "pending" &&
                "bg-[var(--order-border)] text-[var(--order-text-muted)]",
            )}
          >
            {status === "done" ? <Check className="h-4 w-4" /> : step}
          </span>
          <h2 className="text-base font-semibold sm:text-lg">{title}</h2>
        </div>
        {hint && (
          <span className="text-xs text-[var(--order-text-muted)]">{hint}</span>
        )}
      </header>
      <div>{children}</div>
      {errorText && (
        <p className="mt-2 text-xs text-destructive">{errorText}</p>
      )}
    </section>
  );
}
