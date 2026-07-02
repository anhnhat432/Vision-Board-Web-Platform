import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-[var(--r-control)] border px-2.5 py-0.5 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 tracking-normal leading-5 [&>svg]:pointer-events-none focus-visible:ring-2 focus-visible:ring-app-accent/30 focus-visible:outline-none transition-colors duration-150 overflow-hidden",
  {
    variants: {
      variant: {
        default: "border-transparent bg-app-accent text-white [a&]:hover:bg-app-accent",
        brand: "border-transparent bg-app-accent text-white [a&]:hover:bg-app-accent",
        secondary: "border-transparent bg-app-accent-soft text-app-accent [a&]:hover:bg-app-accent-soft",
        neutral: "border-app-line bg-app-bg text-app-ink-soft [a&]:hover:bg-app-bg",
        destructive:
          "border-[color:var(--color-danger-border,var(--app-line))] bg-[color:var(--color-danger-bg,var(--app-warm-soft))] text-[color:var(--color-danger-fg,var(--app-warm))] [a&]:hover:bg-[color:var(--color-danger-bg,var(--app-warm-soft))]",
        danger:
          "border-[color:var(--color-danger-border,var(--app-line))] bg-[color:var(--color-danger-bg,var(--app-warm-soft))] text-[color:var(--color-danger-fg,var(--app-warm))] [a&]:hover:bg-[color:var(--color-danger-bg,var(--app-warm-soft))]",
        success: "border-transparent bg-app-accent-soft text-app-accent [a&]:hover:bg-app-accent-soft",
        warning: "border-transparent bg-app-warm-soft text-app-warm [a&]:hover:bg-app-warm-soft",
        info: "border-app-line bg-app-bg text-app-ink-soft [a&]:hover:bg-app-bg",
        outline: "border-app-line bg-app-surface text-app-ink-soft [a&]:hover:bg-app-bg",
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
>(({ className, variant, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "span";

  return <Comp ref={ref} data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
});
Badge.displayName = "Badge";

export { Badge, badgeVariants };
