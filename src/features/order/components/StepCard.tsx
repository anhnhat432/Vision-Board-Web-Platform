import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/app/components/ui/utils";

export interface StepCardProps {
  step: number;
  title: string;
  subtitle?: string;
  status?: "pending" | "current" | "done";
  hint?: string;
  errorText?: string;
  children: ReactNode;
  id?: string;
}

export function StepCard({ step, title, subtitle, status = "pending", hint, errorText, children, id }: StepCardProps) {
  return (
    <section
      id={id}
      className="rounded-[18px] border border-[var(--order-border)] bg-[var(--order-card)] p-[22px_24px]"
    >
      <header className="mb-4 flex items-center gap-[10px]">
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold font-mono",
            status === "done" && "bg-[var(--order-accent)] text-white",
            status === "current" && "border-[1.5px] border-[var(--order-accent)] text-[var(--order-accent)]",
            status === "pending" && "border-[1.5px] border-[var(--order-accent)] text-[var(--order-accent)]",
          )}
        >
          {status === "done" ? <Check className="h-3 w-3" /> : step}
        </span>
        <h2 className="text-[17px] font-bold m-0 tracking-[-0.01em]">
          {title}
          {subtitle && (
            <span className="text-[13px] font-medium text-[var(--order-text-muted)] ml-1">{subtitle}</span>
          )}
        </h2>
        {hint && <span className="text-xs text-[var(--order-text-muted)] ml-auto">{hint}</span>}
      </header>
      <div>{children}</div>
      {errorText && <p className="mt-2 text-xs text-destructive">{errorText}</p>}
    </section>
  );
}
