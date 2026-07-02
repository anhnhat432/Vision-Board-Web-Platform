import { AlertCircle } from "lucide-react";
import * as React from "react";

import { cn } from "./utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(
          "file:text-app-ink placeholder:text-app-ink-muted selection:bg-app-accent selection:text-white text-app-ink border border-app-line flex h-11 w-full min-w-0 rounded-[var(--r-input)] px-3 py-2 text-base leading-6 font-normal tracking-normal bg-app-surface shadow-none transition-[color,box-shadow,border-color,background-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium md:text-sm hover:border-app-accent/40",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-app-bg/50 disabled:text-app-ink-muted disabled:opacity-100",
          "focus-visible:border-app-accent focus-visible:ring-3 focus-visible:ring-app-accent/25",
          "aria-invalid:ring-4 aria-invalid:ring-rose-500/20 dark:aria-invalid:ring-rose-900/30 aria-invalid:border-rose-500 dark:aria-invalid:border-rose-800",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

function FieldError({ id, message, className }: { id?: string; message?: string | null; className?: string }) {
  if (!message) return null;

  return (
    <p
      id={id}
      role="alert"
      className={cn(
        "mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-450",
        className,
      )}
    >
      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-500" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

export { FieldError, Input };
