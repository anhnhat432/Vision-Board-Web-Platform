import type * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-3 py-1 text-[0.72rem] font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 tracking-[0.01em] [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-all overflow-hidden shadow-[0_10px_28px_-24px_rgba(15,23,42,0.28)] hover:scale-[1.04] hover:-translate-y-px",
  {
    variants: {
      variant: {
        default:
          "border-transparent gradient-brand text-white shadow-[0_14px_32px_-20px_rgba(109,40,217,0.62)] [a&]:hover:opacity-92",
        secondary:
          "border-[color-mix(in_srgb,var(--tone-shell-secondary)_22%,transparent)] bg-[color-mix(in_srgb,var(--tone-shell-secondary)_10%,rgba(255,255,255,0.72))] text-[color-mix(in_srgb,var(--tone-shell-primary)_90%,rgba(30,30,50,1))] backdrop-blur-sm [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white shadow-[0_10px_24px_-18px_rgba(212,24,61,0.55)] [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border-white/70 bg-white/72 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-xl [a&]:hover:bg-white [a&]:hover:text-accent-foreground",
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
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
