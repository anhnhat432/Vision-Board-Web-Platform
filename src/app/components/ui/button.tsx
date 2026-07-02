import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { type ComponentProps, forwardRef } from "react";

import { cn } from "./utils";

const buttonVariants = cva(
  cn(
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--r-control)] text-sm font-semibold tracking-normal after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:h-11 after:w-full after:min-w-[44px] sm:after:hidden",
    "shrink-0 [&_svg]:shrink-0 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
    "transition-[transform,box-shadow,background-color,color,border-color,text-decoration-color] duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
    "active:duration-[150ms]",
    "outline-none focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)]",
    "disabled:pointer-events-none disabled:opacity-50",
    "motion-reduce:transition-none motion-reduce:transform-none motion-reduce:active:scale-100",
  ),
  {
    variants: {
      variant: {
        default: cn(
          "border border-transparent bg-app-accent text-white shadow-[0_8px_18px_-12px_rgba(12,94,58,0.55)]",
          "hover:bg-app-accent-hover hover:shadow-[0_10px_22px_-14px_rgba(12,94,58,0.62)]",
          "active:scale-[0.98] active:shadow-app-sm",
          "focus-visible:ring-app-accent/35",
        ),
        destructive: cn(
          "border border-transparent bg-destructive text-white shadow-[0_8px_18px_-12px_rgba(184,64,64,0.48)]",
          "hover:bg-destructive/90 hover:shadow-[0_10px_22px_-14px_rgba(184,64,64,0.58)]",
          "active:scale-[0.98] active:shadow-app-sm",
          "focus-visible:ring-destructive/35",
        ),
        outline: cn(
          "border border-app-line bg-app-surface text-app-ink shadow-none",
          "hover:border-app-accent/35 hover:bg-app-accent-soft/20",
          "active:scale-[0.98] active:bg-app-accent-soft/35",
          "focus-visible:ring-app-accent/35",
        ),
        secondary: cn(
          "border border-app-accent/10 bg-app-accent-soft text-app-accent",
          "hover:border-app-accent/20 hover:bg-app-accent-soft/80",
          "active:scale-[0.98]",
          "focus-visible:ring-app-accent/35",
        ),
        ghost: cn(
          "bg-transparent text-app-ink",
          "hover:bg-app-ink/5",
          "active:scale-[0.98] active:bg-app-ink/[0.08]",
          "focus-visible:ring-app-accent/35",
        ),
        link: cn(
          "px-0 text-app-accent underline-offset-4",
          "hover:underline hover:decoration-app-accent/60 hover:decoration-1",
          "active:text-app-accent/80",
          "focus-visible:ring-app-accent/35",
        ),
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3.5",
        sm: "h-9 gap-1.5 px-3.5 text-sm has-[>svg]:px-3",
        lg: "h-12 px-6 text-base has-[>svg]:px-5",
        icon: "size-11 sm:size-9 active:scale-[0.96]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  };

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, loading = false, disabled, children, ...props },
  ref,
) {
  const classes = cn(buttonVariants({ variant, size, className }));

  if (asChild) {
    return (
      <Slot ref={ref} data-slot="button" className={classes} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button
      ref={ref}
      data-slot="button"
      data-loading={loading || undefined}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes}
      {...props}
    >
      {loading ? (
        <>
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <Loader2 className="size-4 animate-spin" />
          </span>
          <span className="opacity-60">{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
});

export { Button, buttonVariants };
