import type * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-[var(--r-pill)] border px-3 py-1 text-[0.72rem] font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 tracking-[0.01em] [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-colors transition-transform duration-150 overflow-hidden shadow-sm hover:scale-[1.04] hover:-translate-y-px",
  {
    variants: {
      variant: {
        default:
          "border-[color-mix(in_srgb,var(--tone-shell-primary)_24%,transparent)] bg-[color-mix(in_srgb,var(--tone-shell-primary)_10%,white)] text-[color:var(--tone-shell-primary)] shadow-sm [a&]:hover:bg-[color-mix(in_srgb,var(--tone-shell-primary)_14%,white)]",
        brand:
          "border-[color-mix(in_srgb,var(--tone-shell-primary)_24%,transparent)] bg-[color-mix(in_srgb,var(--tone-shell-primary)_10%,white)] text-[color:var(--tone-shell-primary)] shadow-sm [a&]:hover:bg-[color-mix(in_srgb,var(--tone-shell-primary)_14%,white)]",
        secondary:
          "border-[color:var(--border)] bg-[color:var(--muted)] text-[color:var(--muted-foreground)] shadow-sm [a&]:hover:bg-[color:var(--muted)]",
        neutral:
          "border-[color:var(--border)] bg-[color:var(--muted)] text-[color:var(--muted-foreground)] shadow-sm [a&]:hover:bg-[color:var(--muted)]",
        destructive:
          "border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger-fg)] shadow-sm [a&]:hover:bg-[color:var(--color-danger-bg)] focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        danger:
          "border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger-fg)] shadow-sm [a&]:hover:bg-[color:var(--color-danger-bg)] focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        success:
          "border-[color:var(--color-success-border)] bg-[color:var(--color-success-bg)] text-[color:var(--color-success-fg)] shadow-sm [a&]:hover:bg-[color:var(--color-success-bg)]",
        warning:
          "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning-fg)] shadow-sm [a&]:hover:bg-[color:var(--color-warning-bg)]",
        info:
          "border-[color:var(--color-info-border)] bg-[color:var(--color-info-bg)] text-[color:var(--color-info-fg)] shadow-sm [a&]:hover:bg-[color:var(--color-info-bg)]",
        outline:
          "border-white/70 bg-white/72 text-foreground shadow-sm [a&]:hover:bg-white [a&]:hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
