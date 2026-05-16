import type * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const alertVariants = cva(
  "relative w-full rounded-[var(--r-control)] border px-4 py-3.5 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-1 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground border-[color:var(--border)]",
        destructive:
          "text-[color:var(--color-danger-fg)] bg-[color:var(--color-danger-bg)] border-[color:var(--color-danger-border)] [&>svg]:text-current *:data-[slot=alert-description]:text-[color:var(--color-danger-fg)]/85",
        success:
          "text-[color:var(--color-success-fg)] bg-[color:var(--color-success-bg)] border-[color:var(--color-success-border)] [&>svg]:text-current *:data-[slot=alert-description]:text-[color:var(--color-success-fg)]/85",
        warning:
          "text-[color:var(--color-warning-fg)] bg-[color:var(--color-warning-bg)] border-[color:var(--color-warning-border)] [&>svg]:text-current *:data-[slot=alert-description]:text-[color:var(--color-warning-fg)]/85",
        info:
          "text-[color:var(--color-info-fg)] bg-[color:var(--color-info-bg)] border-[color:var(--color-info-border)] [&>svg]:text-current *:data-[slot=alert-description]:text-[color:var(--color-info-fg)]/85",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 font-semibold tracking-tight text-[14px] leading-5",
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-[13px] leading-5 [&_p]:leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
