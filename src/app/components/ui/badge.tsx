import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-[var(--r-pill)] border px-2.5 py-0.5 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 tracking-tight leading-5 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-colors duration-150 overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-[color-mix(in_srgb,var(--tone-shell-primary)_22%,transparent)] bg-[color-mix(in_srgb,var(--tone-shell-primary)_8%,transparent)] text-[color:var(--tone-shell-primary)] [a&]:hover:bg-[color-mix(in_srgb,var(--tone-shell-primary)_14%,transparent)]",
        brand:
          "border-[color-mix(in_srgb,var(--tone-shell-primary)_22%,transparent)] bg-[color-mix(in_srgb,var(--tone-shell-primary)_8%,transparent)] text-[color:var(--tone-shell-primary)] [a&]:hover:bg-[color-mix(in_srgb,var(--tone-shell-primary)_14%,transparent)]",
        secondary:
          "border-[color:var(--border)] bg-[color:var(--muted)] text-[color:var(--muted-foreground)] [a&]:hover:bg-[color:var(--muted)]",
        neutral:
          "border-[color:var(--border)] bg-[color:var(--muted)] text-[color:var(--muted-foreground)] [a&]:hover:bg-[color:var(--muted)]",
        destructive:
          "border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger-fg)] [a&]:hover:bg-[color:var(--color-danger-bg)] focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        danger:
          "border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger-fg)] [a&]:hover:bg-[color:var(--color-danger-bg)] focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        success:
          "border-[color:var(--color-success-border)] bg-[color:var(--color-success-bg)] text-[color:var(--color-success-fg)] [a&]:hover:bg-[color:var(--color-success-bg)]",
        warning:
          "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning-fg)] [a&]:hover:bg-[color:var(--color-warning-bg)]",
        info:
          "border-[color:var(--color-info-border)] bg-[color:var(--color-info-bg)] text-[color:var(--color-info-fg)] [a&]:hover:bg-[color:var(--color-info-bg)]",
        outline:
          "border-[color:var(--border)] bg-card text-foreground [a&]:hover:bg-[color:var(--muted)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Badge = React.forwardRef<
  HTMLSpanElement,
  React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }
>(({
  className,
  variant,
  asChild = false,
  ...props
}, ref) => {
  const Comp = asChild ? Slot : "span";

  return <Comp ref={ref} data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
});
Badge.displayName = "Badge";

export { Badge, badgeVariants };
